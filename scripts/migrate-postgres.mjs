import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const migrationDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const advisoryLockId = 1_946_207_421;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  return value || null;
}

function sslForUrl(connectionString) {
  const hostname = new URL(connectionString).hostname;
  if (hostname.endsWith(".railway.internal") || hostname === "localhost" || hostname === "127.0.0.1") {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

async function migrationFiles() {
  const entries = await fs.readdir(migrationDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function checksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function applyMigration(client, version, sql) {
  const digest = checksum(sql);
  const existing = await client.query(
    "SELECT checksum FROM schema_migrations WHERE version = $1",
    [version],
  );

  if (existing.rowCount) {
    if (existing.rows[0].checksum !== digest) {
      throw new Error(`Migration ${version} was already applied with a different checksum.`);
    }
    return "already_applied";
  }

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
      [version, digest],
    );
    await client.query("COMMIT");
    return "applied";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runMigrations(connectionString = databaseUrl()) {
  if (!connectionString) {
    return {
      status: "skipped",
      reason: "DATABASE_URL is not configured",
      applied: [],
      alreadyApplied: [],
    };
  }

  const client = new Client({
    connectionString,
    ssl: sslForUrl(connectionString),
    connectionTimeoutMillis: 10_000,
  });
  const applied = [];
  const alreadyApplied = [];

  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [advisoryLockId]);
    await ensureMigrationTable(client);
    for (const version of await migrationFiles()) {
      const sql = await fs.readFile(path.join(migrationDirectory, version), "utf8");
      const result = await applyMigration(client, version, sql);
      (result === "applied" ? applied : alreadyApplied).push(version);
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [advisoryLockId]);
    } finally {
      await client.end();
    }
  }

  return {
    status: "ok",
    applied,
    alreadyApplied,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(`Database migration failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
