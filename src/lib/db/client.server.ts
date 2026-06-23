import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/client.server.ts can only be imported on the server.");
}

export type DatabaseAvailability =
  | {
      available: true;
      reason: "configured";
      databaseUrlPresent: true;
      message: string;
    }
  | {
      available: false;
      reason: "missing_database_url";
      databaseUrlPresent: false;
      message: string;
    };

let cachedPool: Pool | null = null;
let cachedPoolUrl: string | null = null;

export function getDatabaseUrl(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  const url = env.DATABASE_URL?.trim();
  return url || undefined;
}

export function hasDatabaseUrl(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  return Boolean(getDatabaseUrl(env));
}

export function getDatabaseAvailability(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): DatabaseAvailability {
  if (!hasDatabaseUrl(env)) {
    return {
      available: false,
      reason: "missing_database_url",
      databaseUrlPresent: false,
      message: "DATABASE_URL is not configured; the app should use generated JSON data."
    };
  }

  return {
    available: true,
    reason: "configured",
    databaseUrlPresent: true,
    message: "DATABASE_URL is configured; database reads may be used by server-only adapters."
  };
}

export function getDatabasePool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!cachedPool || cachedPoolUrl !== databaseUrl) {
    cachedPool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000
    });
    cachedPoolUrl = databaseUrl;
  }

  return cachedPool;
}

export async function withDatabaseClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const pool = getDatabasePool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function queryDatabase<T extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<T> | null> {
  const pool = getDatabasePool();
  if (!pool) return null;
  return pool.query<T>(text, [...values]);
}

export async function closeDatabasePool() {
  if (!cachedPool) return;
  const pool = cachedPool;
  cachedPool = null;
  cachedPoolUrl = null;
  await pool.end();
}
