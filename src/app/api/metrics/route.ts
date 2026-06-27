import { STATIC_DATA_CACHE_CONTROL, cachedOk } from "@/lib/api/response";
import { metricRegistry } from "@/lib/metrics/registry";

export function GET() {
  return cachedOk(metricRegistry, undefined, STATIC_DATA_CACHE_CONTROL);
}
