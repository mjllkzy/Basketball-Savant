import { ok } from "@/lib/api/response";
import { metricRegistry } from "@/lib/metrics/registry";

export function GET() {
  return ok(metricRegistry);
}
