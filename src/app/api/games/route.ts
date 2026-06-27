import { cachedOk } from "@/lib/api/response";
import { listGameAnalytics } from "@/lib/db/gameAnalytics.server";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = await listGameAnalytics({
    teamId: params.teamId,
    status: params.status,
    season: params.season,
    date: params.date,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20
  });
  return cachedOk(result.rows, result.meta);
}
