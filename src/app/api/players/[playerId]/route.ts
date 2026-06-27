import { cachedOk, notFound } from "@/lib/api/response";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";

export async function GET(_: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const profile = await loadPlayerProfileAnalytics(playerId);
  return profile ? cachedOk(profile) : notFound("Player not found");
}
