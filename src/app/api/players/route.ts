import { badRequest, ok, serverError } from "@/lib/api/response";
import { listQuerySchema, parseSearchParams } from "@/lib/api/validation";
import { listPlayers } from "@/lib/data/queries";

export function GET(request: Request) {
  try {
    const query = parseSearchParams(listQuerySchema, request);
    const result = listPlayers(query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
