import { cachedOk, notFound } from "@/lib/api/response";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";

export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const seasonType = parseSeasonType(new URL(request.url).searchParams.get("seasonType"));
  const profile = await loadPlayerProfileAnalytics(playerId, seasonType);
  return profile ? cachedOk(profile.metricValues) : notFound("Player not found");
}
