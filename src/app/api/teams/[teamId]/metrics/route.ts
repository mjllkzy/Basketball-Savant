import { cachedOk, notFound } from "@/lib/api/response";
import { calculateTeamMetric, metricRegistry } from "@/lib/metrics/registry";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const seasonType = parseSeasonType(new URL(request.url).searchParams.get("seasonType"));
  const profile = await loadTeamProfile(teamId, seasonType);
  if (!profile) return notFound("Team not found");
  return cachedOk(metricRegistry.map((metric) => ({ metricKey: metric.key, value: calculateTeamMetric(metric.key, profile.aggregate) })).filter((row) => row.value !== null));
}
