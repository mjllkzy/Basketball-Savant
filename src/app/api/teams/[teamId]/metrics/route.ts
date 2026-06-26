import { notFound, ok } from "@/lib/api/response";
import { calculateTeamMetric, metricRegistry } from "@/lib/metrics/registry";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await loadTeamProfile(teamId);
  if (!profile) return notFound("Team not found");
  return ok(metricRegistry.map((metric) => ({ metricKey: metric.key, value: calculateTeamMetric(metric.key, profile.aggregate) })).filter((row) => row.value !== null));
}
