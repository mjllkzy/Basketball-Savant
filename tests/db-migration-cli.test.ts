import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Postgres migration and Railway deployment safety", () => {
  it("keeps local development usable without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(process.execPath, ["scripts/migrate-postgres.mjs"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "skipped",
      reason: "DATABASE_URL is not configured",
    });
  });

  it("forces Railway to use Node and runs migrations before deploy", () => {
    const railpack = JSON.parse(readFileSync("railpack.json", "utf8"));
    const railway = JSON.parse(readFileSync("railway.json", "utf8"));

    expect(railpack.provider).toBe("node");
    expect(railway.build.buildCommand).toBe("pnpm run build");
    expect(railway.deploy.preDeployCommand).toBe("pnpm run db:migrate");
    expect(railway.deploy.startCommand).toBe("pnpm run start");
    expect(railway.deploy.healthcheckPath).toBe("/api/health/database");
  });

  it("uses locked, checksummed migrations", () => {
    const script = readFileSync("scripts/migrate-postgres.mjs", "utf8");

    expect(script).toContain("schema_migrations");
    expect(script).toContain("pg_advisory_lock");
    expect(script).toContain("checksum");
    expect(script).toContain("ROLLBACK");
  });
});
