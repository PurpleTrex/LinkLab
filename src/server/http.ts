import { unavailablePage } from './error-page.ts';
import { AppError, notFound } from '../domain/errors.ts';
import {
  parseCreate,
  parseIdempotencyKey,
  publicLink,
  systemClock,
  type Clock,
} from '../domain/link.ts';
import { Analytics } from './analytics.ts';
import type { Database } from './database.ts';
import { LinkRepository } from './repository.ts';
import { LinkService } from './service.ts';
import {
  rateLimit,
  readJson,
  requireIdentity,
  requireSameOrigin,
  securityHeaders,
} from './security.ts';
import { redirectResponse, type BackgroundContext } from './redirect.ts';
import { runScenario, scenarioIds, type ScenarioId } from '../lab/scenarios.ts';

export interface ApiEnvironment {
  DB?: Database;
}
export interface Logger {
  (entry: Record<string, string | number>): void;
}
export const defaultLogger: Logger = (entry) => console.log(JSON.stringify(entry));
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers });
function allow(request: Request, methods: string[]) {
  if (!methods.includes(request.method))
    throw new AppError(405, 'method_not_allowed', 'This method is not supported.', {
      Allow: methods.join(', '),
    });
}
function integer(value: string | null, fallback: number, max: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
    throw new AppError(400, 'invalid_query', `Limit must be between 1 and ${max}.`);
  return Number(value);
}
function cursor(value: string | null): { at: number; id: string } | null {
  if (!value) return null;
  if (value.length > 200) throw new AppError(400, 'invalid_cursor', 'Invalid pagination cursor.');
  try {
    const decoded: unknown = JSON.parse(atob(value));
    if (
      !Array.isArray(decoded) ||
      decoded.length !== 2 ||
      !Number.isSafeInteger(decoded[0]) ||
      typeof decoded[1] !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(decoded[1])
    )
      throw new Error();
    return { at: decoded[0] as number, id: decoded[1] };
  } catch {
    throw new AppError(400, 'invalid_cursor', 'Invalid pagination cursor.');
  }
}
export async function handleApi(
  request: Request,
  env: ApiEnvironment,
  ctx: BackgroundContext,
  clock: Clock = systemClock,
  logger: Logger = defaultLogger,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const url = new URL(request.url);
  let status = 500;
  try {
    let response: Response;
    if (url.pathname === '/healthz') {
      allow(request, ['GET', 'HEAD']);
      response = request.method === 'HEAD' ? new Response(null) : json({ status: 'ok' });
    } else {
      if (!env.DB)
        throw new AppError(503, 'service_unavailable', 'The service is temporarily unavailable.', {
          'Retry-After': '5',
        });
      const db = env.DB;
      const repository = new LinkRepository(db);
      const service = new LinkService(repository, clock);
      const analytics = new Analytics(db);
      const redirectMatch = /^\/s\/([a-z0-9][a-z0-9-]{2,46}[a-z0-9])$/.exec(url.pathname);
      if (redirectMatch) {
        allow(request, ['GET', 'HEAD']);
        const link = await service.resolve(redirectMatch[1]!);
        if (link.ownerId.startsWith('lab/')) throw notFound();
        response = redirectResponse(link, request.method, clock.now(), analytics, ctx, () =>
          logger({ event: 'analytics.write_failed', requestId }),
        );
      } else {
        const owner = requireIdentity(request);
        if (!['GET', 'HEAD'].includes(request.method)) requireSameOrigin(request);
        await rateLimit(db, owner, 'api', 120, clock.now());
        if (url.pathname === '/api/v1/session') {
          allow(request, ['GET']);
          response = json({ authenticated: true, displayName: 'Your workspace', apiVersion: 'v1' });
        } else if (url.pathname === '/api/v1/ready') {
          allow(request, ['GET']);
          await db.prepare('SELECT id FROM links LIMIT 1').first();
          response = json({ status: 'ready', database: 'connected' });
        } else if (url.pathname === '/api/v1/links') {
          allow(request, ['GET', 'POST']);
          if (request.method === 'POST') {
            await rateLimit(db, owner, 'create', 30, clock.now());
            const key = parseIdempotencyKey(request.headers.get('Idempotency-Key'));
            const input = parseCreate(await readJson(request), url.origin, clock.now());
            const result = await service.create(owner, input, key);
            response = json(
              { link: publicLink(result.link, url.origin), replayed: result.replayed },
              result.replayed ? 200 : 201,
              {
                Location: `/api/v1/links/${result.link.id}`,
                'Idempotency-Replayed': String(result.replayed),
              },
            );
          } else {
            const limit = integer(url.searchParams.get('limit'), 20, 100);
            const rows = await repository.list(
              owner,
              cursor(url.searchParams.get('cursor')),
              limit + 1,
            );
            const visible = rows.slice(0, limit);
            const last = visible.at(-1);
            response = json({
              links: visible.map((l) => publicLink(l, url.origin)),
              nextCursor:
                rows.length > limit && last
                  ? btoa(JSON.stringify([last.createdAt, last.id]))
                  : null,
            });
          }
        } else if (url.pathname === '/api/v1/overview') {
          allow(request, ['GET']);
          response = json(await analytics.overview(owner, clock.now()));
        } else if (url.pathname === '/api/v1/lab') {
          allow(request, ['POST']);
          await rateLimit(db, owner, 'lab', 5, clock.now());
          const body = (await readJson(request)) as { scenario?: unknown } | null;
          if (
            !body ||
            typeof body !== 'object' ||
            Object.keys(body).length !== 1 ||
            !scenarioIds.includes(body.scenario as ScenarioId)
          )
            throw new AppError(
              400,
              'invalid_scenario',
              'Choose one of the documented reliability scenarios.',
            );
          response = json(await runScenario(db, body.scenario as ScenarioId));
        } else {
          const match = /^\/api\/v1\/links\/([0-9a-f-]{36})(\/analytics)?$/.exec(url.pathname);
          if (!match) throw notFound();
          allow(request, match[2] ? ['GET'] : ['GET', 'DELETE']);
          const id = match[1]!;
          const link = await repository.byId(owner, id);
          if (!link) throw notFound();
          if (request.method === 'DELETE') {
            const etag = request.headers.get('If-Match');
            if (!etag || !/^"[1-9]\d{0,8}"$/.test(etag))
              throw new AppError(
                428,
                'precondition_required',
                'Supply the link version in If-Match, for example "1".',
              );
            response = json({
              link: publicLink(
                await service.revoke(owner, id, Number(etag.slice(1, -1))),
                url.origin,
              ),
            });
          } else if (match[2])
            response = json({ series: await analytics.forLink(owner, id, clock.now()) });
          else
            response = json({ link: publicLink(link, url.origin) }, 200, {
              ETag: `"${link.version}"`,
            });
        }
      }
    }
    status = response.status;
    return securityHeaders(response, requestId);
  } catch (error) {
    const known = error instanceof AppError;
    const problem = known
      ? error
      : new AppError(503, 'service_unavailable', 'The service is temporarily unavailable.', {
          'Retry-After': '5',
        });
    status = problem.status;
    if (
      url.pathname.startsWith('/s/') &&
      request.method === 'GET' &&
      request.headers.get('Accept')?.includes('text/html')
    ) {
      const response = securityHeaders(
        new Response(unavailablePage(status, requestId), {
          status,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...problem.headers },
        }),
        requestId,
      );
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      );
      if (!known)
        logger({ event: 'request.failed', requestId, category: 'dependency_or_internal_failure' });
      return response;
    }
    if (!known)
      logger({ event: 'request.failed', requestId, category: 'dependency_or_internal_failure' });
    const response = new Response(
      request.method === 'HEAD'
        ? null
        : JSON.stringify({
            type: `urn:linklab:problem:${problem.code}`,
            title: problem.code,
            status: problem.status,
            detail: problem.message,
            requestId,
          }),
      { status, headers: { 'Content-Type': 'application/problem+json', ...problem.headers } },
    );
    return securityHeaders(response, requestId);
  } finally {
    logger({
      event: 'request.completed',
      requestId,
      method: request.method,
      route: url.pathname.startsWith('/s/') ? 'redirect' : 'management',
      status,
      durationMs: Math.round(performance.now() - started),
    });
  }
}
