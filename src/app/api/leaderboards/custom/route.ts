import { cachedOk } from "@/lib/api/response";
import { getCustomLeaderboardAnalytics } from "@/lib/db/customAnalytics.server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const entityType = (params.get("entityType") ?? "players") as "players" | "teams" | "lineups";
  const season = params.get("season") ?? undefined;
  const metricKeys = (params.get("metrics") ?? "pts,reb,ast,stl,blk,ts_pct,efg_pct,usage_rate").split(",").filter(Boolean);
  const result = await getCustomLeaderboardAnalytics(entityType, metricKeys, season);
  return cachedOk(result.rows, { source: result.source, message: result.message });
}
