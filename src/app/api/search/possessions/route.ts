import { SHORT_DATA_CACHE_CONTROL, badRequest, cachedOk, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";

export async function GET(request: Request) {
  try {
    parseSearchParams(shotQuerySchema, request);
    return cachedOk([], {
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
      source: "unavailable",
      message: "Possession search requires a verified play-by-play possession feed.",
    }, SHORT_DATA_CACHE_CONTROL);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
