import { cachedOk, notFound } from "@/lib/api/response";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";
import { parseSeason } from "@/lib/seasons";

export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const query = new URL(request.url).searchParams;
  const season = parseSeason(query.get("season"));
  const seasonType = parseSeasonType(query.get("seasonType"));
  const profile = await loadPlayerProfileAnalytics(playerId, seasonType, season);
  return profile ? cachedOk(profile.metricValues) : notFound("Player not found");
}
