import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteDatabase } from './sqlite.ts';
import { handleApi } from '../src/server/http.ts';
import type { LinkView, LinkPage, Overview } from '../src/domain/contracts.ts';
import { redirectResponse } from '../src/server/redirect.ts';
import { readJson } from '../src/server/security.ts';

const origin = 'https://links.example.com';
function fixture() {
  const db = new SqliteDatabase();
  const pending: Promise<unknown>[] = [];
  const logs: Record<string, string | number>[] = [];
  const context = {
    waitUntil(p: Promise<unknown>) {
      pending.push(p);
    },
  };
  const request = (path: string, init: RequestInit = {}, owner: string | null = 'alice') =>
    handleApi(
      new Request(`${origin}${path}`, {
        ...init,
        headers: {
          ...(owner ? { 'oai-authenticated-user-id': owner } : {}),
          Origin: origin,
          ...init.headers,
        },
      }),
      { DB: db },
      context,
      { now: () => Date.UTC(2026, 10, 9) },
      (entry) => logs.push(entry),
    );
  const create = (
    body: Record<string, unknown> = { targetUrl: 'https://example.com/', alias: 'launch' },
  ) =>
    request('/api/v1/links', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    });
  return { db, pending, logs, request, create };
}
test('HTTP lifecycle creates, redirects, counts GET, ignores HEAD, revokes and returns 410', async () => {
  const f = fixture();
  try {
    const created = await f.create();
    assert.equal(created.status, 201);
    const { link } = (await created.json()) as { link: LinkView };
    assert.equal(created.headers.get('Location'), `/api/v1/links/${link.id}`);
    const redirect = await f.request('/s/launch', {}, null);
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('Location'), 'https://example.com/');
    assert.equal(redirect.headers.get('Cache-Control'), 'no-store');
    assert.equal((await f.request('/s/launch', { method: 'HEAD' }, null)).status, 302);
    await Promise.all(f.pending);
    const overview = (await (await f.request('/api/v1/overview')).json()) as Overview;
    assert.equal(overview.redirects, 1);
    assert.equal((await f.request(`/api/v1/links/${link.id}`)).headers.get('ETag'), '"1"');
    assert.equal((await f.request(`/api/v1/links/${link.id}`, { method: 'DELETE' })).status, 428);
    assert.equal(
      (
        await f.request(`/api/v1/links/${link.id}`, {
          method: 'DELETE',
          headers: { 'If-Match': '"1"' },
        })
      ).status,
      200,
    );
    assert.equal((await f.request('/s/launch', {}, null)).status, 410);
  } finally {
    f.db.close();
  }
});
test('management endpoints reject missing identity, cross-origin writes and non-owner access', async () => {
  const f = fixture();
  try {
    assert.equal((await f.request('/api/v1/links', {}, null)).status, 401);
    assert.equal(
      (
        await f.request('/api/v1/links', {
          method: 'POST',
          headers: { Origin: 'https://evil.example.com' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request('/api/v1/links', {
          method: 'POST',
          headers: { 'Sec-Fetch-Site': 'cross-site' },
        })
      ).status,
      403,
    );
    const { link } = (await (await f.create()).json()) as { link: LinkView };
    for (const suffix of ['', '/analytics'])
      assert.equal((await f.request(`/api/v1/links/${link.id}${suffix}`, {}, 'bob')).status, 404);
    assert.equal(
      (
        await f.request(
          `/api/v1/links/${link.id}`,
          { method: 'DELETE', headers: { 'If-Match': '"1"' } },
          'bob',
        )
      ).status,
      404,
    );
    const page = (await (await f.request('/api/v1/links', {}, 'bob')).json()) as LinkPage;
    assert.equal(page.links.length, 0);
  } finally {
    f.db.close();
  }
});
test('HTTP rejects unsupported methods, malformed JSON, oversized body, unknown fields and invalid keys', async () => {
  const f = fixture();
  try {
    assert.equal((await f.request('/api/v1/links', { method: 'PATCH' })).status, 405);
    const key = { 'Idempotency-Key': crypto.randomUUID() };
    assert.equal(
      (await f.request('/api/v1/links', { method: 'POST', body: '{}', headers: key })).status,
      415,
    );
    assert.equal(
      (
        await f.request('/api/v1/links', {
          method: 'POST',
          body: '{',
          headers: { ...key, 'Content-Type': 'application/json' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.request('/api/v1/links', {
          method: 'POST',
          body: ' '.repeat(9000),
          headers: { ...key, 'Content-Type': 'application/json' },
        })
      ).status,
      413,
    );
    assert.equal(
      (await f.create({ targetUrl: 'https://example.com', ownerId: 'bob' })).status,
      400,
    );
    assert.equal(
      (
        await f.request('/api/v1/links', {
          method: 'POST',
          body: '{}',
          headers: { 'Content-Type': 'application/json' },
        })
      ).status,
      400,
    );
    assert.equal((await f.request('/api/v1/links?limit=101')).status, 400);
    assert.equal((await f.request('/api/v1/links?cursor=invalid')).status, 400);
    assert.equal((await f.request('/s/launch', { method: 'POST' })).status, 405);
  } finally {
    f.db.close();
  }
});
test('safe problem responses and logs do not leak destination query strings or stack traces', async () => {
  const f = fixture();
  try {
    await f.create({ targetUrl: 'https://example.com/?private=secret-value', alias: 'launch' });
    const response = await f.request('/api/v1/nope');
    const problem = (await response.json()) as Record<string, unknown>;
    assert.equal(response.headers.get('Content-Type'), 'application/problem+json');
    assert.equal(response.status, 404);
    assert.equal(problem.stack, undefined);
    assert.equal(problem.requestId, response.headers.get('X-Request-ID'));
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert(response.headers.get('Strict-Transport-Security'));
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert(!JSON.stringify(f.logs).includes('secret-value'));
    assert(!JSON.stringify(f.logs).includes('alice'));
  } finally {
    f.db.close();
  }
});
test('database failures fail closed with a generic 503', async () => {
  const f = fixture();
  f.db.close();
  const response = await f.request('/api/v1/links');
  assert.equal(response.status, 503);
  assert(!(await response.text()).includes('database is not open'));
});
test('liveness remains available without database while readiness fails', async () => {
  const ctx = { waitUntil() {} };
  const live = await handleApi(new Request(`${origin}/healthz`), {}, ctx, undefined, () => {});
  const ready = await handleApi(
    new Request(`${origin}/api/v1/ready`),
    {},
    ctx,
    undefined,
    () => {},
  );
  assert.equal(live.status, 200);
  assert.equal(ready.status, 503);
});
test('head errors contain no body', async () => {
  const f = fixture();
  try {
    const result = await f.request('/s/missing', { method: 'HEAD' }, null);
    assert.equal(result.status, 404);
    assert.equal(await result.text(), '');
  } finally {
    f.db.close();
  }
});
test('idempotency response headers distinguish creation, replay and changed payload', async () => {
  const f = fixture();
  try {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() };
    const init = {
      method: 'POST',
      body: JSON.stringify({ targetUrl: 'https://example.com' }),
      headers,
    };
    assert.equal((await f.request('/api/v1/links', init)).status, 201);
    const replay = await f.request('/api/v1/links', init);
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get('Idempotency-Replayed'), 'true');
    assert.equal(
      (
        await f.request('/api/v1/links', {
          ...init,
          body: JSON.stringify({ targetUrl: 'https://example.org' }),
        })
      ).status,
      409,
    );
  } finally {
    f.db.close();
  }
});
test('analytics failure cannot replace redirect response; HEAD never calls sink', async () => {
  const f = fixture();
  try {
    const { link } = (await (await f.create()).json()) as { link: LinkView };
    const full = { ...link, ownerId: 'alice', creationKey: 'key', requestHash: 'hash' };
    let failures = 0,
      attempts = 0;
    const pending: Promise<unknown>[] = [];
    const sink = {
      async record() {
        attempts++;
        throw new Error('failure');
      },
    };
    const ctx = {
      waitUntil(p: Promise<unknown>) {
        pending.push(p);
      },
    };
    const response = redirectResponse(full, 'GET', 0, sink, ctx, () => {
      failures++;
    });
    redirectResponse(full, 'HEAD', 0, sink, ctx, () => {
      failures++;
    });
    assert.equal(response.status, 302);
    await Promise.all(pending);
    assert.equal(attempts, 1);
    assert.equal(failures, 1);
  } finally {
    f.db.close();
  }
});
test('body size is bounded even without Content-Length', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(5000));
      controller.enqueue(new Uint8Array(5000));
      controller.close();
    },
  });
  const req = new Request(origin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: stream,
    duplex: 'half',
  } as RequestInit);
  await assert.rejects(readJson(req), { status: 413 });
});
test('SQL-like input stays data and cannot alter schema', async () => {
  const f = fixture();
  try {
    const title = "'; DROP TABLE links; --";
    const response = await f.create({ targetUrl: 'https://example.com/', title });
    assert.equal(response.status, 201);
    const page = (await (await f.request('/api/v1/links')).json()) as LinkPage;
    assert.equal(page.links[0]?.title, title);
  } finally {
    f.db.close();
  }
});

test('browser navigation receives a safe, human-readable unavailable page', async () => {
  const f = fixture();
  try {
    const response = await f.request('/s/missing', { headers: { Accept: 'text/html' } }, null);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/);
    const html = await response.text();
    assert(html.includes('Link not found'));
    assert(!html.includes('script>'));
    assert(response.headers.get('Content-Security-Policy')?.includes("default-src 'none'"));
  } finally {
    f.db.close();
  }
});
