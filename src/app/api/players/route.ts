import { badRequest, cachedOk, serverError } from "@/lib/api/response";
import { listQuerySchema, parseSearchParams } from "@/lib/api/validation";
import { listPlayerApiRecords } from "@/lib/db/apiAnalytics.server";

export async function GET(request: Request) {
  try {
    const query = parseSearchParams(listQuerySchema, request);
    const result = await listPlayerApiRecords(query);
    return cachedOk(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
