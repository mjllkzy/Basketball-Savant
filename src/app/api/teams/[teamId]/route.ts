import { notFound, ok } from "@/lib/api/response";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";

export async function GET(_: Request, { params }: { params: { teamId: string } }) {
  const profile = await loadTeamProfile(params.teamId);
  return profile ? ok(profile) : notFound("Team not found");
}
