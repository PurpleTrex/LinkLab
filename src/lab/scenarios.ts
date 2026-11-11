import { AppError } from '../domain/errors.ts';
import { parseCreate } from '../domain/link.ts';
import type { Database } from '../server/database.ts';
import { LinkRepository } from '../server/repository.ts';
import { LinkService } from '../server/service.ts';
import { redirectResponse } from '../server/redirect.ts';

export const scenarioIds = [
  'collision',
  'idempotency',
  'expiration',
  'analytics',
  'destination',
] as const;
export type ScenarioId = (typeof scenarioIds)[number];
export interface LabResult {
  scenario: ScenarioId;
  passed: boolean;
  durationMs: number;
  expected: string;
  observed: string;
  assertions: number;
  isolation: string;
}
export async function runScenario(db: Database, scenario: ScenarioId): Promise<LabResult> {
  const started = performance.now();
  const run = crypto.randomUUID();
  const owner = `lab/${run}`;
  const alias = `lab-${run}`;
  let now = Date.now();
  const repository = new LinkRepository(db);
  const service = new LinkService(repository, { now: () => now });
  const input = {
    targetUrl: 'https://example.com/',
    title: 'Isolated reliability fixture',
    alias,
    expiresAt: now + 60000,
  };
  let expected = '',
    observed = '',
    assertions = 0;
  function verify(condition: boolean) {
    assertions++;
    if (!condition) throw new Error('Scenario assertion failed');
  }
  try {
    if (scenario === 'collision') {
      expected = 'One successful creation; one alias conflict; one audit event.';
      const result = await Promise.allSettled([
        service.create(owner, input, crypto.randomUUID()),
        service.create(owner, input, crypto.randomUUID()),
      ]);
      const successes = result.filter((r) => r.status === 'fulfilled').length;
      const conflicts = result.filter(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof AppError &&
          r.reason.code === 'alias_unavailable',
      ).length;
      const audit = await db
        .prepare('SELECT COUNT(*) AS n FROM audit WHERE ownerId = ?')
        .bind(owner)
        .first<{ n: number }>();
      verify(successes === 1);
      verify(conflicts === 1);
      verify(audit?.n === 1);
      observed = `${successes} created · ${conflicts} conflict · ${audit?.n} audit event`;
    } else if (scenario === 'idempotency') {
      expected = 'Concurrent retries return the same resource and create one audit event.';
      const key = crypto.randomUUID();
      const results = await Promise.all([
        service.create(owner, input, key),
        service.create(owner, input, key),
      ]);
      verify(results[0]!.link.id === results[1]!.link.id);
      verify(results.filter((r) => !r.replayed).length === 1);
      const audit = await db
        .prepare('SELECT COUNT(*) AS n FROM audit WHERE ownerId = ?')
        .bind(owner)
        .first<{ n: number }>();
      verify(audit?.n === 1);
      observed = 'Same resource · one creation · one replay';
    } else if (scenario === 'expiration') {
      expected = 'Resolve before expiry; return 410 exactly at the expiry boundary.';
      await service.create(owner, input, crypto.randomUUID());
      verify((await service.resolve(alias)).alias === alias);
      now = input.expiresAt;
      try {
        await service.resolve(alias);
        verify(false);
      } catch (error) {
        verify(error instanceof AppError && error.status === 410);
      }
      observed = 'Active before boundary · 410 at boundary';
    } else if (scenario === 'analytics') {
      expected = 'A failed analytics write leaves the redirect intact and emits a failure signal.';
      const { link } = await service.create(owner, input, crypto.randomUUID());
      const pending: Promise<unknown>[] = [];
      let failures = 0;
      const response = redirectResponse(
        link,
        'GET',
        now,
        {
          async record() {
            throw new Error('Injected isolated sink failure');
          },
        },
        {
          waitUntil(p) {
            pending.push(p);
          },
        },
        () => {
          failures++;
        },
      );
      await Promise.all(pending);
      verify(response.status === 302);
      verify(response.headers.get('Location') === input.targetUrl);
      verify(failures === 1);
      observed = '302 preserved · correct destination · failure captured';
    } else {
      expected = 'Reject executable schemes, credentials, local IPs and redirect loops.';
      for (const targetUrl of [
        'javascript:alert(1)',
        'https://user:pass@example.com',
        'https://127.0.0.1/',
        'https://linklab.example.com/s/loop',
      ]) {
        try {
          parseCreate({ targetUrl }, 'https://linklab.example.com');
          verify(false);
        } catch (error) {
          verify(error instanceof AppError && error.code === 'invalid_destination');
        }
      }
      observed = '4 unsafe destinations rejected';
    }
    return {
      scenario,
      passed: true,
      durationMs: Math.round(performance.now() - started),
      expected,
      observed,
      assertions,
      isolation:
        'Dedicated temporary fixtures; cleaned up after execution. Live links are never altered.',
    };
  } finally {
    await db.batch([
      db
        .prepare(
          'DELETE FROM daily_metrics WHERE linkId IN (SELECT id FROM links WHERE ownerId = ?)',
        )
        .bind(owner),
      db.prepare('DELETE FROM audit WHERE ownerId = ?').bind(owner),
      db.prepare('DELETE FROM links WHERE ownerId = ?').bind(owner),
    ]);
  }
}
