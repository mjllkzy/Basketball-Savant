import { cachedOk, notFound } from "@/lib/api/response";
import { calculateTeamMetric, metricRegistry } from "@/lib/metrics/registry";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";
import { parseSeasonType } from "@/lib/seasonTypes";
import { parseSeason } from "@/lib/seasons";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const query = new URL(request.url).searchParams;
  const season = parseSeason(query.get("season"));
  const seasonType = parseSeasonType(query.get("seasonType"));
  const profile = await loadTeamProfile(teamId, seasonType, season);
  if (!profile) return notFound("Team not found");
  return cachedOk(metricRegistry.map((metric) => ({ metricKey: metric.key, value: calculateTeamMetric(metric.key, profile.aggregate) })).filter((row) => row.value !== null));
}
