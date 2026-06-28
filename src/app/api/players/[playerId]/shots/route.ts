import { SHORT_DATA_CACHE_CONTROL, badRequest, cachedOk, notFound, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterShotCollection } from "@/lib/data/shotFilters";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";

export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  try {
    const { playerId } = await params;
    const query = parseSearchParams(shotQuerySchema, request);
    const profile = await loadPlayerProfileAnalytics(playerId, parseSeasonType(query.seasonType));
    if (!profile) return notFound("Player not found");
    const result = filterShotCollection(profile.shots, query);
    return cachedOk(result.rows, result.meta, SHORT_DATA_CACHE_CONTROL);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
