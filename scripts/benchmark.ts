import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { SqliteDatabase } from '../tests/sqlite.ts';
import { LinkRepository } from '../src/server/repository.ts';
import { LinkService } from '../src/server/service.ts';

const limitArguments = process.argv.slice(2);
if (
  limitArguments.length > 1 ||
  (limitArguments[0] && !limitArguments[0].startsWith('--max-p95-ms='))
) {
  throw new Error('Supported option: --max-p95-ms=<positive value at most 10>');
}
const maxP95Ms = limitArguments[0] ? Number(limitArguments[0].slice('--max-p95-ms='.length)) : 10;
assert(
  Number.isFinite(maxP95Ms) && maxP95Ms > 0 && maxP95Ms <= 10,
  'The p95 limit must be positive and at most 10 ms.',
);
const db = new SqliteDatabase();
try {
  const service = new LinkService(new LinkRepository(db), { now: () => Date.now() });
  const created = await service.create(
    'benchmark',
    { targetUrl: 'https://example.com/', title: 'Benchmark', alias: 'bench-link', expiresAt: null },
    crypto.randomUUID(),
  );
  for (let i = 0; i < 100; i++) await service.resolve('bench-link');
  const durations: number[] = [];
  const started = performance.now();
  for (let i = 0; i < 10000; i++) {
    const t = performance.now();
    const resolved = await service.resolve('bench-link');
    assert.equal(resolved.id, created.link.id);
    assert.equal(resolved.targetUrl, 'https://example.com/');
    durations.push(performance.now() - t);
  }
  const totalMs = performance.now() - started;
  durations.sort((a, b) => a - b);
  const p95Ms = durations[9500]!;
  const maxTotalMs = 20000;
  const passed = p95Ms <= maxP95Ms && totalMs <= maxTotalMs;
  console.log(
    JSON.stringify(
      {
        scope:
          'Local in-memory SQLite service resolution only; excludes HTTP, gateway, network and hosted D1. Not a production capacity claim.',
        samples: durations.length,
        totalMs: +totalMs.toFixed(2),
        p50Ms: durations[5000],
        p95Ms,
        thresholds: { maxP95Ms, maxTotalMs },
        passed,
        p99Ms: durations[9900],
        node: process.version,
      },
      null,
      2,
    ),
  );
  assert(passed, `Local performance gate failed: p95=${p95Ms} ms; total=${totalMs} ms`);
} finally {
  db.close();
}
