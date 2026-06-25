import { badRequest, ok, serverError } from "@/lib/api/response";
import { leadersQuerySchema, parseSearchParams } from "@/lib/api/validation";
import { listLeaderboardApiRecords } from "@/lib/db/apiAnalytics.server";

export async function GET(request: Request) {
  try {
    const query = parseSearchParams(leadersQuerySchema, request);
    const metric = query.stat ?? query.metric;
    const result = await listLeaderboardApiRecords(metric, query);
    return ok(result.rows, { source: result.source });
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
