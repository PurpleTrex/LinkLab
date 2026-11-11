import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import type { Database, SqlResult, Statement } from '../src/server/database.ts';

export class SqliteDatabase implements Database {
  readonly connection = new DatabaseSync(':memory:');
  constructor() {
    this.connection.exec('PRAGMA foreign_keys=ON');
    for (const file of readdirSync('drizzle')
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      this.connection.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    }
  }
  prepare(sql: string): Statement {
    return new SqliteStatement(this.connection, sql);
  }
  async batch<T>(statements: Statement[]): Promise<SqlResult<T>[]> {
    this.connection.exec('BEGIN');
    try {
      const results = [];
      for (const s of statements) results.push((s as SqliteStatement).execute<T>());
      this.connection.exec('COMMIT');
      return results;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.connection.close();
  }
}
class SqliteStatement implements Statement {
  private values: (string | number | null)[] = [];
  constructor(
    private db: DatabaseSync,
    private sql: string,
  ) {}
  bind(...values: (string | number | null)[]) {
    this.values = values;
    return this;
  }
  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }
  async all<T>(): Promise<SqlResult<T>> {
    return this.execute<T>();
  }
  execute<T>(): SqlResult<T> {
    const results = this.db.prepare(this.sql).all(...this.values) as T[];
    const changes = this.db.prepare('SELECT changes() AS n').get() as { n: number };
    return { results, success: true, meta: { changes: changes.n } };
  }
  async run() {
    return this.all<Record<string, unknown>>();
  }
}
