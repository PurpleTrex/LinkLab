/** Narrow, portable contract; implemented by D1 and the real SQLite test adapter. */
export interface SqlResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes?: number };
}
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<SqlResult<T>>;
  run(): Promise<SqlResult>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch<T = Record<string, unknown>>(statements: Statement[]): Promise<SqlResult<T>[]>;
}
