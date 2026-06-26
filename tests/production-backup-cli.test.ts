import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production Postgres backup workflow", () => {
  it("exports the production database into a verified artifact without touching Railway settings", () => {
    const workflow = readFileSync(".github/workflows/postgres-backup.yml", "utf8");

    expect(workflow).toContain("DATABASE_URL: ${{ secrets.DATABASE_PUBLIC_URL }}");
    expect(workflow).toContain("pg_dump");
    expect(workflow).toContain("--format=custom");
    expect(workflow).toContain("pg_restore --list");
    expect(workflow).toContain("shot_attempts");
    expect(workflow).toContain("actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02");
    expect(workflow).toContain("retention-days: 14");
    expect(workflow).not.toContain("railway ");
    expect(workflow).not.toContain("railway.");
  });

  it("documents the backup/export workflow and restore safety limits", () => {
    const docs = readFileSync("docs/production-data-refresh.md", "utf8");

    expect(docs).toContain(".github/workflows/postgres-backup.yml");
    expect(docs).toContain("pg_restore --list");
    expect(docs).toContain("retention-days: 14");
    expect(docs).toContain("disposable database");
  });
});
