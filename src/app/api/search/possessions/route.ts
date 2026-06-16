import { badRequest, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterPossessions } from "@/lib/data/queries";

export function GET(request: Request) {
  try {
    const query = parseSearchParams(shotQuerySchema, request);
    const result = filterPossessions(query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
