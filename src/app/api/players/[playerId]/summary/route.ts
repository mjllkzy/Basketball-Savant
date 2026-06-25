import { notFound, ok } from "@/lib/api/response";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";

export async function GET(_: Request, { params }: { params: { playerId: string } }) {
  const profile = await loadPlayerProfileAnalytics(params.playerId);
  return profile ? ok({ player: profile.player, team: profile.team, aggregate: profile.aggregate }) : notFound("Player not found");
}
