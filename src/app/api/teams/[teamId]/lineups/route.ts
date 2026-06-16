import { notFound, ok } from "@/lib/api/response";
import { getTeamProfile } from "@/lib/data/queries";

export function GET(_: Request, { params }: { params: { teamId: string } }) {
  const profile = getTeamProfile(params.teamId);
  return profile ? ok(profile.lineups) : notFound("Team not found");
}
