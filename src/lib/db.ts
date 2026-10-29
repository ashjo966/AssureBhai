import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _feedbackTableInitialized: Promise<void> | undefined;
}

/**
 * Returns or initializes a shared singleton PostgreSQL connection pool.
 */
export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined");
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

