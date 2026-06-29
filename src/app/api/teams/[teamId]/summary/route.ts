import { cachedOk, notFound } from "@/lib/api/response";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";
import { parseSeason } from "@/lib/seasons";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const query = new URL(request.url).searchParams;
  const season = parseSeason(query.get("season"));
  const seasonType = parseSeasonType(query.get("seasonType"));
  const profile = await loadTeamProfile(teamId, seasonType, season);
  return profile ? cachedOk({ team: profile.team, aggregate: profile.aggregate }) : notFound("Team not found");
}
