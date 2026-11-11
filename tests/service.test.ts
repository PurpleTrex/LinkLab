import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { SqliteDatabase } from './sqlite.ts';
import { LinkRepository } from '../src/server/repository.ts';
import { LinkService } from '../src/server/service.ts';
import { Analytics, utcDay, DAY_MS } from '../src/server/analytics.ts';
import { rateLimit } from '../src/server/security.ts';
import { parseCreate, randomAlias } from '../src/domain/link.ts';
import { runScenario, scenarioIds } from '../src/lab/scenarios.ts';

const input = {
  targetUrl: 'https://example.com/',
  title: 'Launch',
  alias: 'launch',
  expiresAt: null,
};
const setup = () => {
  const db = new SqliteDatabase();
  let now = Date.UTC(2026, 10, 9, 12);
  const service = new LinkService(new LinkRepository(db), { now: () => now });
  return {
    db,
    service,
    setTime: (n: number) => {
      now = n;
    },
    now,
  };
};

test('twenty concurrent custom-alias requests produce one link and one audit event', async () => {
  const { db, service } = setup();
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => service.create('alice', input, crypto.randomUUID())),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      results.filter((r) => r.status === 'rejected' && r.reason.code === 'alias_unavailable')
        .length,
      19,
    );
    assert.equal((await db.prepare('SELECT count(*) n FROM links').first<{ n: number }>())?.n, 1);
    assert.equal((await db.prepare('SELECT count(*) n FROM audit').first<{ n: number }>())?.n, 1);
  } finally {
    db.close();
  }
});
test('twenty concurrent idempotent retries return one resource', async () => {
  const { db, service } = setup();
  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => service.create('alice', input, 'shared-key-00000001')),
    );
    assert.equal(new Set(results.map((r) => r.link.id)).size, 1);
    assert.equal(results.filter((r) => !r.replayed).length, 1);
    assert.equal((await db.prepare('SELECT count(*) n FROM audit').first<{ n: number }>())?.n, 1);
  } finally {
    db.close();
  }
});
test('generated aliases retry a collision and stop after five failures', async () => {
  const { db, service } = setup();
  try {
    await service.create('alice', input, crypto.randomUUID());
    let attempts = 0;
    const generator = new LinkService(service.repository, service.clock, () =>
      ++attempts === 1 ? 'launch' : 'second',
    );
    const { link } = await generator.create(
      'alice',
      { ...input, alias: undefined },
      crypto.randomUUID(),
    );
    assert.equal(link.alias, 'second');
    assert.equal(attempts, 2);
    let failures = 0;
    const failing = new LinkService(service.repository, service.clock, () => {
      failures++;
      return 'launch';
    });
    await assert.rejects(
      failing.create('alice', { ...input, alias: undefined }, crypto.randomUUID()),
      { code: 'alias_allocation_failed' },
    );
    assert.equal(failures, 5);
  } finally {
    db.close();
  }
});
test('audit failure rolls back link creation atomically', async () => {
  const { db, service } = setup();
  try {
    db.connection.exec(
      "CREATE TRIGGER refuse_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'injected audit outage'); END",
    );
    await assert.rejects(service.create('alice', input, crypto.randomUUID()));
    assert.equal((await db.prepare('SELECT count(*) n FROM links').first<{ n: number }>())?.n, 0);
  } finally {
    db.close();
  }
});
test('expiry boundary, revocation, ownership and stale version are enforced', async () => {
  const { db, service, now, setTime } = setup();
  try {
    const { link } = await service.create(
      'alice',
      { ...input, expiresAt: now + 1000 },
      crypto.randomUUID(),
    );
    setTime(now + 999);
    assert.equal((await service.resolve('launch')).id, link.id);
    setTime(now + 1000);
    await assert.rejects(service.resolve('launch'), { status: 410 });
    await assert.rejects(service.revoke('bob', link.id, 1), { status: 404 });
    await assert.rejects(service.revoke('alice', link.id, 9), { code: 'version_conflict' });
    const revoked = await service.revoke('alice', link.id, 1);
    assert.equal(revoked.version, 2);
    await service.revoke('alice', link.id, 1);
    assert.equal(
      (
        await db
          .prepare("SELECT count(*) n FROM audit WHERE action='link.revoked'")
          .first<{ n: number }>()
      )?.n,
      1,
    );
    setTime(now);
    await assert.rejects(service.resolve('launch'), { status: 410 });
  } finally {
    db.close();
  }
});
test('audit failure rolls back revocation', async () => {
  const { db, service } = setup();
  try {
    const { link } = await service.create('alice', input, crypto.randomUUID());
    db.connection.exec(
      "CREATE TRIGGER refuse_revoke BEFORE INSERT ON audit WHEN NEW.action='link.revoked' BEGIN SELECT RAISE(ABORT,'injected audit outage'); END",
    );
    await assert.rejects(service.revoke('alice', link.id, 1));
    assert.equal((await service.resolve('launch')).revokedAt, null);
  } finally {
    db.close();
  }
});
test('cursor pagination does not lose links with equal creation timestamps', async () => {
  const { db, service } = setup();
  try {
    for (let i = 0; i < 5; i++)
      await service.create('alice', { ...input, alias: `link-${i}` }, crypto.randomUUID());
    const first = await service.repository.list('alice', null, 2);
    const second = await service.repository.list(
      'alice',
      { at: first[1]!.createdAt, id: first[1]!.id },
      2,
    );
    const third = await service.repository.list(
      'alice',
      { at: second[1]!.createdAt, id: second[1]!.id },
      2,
    );
    assert.equal(new Set([...first, ...second, ...third].map((l) => l.id)).size, 5);
  } finally {
    db.close();
  }
});
test('analytics uses exactly seven UTC dates and preserves owner boundaries', async () => {
  const { db, service, now } = setup();
  try {
    const a = await service.create('alice', input, crypto.randomUUID());
    const b = await service.create('bob', { ...input, alias: 'bobs-link' }, crypto.randomUUID());
    const analytics = new Analytics(db);
    await analytics.record(a.link.id, now - 7 * DAY_MS);
    await analytics.record(a.link.id, now - 6 * DAY_MS);
    await analytics.record(a.link.id, now);
    await analytics.record(a.link.id, now);
    await analytics.record(b.link.id, now);
    const overview = await analytics.overview('alice', now);
    assert.equal(overview.series.length, 7);
    assert.equal(overview.redirects, 3);
    assert.equal(overview.window.start, utcDay(now - 6 * DAY_MS));
    assert.equal(overview.popular[0]?.count, 3);
    assert.equal(overview.totals?.total, 1);
    assert.deepEqual(await analytics.forLink('bob', a.link.id, now), []);
  } finally {
    db.close();
  }
});
test('atomic rate counter rejects excess requests and resets at minute boundary', async () => {
  const { db } = setup();
  try {
    await rateLimit(db, 'alice', 'test', 2, 60001);
    await rateLimit(db, 'alice', 'test', 2, 60002);
    await assert.rejects(rateLimit(db, 'alice', 'test', 2, 60003), { status: 429 });
    await rateLimit(db, 'alice', 'test', 2, 120000);
    await rateLimit(db, 'bob', 'test', 2, 60003);
  } finally {
    db.close();
  }
});
test('brownfield migration preserves existing rows and gives safe lifecycle defaults', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('drizzle/0000_nosy_silverclaw.sql', 'utf8'));
    db.exec(
      "INSERT INTO links VALUES ('original','alice','original','https://example.com/','Original',123,'old-key','old-hash')",
    );
    db.exec(readFileSync('drizzle/0001_sticky_marvel_zombies.sql', 'utf8'));
    const row = db.prepare('SELECT * FROM links').get();
    assert.equal(row?.alias, 'original');
    assert.equal(row?.targetUrl, 'https://example.com/');
    assert.equal(row?.expiresAt, null);
    assert.equal(row?.revokedAt, null);
    assert.equal(row?.version, 1);
  } finally {
    db.close();
  }
});
test('expiry representation rejects invalid and excessively distant values', () => {
  for (const expiresAt of [0, Number.NaN, 'tomorrow', 1000 + 366 * DAY_MS])
    assert.throws(() => parseCreate({ ...input, expiresAt }, 'https://links.example.com', 1000), {
      code: 'invalid_expiration',
    });
  assert.equal(
    parseCreate({ ...input, expiresAt: 1001 }, 'https://links.example.com', 1000).expiresAt,
    1001,
  );
});
test('random alias generator produces valid full-length values', () => {
  const values = Array.from({ length: 1000 }, randomAlias);
  assert(values.every((s) => /^[0-9a-z]{12}$/.test(s)));
  assert.equal(new Set(values).size, 1000);
});
for (const scenario of scenarioIds)
  test(`reliability lab: ${scenario} passes and cleans its fixtures`, async () => {
    const { db } = setup();
    try {
      const result = await runScenario(db, scenario);
      assert.equal(result.passed, true);
      assert(result.assertions >= 2);
      assert.equal((await db.prepare('SELECT count(*) n FROM links').first<{ n: number }>())?.n, 0);
      assert.equal((await db.prepare('SELECT count(*) n FROM audit').first<{ n: number }>())?.n, 0);
    } finally {
      db.close();
    }
  });

