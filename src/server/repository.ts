import type { Link } from '../domain/link.ts';
import type { Database } from './database.ts';

export class LinkRepository {
  constructor(readonly db: Database) {}

  async byKey(owner: string, key: string): Promise<Link | null> {
    return this.db
      .prepare('SELECT * FROM links WHERE ownerId = ? AND creationKey = ?')
      .bind(owner, key)
      .first<Link>();
  }

  async insert(link: Link): Promise<Link | null> {
    const results = await this.db.batch<Link>([
      this.db
        .prepare(
          `INSERT INTO links (id,ownerId,alias,targetUrl,title,createdAt,creationKey,requestHash,expiresAt,revokedAt,version)
        VALUES (?,?,?,?,?,?,?,?,?,NULL,1) ON CONFLICT DO NOTHING RETURNING *`,
        )
        .bind(
          link.id,
          link.ownerId,
          link.alias,
          link.targetUrl,
          link.title,
          link.createdAt,
          link.creationKey,
          link.requestHash,
          link.expiresAt,
        ),
      this.db
        .prepare(
          `INSERT INTO audit (id,ownerId,linkId,action,occurredAt)
        SELECT ?,ownerId,id,'link.created',? FROM links WHERE id = ?`,
        )
        .bind(crypto.randomUUID(), link.createdAt, link.id),
    ]);
    return results[0]?.results[0] ?? null;
  }

  byAlias(alias: string) {
    return this.db.prepare('SELECT * FROM links WHERE alias = ?').bind(alias).first<Link>();
  }
  byId(owner: string, id: string) {
    return this.db
      .prepare('SELECT * FROM links WHERE id = ? AND ownerId = ?')
      .bind(id, owner)
      .first<Link>();
  }
  async list(owner: string, before: { at: number; id: string } | null, limit: number) {
    return (
      await this.db
        .prepare(
          `SELECT * FROM links WHERE ownerId = ? AND
      (? IS NULL OR createdAt < ? OR (createdAt = ? AND id < ?))
      ORDER BY createdAt DESC,id DESC LIMIT ?`,
        )
        .bind(
          owner,
          before?.at ?? null,
          before?.at ?? null,
          before?.at ?? null,
          before?.id ?? null,
          limit,
        )
        .all<Link>()
    ).results;
  }
  async revoke(owner: string, id: string, version: number, now: number) {
    const result = await this.db.batch<Link>([
      this.db
        .prepare(
          'UPDATE links SET revokedAt = ?,version = version + 1 WHERE id = ? AND ownerId = ? AND version = ? AND revokedAt IS NULL RETURNING *',
        )
        .bind(now, id, owner, version),
      this.db
        .prepare(
          `INSERT INTO audit (id,ownerId,linkId,action,occurredAt)
        SELECT ?,ownerId,id,'link.revoked',? FROM links WHERE id = ? AND ownerId = ? AND version = ? AND revokedAt IS NOT NULL
        ON CONFLICT DO NOTHING`,
        )
        .bind(`revoke:${id}`, now, id, owner, version + 1),
    ]);
    return result[0]?.results[0] ?? null;
  }
}
