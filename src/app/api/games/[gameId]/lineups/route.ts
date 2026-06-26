import { notFound, ok } from "@/lib/api/response";
import { getGameAnalytics } from "@/lib/db/gameAnalytics.server";

export async function GET(_: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const report = await getGameAnalytics(gameId);
  return report ? ok(report.lineups) : notFound("Game not found");
}
