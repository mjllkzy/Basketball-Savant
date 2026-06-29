import { mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function findPythonCommand(): string | null {
  for (const candidate of ["python3", "python"]) {
    if (spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) return candidate;
  }
  return null;
}

const pythonCommand = findPythonCommand();
const runIfPython = pythonCommand ? it : it.skip;

describe("player contract import CLI", () => {
  it("defines normalized contract tables and production refresh import", () => {
    const migration = readFileSync("db/migrations/008_player_contracts.sql", "utf8");
    const detailMigration = readFileSync("db/migrations/009_player_contract_details.sql", "utf8");
    const script = readFileSync("scripts/import_player_contracts.py", "utf8");
    const optionScript = readFileSync("scripts/sync_player_contract_options.py", "utf8");
    const workflow = readFileSync(".github/workflows/data-refresh.yml", "utf8");
    const backup = readFileSync(".github/workflows/postgres-backup.yml", "utf8");
    const packageJson = readFileSync("package.json", "utf8");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS player_contract_sources");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS player_contracts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS player_contract_salaries");
    expect(migration).toContain("CREATE OR REPLACE VIEW current_player_contracts");
    expect(detailMigration).toContain("options_by_season");
    expect(detailMigration).toContain("needs_followup");
    expect(script).toContain("--write-postgres");
    expect(script).toContain("player_contract_salaries");
    expect(script).toContain("options_by_season");
    expect(script).toContain("guarantee_status_by_season");
    expect(optionScript).toContain("salary-pl");
    expect(optionScript).toContain("salary-tm");
    expect(packageJson).toContain("contracts:sync-options");
    expect(workflow).toContain("scripts/import_player_contracts.py --write-postgres");
    expect(backup).toContain("player_contract_salaries");
  });

  it("stores the complete raw contract source", () => {
    const payload = JSON.parse(readFileSync("data/raw/player_contracts_2025_2031.json", "utf8"));

    expect(payload.metadata.row_count).toBe(530);
    expect(payload.metadata.season_columns).toEqual([
      "2025-26",
      "2026-27",
      "2027-28",
      "2028-29",
      "2029-30",
      "2030-31",
    ]);
    expect(payload.contracts).toHaveLength(530);
    expect(payload.contracts[0]).toMatchObject({
      source_rank: 1,
      player_name: "Stephen Curry",
      team_abbreviation: "GSW",
      matched_player_slug: "stephen-curry",
    });
    expect(payload.contracts.find((row: { player_name: string; team_abbreviation: string }) => row.player_name === "Austin Reaves" && row.team_abbreviation === "LAL")).toMatchObject({
      options_by_season: {
        "2026-27": "Player Option",
      },
    });
  });

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/import_player_contracts.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("contract option sync script is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/sync_player_contract_options.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("validates local contract data without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(pythonCommand!, ["scripts/import_player_contracts.py"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe("validated");
    expect(payload.rows).toBe(530);
    expect(payload.matched_rows_against_generated_players).toBeGreaterThan(500);
  });

  runIfPython("fails clearly when a database write is requested without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(pythonCommand!, ["scripts/import_player_contracts.py", "--write-postgres"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("DATABASE_URL is required");
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("Traceback");
  });
});
