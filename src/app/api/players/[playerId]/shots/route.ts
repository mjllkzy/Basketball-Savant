import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterShotCollection } from "@/lib/data/shotFilters";
import { loadPlayerProfileAnalytics } from "@/lib/db/playerAnalytics.server";

export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  try {
    const { playerId } = await params;
    const profile = await loadPlayerProfileAnalytics(playerId);
    if (!profile) return notFound("Player not found");
    const query = parseSearchParams(shotQuerySchema, request);
    const result = filterShotCollection(profile.shots, query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
