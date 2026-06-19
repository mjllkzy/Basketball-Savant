import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { parseSearchParams, shotQuerySchema } from "@/lib/api/validation";
import { getLiveTeamShotChart } from "@/lib/data/liveShotCharts";
import { filterShotRows, filterShots, getTeamByIdOrSlug } from "@/lib/data/queries";

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const team = getTeamByIdOrSlug(params.teamId);
    if (!team) return notFound("Team not found");
    const query = parseSearchParams(shotQuerySchema, request);
    const liveShots = await getLiveTeamShotChart(team.id);
    const result = liveShots.length
      ? filterShotRows(liveShots, { ...query, teamId: team.id })
      : filterShots({ ...query, teamId: team.id });
    return ok(result.rows, result.meta);
  } catch (error) {
    return error instanceof Error && error.name === "ZodError" ? badRequest(error) : serverError(error);
  }
}
