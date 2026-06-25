import { badRequest, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";

export async function GET(request: Request) {
  try {
    parseSearchParams(shotQuerySchema, request);
    return ok([], {
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
      source: "unavailable",
      message: "Possession search requires a verified play-by-play possession feed.",
    });
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
