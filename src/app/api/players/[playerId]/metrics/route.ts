import { notFound, ok } from "@/lib/api/response";
import { getPlayerByIdOrSlug, getMetricValuesForPlayer } from "@/lib/data/queries";

export function GET(_: Request, { params }: { params: { playerId: string } }) {
  const player = getPlayerByIdOrSlug(params.playerId);
  return player ? ok(getMetricValuesForPlayer(player.id)) : notFound("Player not found");
}
