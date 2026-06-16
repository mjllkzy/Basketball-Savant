import { notFound, ok } from "@/lib/api/response";
import { getGameReport } from "@/lib/data/queries";

export function GET(_: Request, { params }: { params: { gameId: string } }) {
  const report = getGameReport(params.gameId);
  return report ? ok(report.lineups) : notFound("Game not found");
}
