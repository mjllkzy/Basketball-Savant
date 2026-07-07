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
    const dealScript = readFileSync("scripts/sync_player_contract_deals.py", "utf8");
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
    expect(dealScript).toContain("SPOTRAC_CONTRACTS_URL");
    expect(dealScript).toContain("SALARYSWISH_BASE_URL");
    expect(dealScript).toContain("SALARYSWISH_NAME_ALIASES");
    expect(dealScript).toContain("player_contract_deals_2025_2031.json");
    expect(packageJson).toContain("contracts:sync-options");
    expect(packageJson).toContain("contracts:sync-deals");
    expect(workflow).toContain("scripts/import_player_contracts.py --write-postgres");
    expect(backup).toContain("player_contract_salaries");
  });

  it("stores the complete raw contract source", () => {
    const payload = JSON.parse(readFileSync("data/raw/player_contracts_2025_2031.json", "utf8"));
    const dealPayload = JSON.parse(readFileSync("data/raw/player_contract_deals_2025_2031.json", "utf8"));

    expect(payload.metadata.row_count).toBeGreaterThanOrEqual(530);
    expect(payload.metadata.season_columns).toEqual([
      "2025-26",
      "2026-27",
      "2027-28",
      "2028-29",
      "2029-30",
      "2030-31",
    ]);
    expect(payload.contracts).toHaveLength(payload.metadata.row_count);
    expect(payload.contracts[0]).toMatchObject({
      source_rank: 1,
      player_name: "Stephen Curry",
      team_abbreviation: "GSW",
      matched_player_slug: "stephen-curry",
    });
    expect(payload.contracts.find((row: { player_name: string; team_abbreviation: string }) => row.player_name === "Austin Reaves" && row.team_abbreviation === "LAL")).toMatchObject({
      options_by_season: {
        "2029-30": "Player Option",
      },
      needs_followup: true,
    });
    expect(payload.contracts.find((row: { player_name: string; team_abbreviation: string }) => row.player_name === "Dean Wade" && row.team_abbreviation === "PHI")).toMatchObject({
      needs_followup: true,
      contract_notes: expect.stringContaining("$39 million"),
    });
    expect(dealPayload.metadata.row_count).toBe(payload.metadata.row_count);
    expect(dealPayload.metadata.with_deals).toBe(payload.metadata.row_count);
    expect(dealPayload.metadata.salaryswish_matched).toBeGreaterThan(500);
    expect(dealPayload.contracts.every((row: { deals: unknown[] }) => row.deals.length > 0)).toBe(true);
    expect(dealPayload.contracts.find((row: { player_name: string }) => row.player_name === "Austin Reaves")).toMatchObject({
      deals: expect.arrayContaining([
        expect.objectContaining({
          start_year: 2023,
          end_year: 2026,
          years: 4,
          total: 53827872,
        }),
        expect.objectContaining({
          start_year: 2026,
          end_year: 2029,
          years: 4,
          total: 185000000,
        }),
      ]),
    });
    expect(dealPayload.contracts.find((row: { player_name: string }) => row.player_name === "Nic Claxton")).toMatchObject({
      salaryswish_url: "https://www.salaryswish.com/players/nicolas-claxton",
      deals: expect.arrayContaining([
        expect.objectContaining({
          start_year: 2024,
          end_year: 2027,
          total: 100000000,
        }),
      ]),
    });
    expect(dealPayload.contracts.find((row: { player_name: string }) => row.player_name === "Ron Holland")).toMatchObject({
      salaryswish_url: "https://www.salaryswish.com/players/ron-holland-ii",
      deals: expect.arrayContaining([
        expect.objectContaining({
          start_year: 2024,
          end_year: 2027,
        }),
      ]),
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

  runIfPython("contract deal sync script is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/sync_player_contract_deals.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("official agreement sync keeps cross-team news out of the raw compact row", () => {
    const code = `
import importlib.util
import pathlib

script_path = pathlib.Path("scripts/sync_official_contract_agreements.py")
spec = importlib.util.spec_from_file_location("sync_official_contract_agreements", script_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

contracts = [
    {
        "source_rank": 999,
        "player_name": "Keon Ellis",
        "matched_player_slug": "keon-ellis",
        "matched_player_name": "Keon Ellis",
        "team_abbreviation": "SAC",
        "salaries": {"2025-26": 2301587, "2026-27": 9999999},
        "source_urls": [],
        "contract_notes": "",
        "needs_followup": False,
        "guaranteed": None,
    }
]
news = [
    {
        "title": "Reports: Keon Ellis agrees to 2-year deal with Nets",
        "summary": "NBA.com reports Keon Ellis will join Brooklyn on a two-year, $18 million guaranteed deal.",
        "reportingStatus": "Official",
        "sourceName": "NBA.com",
        "sourceUrl": "https://www.nba.com/news/keon-ellis-nets-deal",
    }
]
runtime = {
    "teams": [
        {"abbreviation": "BKN", "city": "Brooklyn", "name": "Nets", "slug": "brooklyn-nets"}
    ]
}

assert module.sync_contract_rows_from_news(contracts, news, runtime) == 1
assert contracts[0]["team_abbreviation"] == "SAC"
assert contracts[0]["source_urls"] == []
assert contracts[0]["contract_notes"] == ""
assert contracts[0]["needs_followup"] is False

deal = module.derive_deal_from_contract_row(contracts[0])
assert deal["label"] == "Reported 2-year agreement with BKN"
assert deal["source"] == "NBA.com"
assert deal["source_url"] == "https://www.nba.com/news/keon-ellis-nets-deal"
assert deal["start_year"] == 2026
assert deal["end_year"] == 2027
assert deal["years"] == 2
assert deal["total"] == 18000000
assert deal["average_annual_value"] == 9000000
assert deal["total_guaranteed"] == 18000000
assert deal["salary_by_season"] == {}
assert deal["pending"] is True
`;
    const result = spawnSync(pythonCommand!, ["-c", code], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("official agreement sync prefers headline team over matching-rights summary team", () => {
    const code = `
import importlib.util
import pathlib

script_path = pathlib.Path("scripts/sync_official_contract_agreements.py")
spec = importlib.util.spec_from_file_location("sync_official_contract_agreements", script_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

contracts = [
    {
        "source_rank": 437,
        "player_name": "Quinten Post",
        "matched_player_slug": "quinten-post",
        "matched_player_name": "Quinten Post",
        "team_abbreviation": "GSW",
        "salaries": {"2025-26": 1955377},
        "source_urls": [],
        "contract_notes": "",
        "needs_followup": False,
        "guaranteed": 1955377,
    }
]
news = [
    {
        "title": "Grizzlies sign Quinten Post to 3-year offer sheet",
        "summary": "Golden State has until Tuesday to match Memphis' three-year offer sheet for Post.",
        "reportingStatus": "Official",
        "sourceName": "NBA.com",
        "sourceUrl": "https://www.nba.com/news/quinten-post-free-agency-2026",
    }
]
runtime = {
    "teams": [
        {"abbreviation": "GSW", "city": "Golden State", "name": "Warriors", "slug": "golden-state-warriors"},
        {"abbreviation": "MEM", "city": "Memphis", "name": "Grizzlies", "slug": "memphis-grizzlies"},
    ]
}

assert module.sync_contract_rows_from_news(contracts, news, runtime) == 1
assert contracts[0]["team_abbreviation"] == "GSW"

deal = module.derive_deal_from_contract_row(contracts[0])
assert deal["label"] == "Reported 3-year offer sheet from MEM"
assert deal["source_url"] == "https://www.nba.com/news/quinten-post-free-agency-2026"
assert deal["start_year"] == 2026
assert deal["end_year"] == 2028
assert deal["pending"] is True
`;
    const result = spawnSync(pythonCommand!, ["-c", code], {
      cwd: process.cwd(),
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
    expect(payload.rows).toBeGreaterThanOrEqual(530);
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
