import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _feedbackTableInitialized: Promise<void> | undefined;
}

/**
 * Resolves the PostgreSQL connection string across standard cloud environment variables:
 * - DATABASE_URL (Railway, standard)
 * - POSTGRES_URL (Vercel, Supabase, Railway)
 * - DATABASE_PRIVATE_URL / DATABASE_PUBLIC_URL (Railway PostgreSQL)
 * - PGDATABASE_URL
 */
export function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.PGDATABASE_URL
  );
}

/**
 * Returns true if a PostgreSQL connection string is configured in the environment.
 */
export function isDbConfigured(): boolean {
  return !!getConnectionString();
}

/**
 * Returns or initializes a shared singleton PostgreSQL connection pool.
 */
export function getPool(): Pool {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Database connection string is missing. Please set DATABASE_URL in your Railway project variables."
    );
  }

  if (!global._pgPool) {
    const isProduction = process.env.NODE_ENV === "production";
    const needsSsl = connectionString.includes("sslmode=require") || isProduction;

    global._pgPool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    global._pgPool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }

  return global._pgPool;
}

/**
 * Ensures the feedback table exists in PostgreSQL.
 * Uses a cached promise to avoid repetitive DDL executions across concurrent requests.
 */
export async function ensureFeedbackTable(): Promise<void> {
  if (!global._feedbackTableInitialized) {
    global._feedbackTableInitialized = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          feedback TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    })().catch((err) => {
      global._feedbackTableInitialized = undefined;
      throw err;
    });
  }

  return global._feedbackTableInitialized;
}

/**
 * Executes a query with automatic feedback table verification.
 */
export async function queryDb<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  await ensureFeedbackTable();
  const pool = getPool();
  return pool.query<T>(text, params);
}
