import { notFound, ok } from "@/lib/api/response";
import { calculateTeamMetric, metricRegistry } from "@/lib/metrics/registry";
import { getTeamProfile } from "@/lib/data/queries";

export function GET(_: Request, { params }: { params: { teamId: string } }) {
  const profile = getTeamProfile(params.teamId);
  if (!profile) return notFound("Team not found");
  return ok(metricRegistry.map((metric) => ({ metricKey: metric.key, value: calculateTeamMetric(metric.key, profile.aggregate) })).filter((row) => row.value !== null));
}
