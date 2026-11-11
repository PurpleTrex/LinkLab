import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteDatabase } from './sqlite.ts';
import { LinkRepository } from '../src/server/repository.ts';
import { LinkService } from '../src/server/service.ts';
import { parseCreate, randomAlias } from '../src/domain/link.ts';

test('greenfield: create, resolve, replay and protect owner boundaries', async () => {
  const db = new SqliteDatabase();
  try {
    const service = new LinkService(new LinkRepository(db), { now: () => 1000 });
    const input = parseCreate(
      { targetUrl: 'https://example.com/a', alias: 'launch' },
      'https://links.example.com',
    );
    const created = await service.create('alice', input, 'first-key-000000001');
    assert.equal(created.replayed, false);
    assert.equal((await service.resolve('launch')).targetUrl, input.targetUrl);
    assert.equal((await service.create('alice', input, 'first-key-000000001')).replayed, true);
    assert.equal(await service.repository.byId('bob', created.link.id), null);
    await assert.rejects(service.create('bob', input, 'another-key-000001'), {
      code: 'alias_unavailable',
    });
    await assert.rejects(
      service.create('alice', { ...input, title: 'changed' }, 'first-key-000000001'),
      { code: 'idempotency_conflict' },
    );
    assert.equal(
      (await db.prepare('SELECT count(*) AS n FROM audit').first<{ n: number }>())?.n,
      1,
    );
  } finally {
    db.close();
  }
});

test('input rejects executable schemes, credentials, IPs, local hosts, loops and unknown fields', () => {
  for (const targetUrl of [
    'javascript:alert(1)',
    'http://example.com',
    'https://u:p@example.com',
    'https://127.1',
    'https://[::1]',
    'https://intranet',
    'https://foo.local',
    'https://links.example.com/s/loop',
    'https://example.com\\x',
    'https://example.com:8443',
  ]) {
    assert.throws(() => parseCreate({ targetUrl }, 'https://links.example.com'), {
      code: 'invalid_destination',
    });
  }
  assert.throws(() =>
    parseCreate({ targetUrl: 'https://example.com', ownerId: 'bob' }, 'https://links.example.com'),
  );
  assert.throws(() =>
    parseCreate(
      { targetUrl: 'https://example.com', alias: '../admin' },
      'https://links.example.com',
    ),
  );
  assert.match(randomAlias(), /^[0-9a-z]{12}$/);
});
