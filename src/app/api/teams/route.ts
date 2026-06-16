import { badRequest, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, teamQuerySchema } from "@/lib/api/validation";
import { listTeams } from "@/lib/data/queries";

export function GET(request: Request) {
  try {
    const query = parseSearchParams(teamQuerySchema, request);
    const result = listTeams(query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
