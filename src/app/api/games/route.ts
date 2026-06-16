import { ok } from "@/lib/api/response";
import { listGames } from "@/lib/data/queries";

export function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = listGames({
    teamId: params.teamId,
    status: params.status,
    season: params.season,
    date: params.date,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20
  });
  return ok(result.rows, result.meta);
}
