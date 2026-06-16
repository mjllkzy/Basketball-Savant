import { badRequest, ok } from "@/lib/api/response";
import { parseCsv } from "@/lib/import/csv";

export async function POST(request: Request) {
  const text = await request.text();
  if (!text.trim()) return badRequest(new Error("CSV body is required"));
  const rows = parseCsv(text);
  return ok({ rows: rows.slice(0, 20), total: rows.length, mode: "preview", note: "Import preview. Wire a database adapter here for persistence." });
}
