import { notFound, ok } from "@/lib/api/response";
import { getGameAnalytics } from "@/lib/db/gameAnalytics.server";

export async function GET(_: Request, { params }: { params: { gameId: string } }) {
  const report = await getGameAnalytics(params.gameId);
  return report ? ok(report.boxScore) : notFound("Game not found");
}
