import { notFound, ok } from "@/lib/api/response";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";

export async function GET(_: Request, { params }: { params: { playerId: string } }) {
  const profile = await loadPlayerProfileAnalytics(params.playerId);
  return profile ? ok(profile.similar) : notFound("Player not found");
}