test('idempotent replay still succeeds after the link expires', async () => {
  const { db, service, now, setTime } = setup();
  try {
    const body = { ...input, expiresAt: now + 1000 };
    const key = crypto.randomUUID();
    const original = await service.create('alice', body, key);
    setTime(now + 2000);
    const parsed = parseCreate(body, 'https://links.example.com', now + 2000);
    assert.equal((await service.create('alice', parsed, key)).link.id, original.link.id);
    await assert.rejects(
      service.create('alice', { ...body, alias: 'new-link' }, crypto.randomUUID()),
      { code: 'invalid_expiration' },
    );
  } finally {
    db.close();
  }
});
test('v1 request fingerprints remain compatible after lifecycle migration', async () => {
  const { db, service } = setup();
  try {
    const canonical = new TextEncoder().encode(
      JSON.stringify([input.targetUrl, input.title, input.alias]),
    );
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', canonical))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await db
      .prepare(
        'INSERT INTO links (id,ownerId,alias,targetUrl,title,createdAt,creationKey,requestHash) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        'old-resource',
        'alice',
        input.alias,
        input.targetUrl,
        input.title,
        123,
        'old-key',
        hash,
      )
      .run();
    const result = await service.create('alice', input, 'old-key');
    assert.equal(result.replayed, true);
    assert.equal(result.link.id, 'old-resource');
  } finally {
    db.close();
  }
});
