import { notFound, ok } from "@/lib/api/response";
import { getPlayerProfile } from "@/lib/data/queries";

export function GET(_: Request, { params }: { params: { playerId: string } }) {
  const profile = getPlayerProfile(params.playerId);
  return profile ? ok(profile) : notFound("Player not found");
}
