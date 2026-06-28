import { cachedOk, notFound } from "@/lib/api/response";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const seasonType = parseSeasonType(new URL(request.url).searchParams.get("seasonType"));
  const profile = await loadTeamProfile(teamId, seasonType);
  return profile ? cachedOk(profile) : notFound("Team not found");
}
