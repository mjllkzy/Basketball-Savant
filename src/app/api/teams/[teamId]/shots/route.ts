import { SHORT_DATA_CACHE_CONTROL, badRequest, cachedOk, notFound, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterShotCollection } from "@/lib/data/shotFilters";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const query = parseSearchParams(shotQuerySchema, request);
    const profile = await loadTeamProfile(teamId, parseSeasonType(query.seasonType), query.season);
    if (!profile) return notFound("Team not found");
    const result = filterShotCollection(profile.shots, query);
    return cachedOk(result.rows, result.meta, SHORT_DATA_CACHE_CONTROL);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
