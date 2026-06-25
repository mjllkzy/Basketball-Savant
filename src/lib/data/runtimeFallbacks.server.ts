import { readFile } from "node:fs/promises";
import path from "node:path";

if (typeof window !== "undefined") {
  throw new Error("src/lib/data/runtimeFallbacks.server.ts can only be imported on the server.");
}

export type RuntimePlayerFallback = {
  player_slug: string;
  player_name: string;
  team_id: string | null;
  team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  games: number | null;
  minutes: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  fg_pct: number | null;
  three_pct: number | null;
  ft_pct: number | null;
  ts_pct: number | null;
  efg_pct: number | null;
  usage_rate: number | null;
  ast_pct: number | null;
  reb_pct: number | null;
  turnover_rate: number | null;
  off_rating: number | null;
  def_rating: number | null;
  net_rating: number | null;
  pie: number | null;
};

export type RuntimeTeamFallback = {
  team_id: string;
  slug: string;
  abbreviation: string;
  city: string;
  name: string;
  conference: "East" | "West" | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  season: string;
  season_type: string;
  games: number | null;
  wins: number | null;
  losses: number | null;
  pts: number | null;
  pts_allowed: number | null;
  fgm: number | null;
  fga: number | null;
  three_pm: number | null;
  three_pa: number | null;
  ftm: number | null;
  fta: number | null;
  oreb: number | null;
  dreb: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  possessions: number | null;
  off_rating: number | null;
  def_rating: number | null;
  net_rating: number | null;
  assist_pct: number | null;
  offensive_rebound_pct: number | null;
  defensive_rebound_pct: number | null;
  rebound_pct: number | null;
  turnover_pct: number | null;
  efg_pct: number | null;
  ts_pct: number | null;
  pie: number | null;
  pace: number | null;
  three_frequency: number | null;
};

export type RuntimeFallbacks = {
  metadata: {
    generated_at: string;
    source_workbook_sha256: string;
    season: string;
    season_type: string;
    players: number;
    teams: number;
  };
  players: RuntimePlayerFallback[];
  teams: RuntimeTeamFallback[];
};

let cachedFallbacks: Promise<RuntimeFallbacks> | null = null;

export function loadRuntimeFallbacks() {
  if (!cachedFallbacks) {
    const fallbackPath = path.join(process.cwd(), "src", "lib", "data", "generated", "runtime-fallbacks.json");
    cachedFallbacks = readFile(fallbackPath, "utf8").then((contents) => JSON.parse(contents) as RuntimeFallbacks);
  }
  return cachedFallbacks;
}
