import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { getLiveTeamShotChart } from "@/lib/data/liveShotCharts";
import { filterShotCollection } from "@/lib/data/shotFilters";
import { loadTeamProfile } from "@/lib/db/teamAnalytics.server";

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const profile = await loadTeamProfile(params.teamId);
    if (!profile) return notFound("Team not found");
    const query = parseSearchParams(shotQuerySchema, request);
    const liveShots = await getLiveTeamShotChart(profile.team.id);
    const result = filterShotCollection(liveShots, query);
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
