import type { Database } from './database.ts';

export const DAY_MS = 86_400_000;
export function utcDay(at: number) {
  return new Date(at).toISOString().slice(0, 10);
}
export interface DailyCount {
  day: string;
  count: number;
}
export class Analytics {
  constructor(private db: Database) {}
  async record(linkId: string, at: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO daily_metrics (linkId,day,count) VALUES (?,?,1)
      ON CONFLICT(linkId,day) DO UPDATE SET count = count + 1`,
      )
      .bind(linkId, utcDay(at))
      .run();
  }
  async overview(owner: string, now: number) {
    const start = utcDay(now - 6 * DAY_MS);
    const end = utcDay(now);
    const [totals, daily, popular, audit] = await Promise.all([
      this.db
        .prepare(
          `SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > ?) THEN 1 ELSE 0 END),0) AS active,
        COALESCE(SUM(CASE WHEN revokedAt IS NOT NULL THEN 1 ELSE 0 END),0) AS revoked,
        COALESCE(SUM(CASE WHEN revokedAt IS NULL AND expiresAt <= ? THEN 1 ELSE 0 END),0) AS expired
        FROM links WHERE ownerId = ?`,
        )
        .bind(now, now, owner)
        .first<{ total: number; active: number; revoked: number; expired: number }>(),
      this.db
        .prepare(
          `SELECT m.day,SUM(m.count) AS count FROM daily_metrics m JOIN links l ON l.id = m.linkId
        WHERE l.ownerId = ? AND m.day BETWEEN ? AND ? GROUP BY m.day ORDER BY m.day`,
        )
        .bind(owner, start, end)
        .all<DailyCount>(),
      this.db
        .prepare(
          `SELECT l.id,l.alias,l.title,COALESCE(SUM(m.count),0) AS count FROM links l
        LEFT JOIN daily_metrics m ON m.linkId = l.id AND m.day BETWEEN ? AND ? WHERE l.ownerId = ?
        GROUP BY l.id ORDER BY count DESC,l.createdAt DESC,l.id DESC LIMIT 5`,
        )
        .bind(start, end, owner)
        .all<{ id: string; alias: string; title: string; count: number }>(),
      this.db
        .prepare(
          'SELECT id,linkId,action,occurredAt FROM audit WHERE ownerId = ? ORDER BY occurredAt DESC,id DESC LIMIT 10',
        )
        .bind(owner)
        .all<{ id: string; linkId: string; action: string; occurredAt: number }>(),
    ]);
    const series = Array.from({ length: 7 }, (_, i) => {
      const day = utcDay(now - (6 - i) * DAY_MS);
      return { day, count: daily.results.find((d) => d.day === day)?.count ?? 0 };
    });
    return {
      totals,
      series,
      redirects: series.reduce((n, d) => n + d.count, 0),
      popular: popular.results,
      audit: audit.results,
      window: {
        start,
        end,
        timezone: 'UTC',
        definition: 'Today and the preceding six UTC calendar days',
      },
      semantics:
        'Recorded GET redirects, including bots and repeat requests. Not unique people or confirmed destination visits. Best-effort recording can undercount.',
    };
  }
  async forLink(owner: string, id: string, now: number) {
    return (
      await this.db
        .prepare(
          `SELECT m.day,m.count FROM daily_metrics m JOIN links l ON l.id = m.linkId
      WHERE l.ownerId = ? AND l.id = ? AND m.day BETWEEN ? AND ? ORDER BY m.day`,
        )
        .bind(owner, id, utcDay(now - 6 * DAY_MS), utcDay(now))
        .all<DailyCount>()
    ).results;
  }
}
