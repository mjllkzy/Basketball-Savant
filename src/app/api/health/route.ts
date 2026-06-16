import { ok } from "@/lib/api/response";
import { datasetSummary } from "@/lib/data/queries";

export function GET() {
  return ok({ status: "ok", name: "Basketball Savant", ...datasetSummary() });
}
