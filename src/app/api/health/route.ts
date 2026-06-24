import { ok } from "@/lib/api/response";
import { datasetSummary } from "@/lib/data/queries";
import { getDatabaseHealth } from "@/lib/db/health.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await getDatabaseHealth();
  return ok({
    status: database.status === "unavailable" ? "degraded" : "ok",
    name: "Basketball Savant",
    ...datasetSummary(),
    database,
  });
}
