import { SHORT_DATA_CACHE_CONTROL, cachedOk, notFound } from "@/lib/api/response";
import { getGameAnalytics } from "@/lib/db/gameAnalytics.server";

export async function GET(_: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const report = await getGameAnalytics(gameId);
  return report ? cachedOk(report.feed, undefined, SHORT_DATA_CACHE_CONTROL) : notFound("Game not found");
}
