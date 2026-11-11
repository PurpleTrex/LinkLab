import { AppError } from '../domain/errors.ts';
import type { Database } from './database.ts';

export function requireIdentity(request: Request): string {
  // Only valid behind the Sites dispatch boundary, which supplies trusted identity.
  // Never expose this Worker directly on a public workers.dev origin.
  const id = request.headers.get('oai-authenticated-user-id');
  if (!id || id.length > 256)
    throw new AppError(401, 'authentication_required', 'Sign in to manage your links.');
  return id;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  if (
    origin !== new URL(request.url).origin ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    throw new AppError(403, 'origin_rejected', 'A same-origin request is required.');
  }
}
export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  ) {
    throw new AppError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'invalid_json', 'A JSON body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new AppError(413, 'payload_too_large', 'The request body exceeds 8 KiB.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      throw new AppError(400, 'invalid_json', 'The body must contain valid UTF-8 JSON.');
    }
  } finally {
    reader.releaseLock();
  }
}
export async function rateLimit(
  db: Database,
  owner: string,
  bucket: string,
  limit: number,
  now: number,
) {
  const window = Math.floor(now / 60000);
  const result = await db
    .prepare(
      `INSERT INTO rate_limits (key,window,count) VALUES (?,?,1)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END,
      window = excluded.window RETURNING count`,
    )
    .bind(`${bucket}:${owner}`, window)
    .first<{ count: number }>();
  if (!result || result.count > limit)
    throw new AppError(429, 'rate_limited', 'Too many requests. Please wait before trying again.', {
      'Retry-After': String(60 - (Math.floor(now / 1000) % 60)),
    });
}
export function securityHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', requestId);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
