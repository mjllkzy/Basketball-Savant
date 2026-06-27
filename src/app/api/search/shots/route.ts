import { SHORT_DATA_CACHE_CONTROL, badRequest, cachedOk, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { searchShotAnalytics } from "@/lib/db/shotSearch.server";

export async function GET(request: Request) {
  try {
    const query = parseSearchParams(shotQuerySchema, request);
    const result = await searchShotAnalytics(query);
    return cachedOk(result.rows, { ...result.meta, scopeRequired: result.scopeRequired, summary: result.summary }, SHORT_DATA_CACHE_CONTROL);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
