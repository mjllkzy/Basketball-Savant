import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterShots, getPlayerByIdOrSlug } from "@/lib/data/queries";

export function GET(request: Request, { params }: { params: { playerId: string } }) {
  try {
    const player = getPlayerByIdOrSlug(params.playerId);
    if (!player) return notFound("Player not found");
    const query = parseSearchParams(shotQuerySchema, request);
    const result = filterShots({ ...query, playerId: player.id });
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
