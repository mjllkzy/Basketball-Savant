import { badRequest, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { filterShots } from "@/lib/data/queries";

export function GET(request: Request) {
  try {
    const query = parseSearchParams(shotQuerySchema, request);
    const result = filterShots(query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
