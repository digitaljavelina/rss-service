/**
 * PostgreSQL adapter that mirrors the Supabase JS chainable API.
 *
 * Implements exactly the 14 operation shapes used in the codebase (see RESEARCH.md).
 * Routes all queries through pg.Pool with parameterized SQL — never string interpolation.
 *
 * Activated when DATABASE_URL is set in the environment.
 */

import { Pool, type QueryResultRow } from 'pg';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DbError {
  code: 'database_unavailable' | 'query_failed' | 'not_found' | 'conflict' | 'schema_error';
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

export interface DbResultMany<T> {
  data: T[] | null;
  error: DbError | null;
  count?: number | null;
}

// ─── Error Normalization ─────────────────────────────────────────────────────

function normalizePgError(err: unknown): DbError {
  if (err instanceof Error) {
    const pgErr = err as NodeJS.ErrnoException & { code?: string };
    if (pgErr.code === 'ECONNREFUSED' || pgErr.code === 'ETIMEDOUT') {
      return { code: 'database_unavailable', message: 'Database is not reachable' };
    }
    if (pgErr.code === '23505') {
      return { code: 'conflict', message: 'A record with this identifier already exists' };
    }
    if (pgErr.code === '42P01') {
      return { code: 'schema_error', message: 'Required database table does not exist' };
    }
  }
  return { code: 'query_failed', message: 'Database operation failed' };
}

// ─── Query Builder ───────────────────────────────────────────────────────────

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';
type UpsertOptions = { onConflict: string };
type OrderOptions = { ascending?: boolean };

/**
 * Chainable query builder that accumulates state and executes via pg.Pool.
 *
 * Terminal methods: .single(), .then() (implicit await), insert(), update(), delete(), upsert()
 * Chainable methods: .select(), .eq(), .or(), .in(), .order(), .limit()
 */
export class QueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private pool: Pool;

  // Operation state
  private _operation: Operation = 'select';
  private _selectCols: string = '*';
  private _selectOptions: { count?: string; head?: boolean } | null = null;
  private _filters: string[] = [];
  private _values: unknown[] = [];
  private _orderCol: string | null = null;
  private _orderAsc: boolean = true;
  private _limitVal: number | null = null;
  private _insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private _updateData: Record<string, unknown> | null = null;
  private _upsertData: Record<string, unknown> | null = null;
  private _upsertOptions: UpsertOptions | null = null;
  private _returning: boolean = false;
  private _singleMode: boolean = false;

  constructor(table: string, pool: Pool) {
    this.table = table;
    this.pool = pool;
  }

  // ─── Chainable Modifiers ─────────────────────────────────────────────────

  select(cols?: string, options?: { count?: string; head?: boolean }): this {
    if (cols && cols !== '*') {
      this._selectCols = cols;
    } else {
      this._selectCols = '*';
    }
    if (options) {
      this._selectOptions = options;
    }
    // If called after update(), enable RETURNING
    if (this._operation === 'update') {
      this._returning = true;
    } else {
      this._operation = 'select';
    }
    return this;
  }

  eq(column: string, value: unknown): this {
    this._values.push(value);
    this._filters.push(`${column} = $${this._values.length}`);
    return this;
  }

  /**
   * Parse Supabase OR filter string format: 'id.eq.X,slug.eq.Y'
   * Translates to: WHERE id = $1 OR slug = $2
   * Only 'eq' operator is used in the codebase.
   */
  or(expression: string): this {
    const parts = expression.split(',');
    const clauses: string[] = [];
    for (const part of parts) {
      const [col, op, ...valParts] = part.trim().split('.');
      const val = valParts.join('.');
      if (op === 'eq') {
        this._values.push(val);
        clauses.push(`${col} = $${this._values.length}`);
      } else {
        logger.warn({ op, part }, 'pg-adapter: unsupported OR operator — skipping clause');
      }
    }
    if (clauses.length > 0) {
      this._filters.push(`(${clauses.join(' OR ')})`);
    }
    return this;
  }

  /**
   * DELETE WHERE col = ANY($N)
   * PostgreSQL ANY syntax — pass array as single parameter.
   */
  in(column: string, values: unknown[]): this {
    this._values.push(values);
    this._filters.push(`${column} = ANY($${this._values.length})`);
    return this;
  }

  order(column: string, options?: OrderOptions): this {
    this._orderCol = column;
    this._orderAsc = options?.ascending !== false;
    return this;
  }

  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  single(): Promise<DbResult<T>> {
    this._singleMode = true;
    return this._executeSelect();
  }

  // ─── Terminal Mutating Operations ─────────────────────────────────────────

  insert(data: Record<string, unknown> | Record<string, unknown>[]): Promise<DbResult<null>> {
    this._operation = 'insert';
    this._insertData = data;
    return this._executeInsert();
  }

  update(data: Record<string, unknown>): QueryBuilder<T> {
    this._operation = 'update';
    this._updateData = data;
    return this;
  }

  upsert(
    data: Record<string, unknown>,
    options: UpsertOptions
  ): Promise<DbResult<null>> {
    this._operation = 'upsert';
    this._upsertData = data;
    this._upsertOptions = options;
    return this._executeUpsert();
  }

  delete(): QueryBuilder<T> {
    this._operation = 'delete';
    return this;
  }

  // ─── Thenable — makes QueryBuilder awaitable ─────────────────────────────

  then<TResult1 = DbResultMany<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResultMany<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    let promise: Promise<unknown>;

    if (this._operation === 'delete') {
      promise = this._executeDelete();
    } else if (this._operation === 'update') {
      promise = this._executeUpdate();
    } else {
      promise = this._executeSelect();
    }

    return promise.then(onfulfilled as never, onrejected as never);
  }

  // ─── SQL Builders ─────────────────────────────────────────────────────────

  private _buildWhere(): string {
    if (this._filters.length === 0) return '';
    return `WHERE ${this._filters.join(' AND ')}`;
  }

  private _buildOrder(): string {
    if (!this._orderCol) return '';
    return `ORDER BY ${this._orderCol} ${this._orderAsc ? 'ASC' : 'DESC'}`;
  }

  private _buildLimit(): string {
    if (this._limitVal === null) return '';
    return `LIMIT ${this._limitVal}`;
  }

  private _debugLog(sql: string, params: unknown[]): void {
    if (process.env.DB_DEBUG === 'true') {
      logger.debug({ sql, params }, 'pg-adapter: executing query');
    }
  }

  // ─── Execution Methods ─────────────────────────────────────────────────────

  private async _executeSelect(): Promise<DbResult<T> & { data: T | T[] | null }> {
    try {
      // Handle count-only queries: select('*', { count: 'exact', head: true })
      if (this._selectOptions?.count === 'exact' && this._selectOptions?.head === true) {
        const where = this._buildWhere();
        const sql = `SELECT COUNT(*)::int AS count FROM ${this.table} ${where}`.trim();
        this._debugLog(sql, this._values);
        const result = await this.pool.query(sql, this._values);
        return { data: null, error: null, count: result.rows[0]?.count ?? 0 };
      }

      // Build column list
      const cols = this._selectCols === '*'
        ? '*'
        : this._selectCols.split(',').map((c) => c.trim()).join(', ');

      const where = this._buildWhere();
      const orderBy = this._buildOrder();
      const limitClause = this._singleMode ? 'LIMIT 1' : this._buildLimit();

      const sql = [
        `SELECT ${cols} FROM ${this.table}`,
        where,
        orderBy,
        limitClause,
      ].filter(Boolean).join(' ');

      this._debugLog(sql, this._values);
      const result = await this.pool.query<QueryResultRow>(sql, this._values);

      if (this._singleMode) {
        if (result.rows.length === 0) {
          return { data: null, error: { code: 'not_found', message: 'Record not found' } };
        }
        return { data: result.rows[0] as unknown as T, error: null };
      }

      return { data: result.rows as unknown as T, error: null };
    } catch (err) {
      return { data: null, error: normalizePgError(err) };
    }
  }

  private async _executeInsert(): Promise<DbResult<null>> {
    try {
      const data = this._insertData;
      if (!data) return { data: null, error: { code: 'query_failed', message: 'No insert data provided' } };

      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return { data: null, error: null };

      const columns = Object.keys(rows[0]);
      const colList = columns.join(', ');

      // Build parameterized multi-row VALUES clause
      let paramIndex = 1;
      const valueClauses: string[] = [];
      const allValues: unknown[] = [];

      for (const row of rows) {
        const placeholders = columns.map(() => `$${paramIndex++}`).join(', ');
        valueClauses.push(`(${placeholders})`);
        for (const col of columns) {
          allValues.push(row[col]);
        }
      }

      const sql = `INSERT INTO ${this.table} (${colList}) VALUES ${valueClauses.join(', ')}`;
      this._debugLog(sql, allValues);
      await this.pool.query(sql, allValues);
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: normalizePgError(err) };
    }
  }

  private async _executeUpdate(): Promise<DbResult<T> & { data: T | null }> {
    try {
      const data = this._updateData;
      if (!data) return { data: null, error: { code: 'query_failed', message: 'No update data provided' } };

      const columns = Object.keys(data);
      const setClauses: string[] = [];
      const values: unknown[] = [];

      for (const col of columns) {
        values.push(data[col]);
        setClauses.push(`${col} = $${values.length}`);
      }

      // Append filter values (eq clauses were already stored in this._values with their own $N)
      // We need to re-index filter params relative to SET params
      const filterValues = this._values;
      const filterOffset = values.length;

      // Rebuild filter clauses with correct param indices
      const reindexedFilters = this._rebuildFiltersWithOffset(filterOffset);
      for (const v of filterValues) {
        values.push(v);
      }

      const where = reindexedFilters.length > 0 ? `WHERE ${reindexedFilters.join(' AND ')}` : '';
      const returning = this._returning ? 'RETURNING *' : '';

      const sql = [
        `UPDATE ${this.table}`,
        `SET ${setClauses.join(', ')}`,
        where,
        returning,
      ].filter(Boolean).join(' ');

      this._debugLog(sql, values);
      const result = await this.pool.query<QueryResultRow>(sql, values);

      if (this._returning && this._singleMode) {
        return { data: (result.rows[0] ?? null) as unknown as T, error: null };
      }
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: normalizePgError(err) };
    }
  }

  private async _executeDelete(): Promise<DbResult<null>> {
    try {
      const where = this._buildWhere();
      const sql = `DELETE FROM ${this.table} ${where}`.trim();
      this._debugLog(sql, this._values);
      await this.pool.query(sql, this._values);
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: normalizePgError(err) };
    }
  }

  private async _executeUpsert(): Promise<DbResult<null>> {
    try {
      const data = this._upsertData;
      const opts = this._upsertOptions;
      if (!data || !opts) return { data: null, error: { code: 'query_failed', message: 'No upsert data provided' } };

      const columns = Object.keys(data);
      const colList = columns.join(', ');
      const values: unknown[] = [];

      const placeholders = columns.map((col) => {
        values.push(data[col]);
        return `$${values.length}`;
      });

      // Build DO UPDATE SET — exclude the conflict column
      const conflictCol = opts.onConflict;
      const updateCols = columns.filter((c) => c !== conflictCol);
      const setClauses = updateCols.map((col) => {
        const idx = columns.indexOf(col) + 1; // reuse existing $N reference
        return `${col} = $${idx}`;
      });

      const sql = `INSERT INTO ${this.table} (${colList}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${setClauses.join(', ')}`;
      this._debugLog(sql, values);
      await this.pool.query(sql, values);
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: normalizePgError(err) };
    }
  }

  /**
   * Rebuild filter param references with an offset applied.
   * Used when UPDATE SET params are numbered before WHERE params.
   *
   * Example: if filterOffset=2 and original filter was "col = $1",
   * reindexed becomes "col = $3".
   */
  private _rebuildFiltersWithOffset(offset: number): string[] {
    // We need to re-parse the stored filter strings and shift their $N indices.
    // Filters were built as "col = $1", "col = $2", etc. starting from 1.
    // After SET params take up positions 1..offset, we shift filter $N by +offset.
    return this._filters.map((filter) =>
      filter.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + offset}`)
    );
  }
}

// ─── PgAdapter Singleton ─────────────────────────────────────────────────────

/**
 * Singleton pg Pool adapter that exposes the Supabase JS chainable API surface.
 * Created once when DATABASE_URL is first needed.
 */
export class PgAdapter {
  private static _instance: PgAdapter | null = null;
  private pool: Pool;

  private constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000,
    });

    // Pitfall 1: must handle pool error events or process crashes on idle client failures
    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle pg client');
    });
  }

  /**
   * Returns the singleton instance.
   * DATABASE_URL must be set — throws if missing.
   */
  static getInstance(): PgAdapter {
    if (!PgAdapter._instance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL is required for PgAdapter');
      }
      PgAdapter._instance = new PgAdapter(connectionString);
    }
    return PgAdapter._instance;
  }

  /**
   * Entry point for all queries — mirrors supabase.from(table)
   */
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this.pool);
  }

  /**
   * Exposes the pool for health checks and migrations (used by schema.ts).
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Graceful shutdown — drains pool before process exit.
   */
  async shutdown(): Promise<void> {
    await this.pool.end();
    PgAdapter._instance = null;
  }
}
