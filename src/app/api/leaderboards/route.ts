import { badRequest, ok, serverError } from "@/lib/api/response";
import { leadersQuerySchema, parseSearchParams } from "@/lib/api/validation";
import { getPlayerLeaderboard } from "@/lib/data/queries";

export function GET(request: Request) {
  try {
    const query = parseSearchParams(leadersQuerySchema, request);
    const metric = query.stat ?? query.metric;
    return ok(getPlayerLeaderboard(metric, query));
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
