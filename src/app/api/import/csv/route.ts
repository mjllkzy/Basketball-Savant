import { badRequest, ok, payloadTooLarge, unauthorized } from "@/lib/api/response";
import { parseCsv } from "@/lib/import/csv";

const maxCsvBytes = 1_000_000;

export async function POST(request: Request) {
  const configuredToken = process.env.IMPORT_PREVIEW_TOKEN?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!configuredToken || request.headers.get("x-import-token") !== configuredToken) {
      return unauthorized("Import preview is disabled without a valid server token.");
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxCsvBytes) return payloadTooLarge();

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxCsvBytes) return payloadTooLarge();
  if (!text.trim()) return badRequest(new Error("CSV body is required"));
  const rows = parseCsv(text);
  return ok({ rows: rows.slice(0, 20), total: rows.length, mode: "preview", note: "Import preview. Wire a database adapter here for persistence." });
}
