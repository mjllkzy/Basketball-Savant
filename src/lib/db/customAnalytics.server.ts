import { calculatePlayerMetric, calculateTeamMetric, getMetric } from "@/lib/metrics/registry";
import type { Player, Team } from "@/lib/types";
import { loadAllComparisonPlayers } from "./playerAnalytics.server";
import { listTeamSeasonSummaries } from "./teamAnalytics.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/customAnalytics.server.ts can only be imported on the server.");
}

export type CustomLeaderboardEntity = "players" | "teams" | "lineups";

export type CustomLeaderboardRow = {
  id: string;
  label: string;
  player?: Player;
  team?: Team;
  values: Record<string, number | null>;
};

export type CustomLeaderboardResult = {
  rows: CustomLeaderboardRow[];
  source: "postgres" | "json" | "unavailable";
  message?: string;
};

function validatedMetricKeys(metricKeys: string[]) {
  return Array.from(new Set(metricKeys)).slice(0, 20).map((key) => getMetric(key).key);
}

export async function getCustomLeaderboardAnalytics(
  entityType: CustomLeaderboardEntity,
  requestedMetricKeys: string[],
): Promise<CustomLeaderboardResult> {
  const metricKeys = validatedMetricKeys(requestedMetricKeys);
  if (entityType === "lineups") {
    return {
      rows: [],
      source: "unavailable",
      message: "Lineup leaderboards require a verified lineup possession feed.",
    };
  }

  if (entityType === "teams") {
    const loaded = await listTeamSeasonSummaries();
    return {
      source: loaded.source,
      rows: loaded.rows.map((aggregate) => ({
        id: aggregate.team.id,
        label: `${aggregate.team.city} ${aggregate.team.name}`,
        team: aggregate.team,
        values: Object.fromEntries(metricKeys.map((key) => [key, calculateTeamMetric(key, aggregate)])),
      })),
    };
  }

  const loaded = await loadAllComparisonPlayers();
  return {
    source: loaded.source,
    rows: loaded.rows.map(({ player, team, aggregate }) => ({
      id: player.id,
      label: player.name,
      player,
      team,
      values: Object.fromEntries(metricKeys.map((key) => [key, calculatePlayerMetric(key, aggregate)])),
    })),
  };
}
