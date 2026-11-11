import { AppError } from './errors.ts';

export interface Link {
  id: string;
  ownerId: string;
  alias: string;
  targetUrl: string;
  title: string;
  createdAt: number;
  creationKey: string;
  requestHash: string;
  expiresAt: number | null;
  revokedAt: number | null;
  version: number;
}
export interface CreateInput {
  targetUrl: string;
  title: string;
  alias?: string;
  expiresAt: number | null;
}
export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };

export function parseCreate(value: unknown, serviceOrigin: string, now = Date.now()): CreateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'invalid_input', 'A JSON object is required.');
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((k) => !['targetUrl', 'title', 'alias', 'expiresAt'].includes(k))) {
    throw new AppError(400, 'invalid_input', 'The request includes an unsupported field.');
  }
  if (
    typeof input.targetUrl !== 'string' ||
    input.targetUrl.length > 2048 ||
    /[\u0000-\u0020\u007f\\]/u.test(input.targetUrl)
  ) {
    throw new AppError(
      400,
      'invalid_destination',
      'Enter a valid HTTPS destination of at most 2,048 characters.',
    );
  }
  let url: URL;
  try {
    url = new URL(input.targetUrl);
  } catch {
    throw new AppError(400, 'invalid_destination', 'Enter a complete HTTPS URL.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    host.includes(':') ||
    /^\d+(\.\d+){3}$/.test(host) ||
    !host.includes('.') ||
    host.length > 253 ||
    host.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    /(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(host) ||
    url.origin === serviceOrigin
  ) {
    throw new AppError(
      400,
      'invalid_destination',
      'Use a public HTTPS hostname without credentials, a custom port, or a LinkLab destination.',
    );
  }
  const title = input.title === undefined ? host : input.title;
  if (
    typeof title !== 'string' ||
    title.trim().length < 1 ||
    title.trim().length > 100 ||
    /[\u0000-\u001f\u007f]/u.test(title)
  ) {
    throw new AppError(400, 'invalid_title', 'A title must contain 1–100 printable characters.');
  }
  let alias: string | undefined;
  if (input.alias !== undefined && input.alias !== '') {
    if (
      typeof input.alias !== 'string' ||
      !/^[a-z0-9](?:[a-z0-9-]{2,46})[a-z0-9]$/.test(input.alias)
    ) {
      throw new AppError(
        400,
        'invalid_alias',
        'Use 4–48 lowercase letters, numbers, or hyphens; start and end with a letter or number.',
      );
    }
    alias = input.alias;
  }
  let expiresAt: number | null = null;
  if (input.expiresAt !== undefined && input.expiresAt !== null) {
    if (
      typeof input.expiresAt !== 'number' ||
      !Number.isSafeInteger(input.expiresAt) ||
      input.expiresAt <= 0 ||
      input.expiresAt > now + 365 * 86400000
    ) {
      throw new AppError(
        400,
        'invalid_expiration',
        'Expiration must be a future Unix timestamp in milliseconds, within one year.',
      );
    }
    expiresAt = input.expiresAt;
  }
  return { targetUrl: url.href, title: title.trim(), expiresAt, ...(alias ? { alias } : {}) };
}

export function parseIdempotencyKey(value: string | null): string {
  if (!value || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
    throw new AppError(
      400,
      'idempotency_key_required',
      'Supply an Idempotency-Key containing 16–128 letters, numbers, underscores, or hyphens.',
    );
  }
  return value;
}

export function randomAlias(): string {
  // 32 symbols, five random bits per symbol. Twelve symbols = 60 random bits.
  const symbols = '0123456789abcdefghjkmnpqrstvwxyz';
  return [...crypto.getRandomValues(new Uint8Array(12))].map((n) => symbols[n & 31]).join('');
}

export async function fingerprint(input: CreateInput): Promise<string> {
  // Preserve the v1 fingerprint for non-expiring links across the additive migration.
  const canonical = [
    input.targetUrl,
    input.title,
    input.alias ?? null,
    ...(input.expiresAt === null ? [] : [input.expiresAt]),
  ];
  const data = new TextEncoder().encode(JSON.stringify(canonical));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function publicLink(link: Link, origin: string) {
  return {
    id: link.id,
    alias: link.alias,
    title: link.title,
    targetUrl: link.targetUrl,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    version: link.version,
    shortUrl: `${origin}/s/${link.alias}`,
  };
}

export function linkState(
  link: Pick<Link, 'expiresAt' | 'revokedAt'>,
  now: number,
): 'active' | 'expired' | 'revoked' {
  if (link.revokedAt !== null) return 'revoked';
  if (link.expiresAt !== null && now >= link.expiresAt) return 'expired';
  return 'active';
}
