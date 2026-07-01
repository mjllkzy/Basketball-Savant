import { describe, expect, it } from "vitest";
import { buildUpcomingRosterRows, currentTeamOverrideForPlayerSlug } from "@/lib/data/currentRoster";
import type { RuntimePlayerFallback, RuntimeTeamFallback } from "@/lib/data/runtimeFallbacks.server";

const playerBase = {
  position: "PG",
  height: "6-2",
  weight: 195,
  age: 24,
  games: 38,
  games_started: 12,
  minutes: 18.4,
  pts: 8.9,
  reb: 3.3,
  ast: 2.7,
  stl: 0.9,
  blk: 0.2,
  tov: 1.4,
  fg_pct: 0.414,
  three_pct: 0.263,
  ft_pct: 0.713,
  ts_pct: 0.508,
  efg_pct: 0.466,
  usage_rate: 0.226,
  ast_pct: 0.209,
  reb_pct: 0.088,
  turnover_rate: 0.111,
  off_rating: 111,
  def_rating: 118.3,
  net_rating: -7.3,
  pie: 0.094,
} satisfies Omit<RuntimePlayerFallback, "player_slug" | "player_name" | "team_id" | "team_abbreviation">;

const teamBase = {
  city: "Atlanta",
  name: "Hawks",
  conference: "East",
  division: "Southeast",
  primary_color: "#E03A3E",
  secondary_color: "#C1D32F",
  season: "2025-26",
  season_type: "Regular Season",
  games: 0,
  wins: 0,
  losses: 0,
  pts: 0,
  pts_allowed: 0,
  fgm: 0,
  fga: 0,
  three_pm: 0,
  three_pa: 0,
  ftm: 0,
  fta: 0,
  oreb: 0,
  dreb: 0,
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  tov: 0,
  possessions: 0,
  off_rating: null,
  def_rating: null,
  net_rating: null,
  assist_pct: null,
  offensive_rebound_pct: null,
  defensive_rebound_pct: null,
  rebound_pct: null,
  turnover_pct: null,
  efg_pct: null,
  ts_pct: null,
  pie: null,
  pace: null,
  three_frequency: null,
} satisfies Omit<RuntimeTeamFallback, "team_id" | "slug" | "abbreviation">;

describe("current roster overlay", () => {
  it("records Devin Carter's official 2026-27 team without rewriting his 2025-26 Kings stats", () => {
    const historicalCarter: RuntimePlayerFallback = {
      ...playerBase,
      player_slug: "devin-carter",
      player_name: "Devin Carter",
      team_id: "1610612758",
      team_abbreviation: "SAC",
    };
    const teams: RuntimeTeamFallback[] = [
      { ...teamBase, team_id: "1610612737", slug: "atlanta-hawks", abbreviation: "ATL" },
      { ...teamBase, team_id: "1610612758", slug: "sacramento-kings", abbreviation: "SAC" },
    ];

    const [upcomingCarter] = buildUpcomingRosterRows([historicalCarter], teams);

    expect(currentTeamOverrideForPlayerSlug("devin-carter")).toMatchObject({
      season: "2026-27",
      fromTeamAbbreviation: "SAC",
      toTeamAbbreviation: "ATL",
    });
    expect(upcomingCarter).toMatchObject({
      player_slug: "devin-carter",
      team_id: "1610612737",
      team_abbreviation: "ATL",
      games: 0,
      minutes: null,
      pts: null,
    });
    expect(historicalCarter).toMatchObject({
      team_id: "1610612758",
      team_abbreviation: "SAC",
      games: 38,
      minutes: 18.4,
      pts: 8.9,
    });
  });
});
