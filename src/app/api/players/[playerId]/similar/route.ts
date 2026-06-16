import { notFound, ok } from "@/lib/api/response";
import { getPlayerByIdOrSlug, getSimilarPlayers, type SimilarityBasis } from "@/lib/data/queries";

export function GET(request: Request, { params }: { params: { playerId: string } }) {
  const player = getPlayerByIdOrSlug(params.playerId);
  if (!player) return notFound("Player not found");
  const basis = (new URL(request.url).searchParams.get("basis") ?? "Overall") as SimilarityBasis;
  return ok(getSimilarPlayers(player.id, basis));
}
