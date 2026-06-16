import { ok } from "@/lib/api/response";
import { getCustomLeaderboard } from "@/lib/data/queries";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const entityType = (params.get("entityType") ?? "players") as "players" | "teams" | "lineups";
  const metricKeys = (params.get("metrics") ?? "pts,reb,ast,ts_pct,efg_pct,usage_rate,stocks").split(",").filter(Boolean);
  return ok(getCustomLeaderboard(entityType, metricKeys));
}
