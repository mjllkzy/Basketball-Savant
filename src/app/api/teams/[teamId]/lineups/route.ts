import { notFound, ok } from "@/lib/api/response";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await loadTeamProfile(teamId);
  return profile ? ok(profile.lineups) : notFound("Team not found");
}
