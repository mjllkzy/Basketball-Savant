import { badRequest, cachedOk, serverError } from "@/lib/api/response";
import { parseSearchParams, teamQuerySchema } from "@/lib/api/validation";
import { listTeamApiRecords } from "@/lib/db/apiAnalytics.server";

export async function GET(request: Request) {
  try {
    const query = parseSearchParams(teamQuerySchema, request);
    const result = await listTeamApiRecords(query);
    return cachedOk(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
