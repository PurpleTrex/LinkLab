import { sqliteTable, text, integer, uniqueIndex, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    ownerId: text('ownerId').notNull(),
    alias: text('alias').notNull().unique(),
    targetUrl: text('targetUrl').notNull(),
    title: text('title').notNull(),
    createdAt: integer('createdAt').notNull(),
    creationKey: text('creationKey').notNull(),
    requestHash: text('requestHash').notNull(),
    expiresAt: integer('expiresAt'),
    revokedAt: integer('revokedAt'),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('links_owner_key').on(t.ownerId, t.creationKey),
    index('links_owner_created').on(t.ownerId, t.createdAt, t.id),
    check('links_alias_length', sql`length(${t.alias}) BETWEEN 4 AND 48`),
  ],
);
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    ownerId: text('ownerId').notNull(),
    linkId: text('linkId')
      .notNull()
      .references(() => links.id),
    action: text('action').notNull(),
    occurredAt: integer('occurredAt').notNull(),
  },
  (t) => [index('audit_owner_time').on(t.ownerId, t.occurredAt)],
);
export const dailyMetrics = sqliteTable(
  'daily_metrics',
  {
    linkId: text('linkId')
      .notNull()
      .references(() => links.id),
    day: text('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [uniqueIndex('metrics_link_day').on(t.linkId, t.day), index('metrics_day').on(t.day)],
);
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    window: integer('window').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [index('rate_window').on(t.window)],
);
