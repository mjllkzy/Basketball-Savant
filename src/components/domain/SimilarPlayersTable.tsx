import Link from "next/link";
import { tableColumnWidths, tableMinWidth } from "@/components/ui/tableSizing";
import { DEFAULT_SEASON } from "@/lib/seasons";
import type { SimilarPlayerMatch } from "@/lib/db/playerAnalytics.server";

function decimal(value: number) {
  return value.toFixed(1);
}

function playerHref(slug: string, season: string, seasonType: string) {
  const params = new URLSearchParams();
  if (season !== DEFAULT_SEASON) params.set("season", season);
  if (seasonType !== "Regular Season") params.set("seasonType", seasonType);
  const query = params.toString();
  return query ? `/players/${slug}?${query}` : `/players/${slug}`;
}

const similarPlayerColumns = [
  { key: "rank", label: "Rk", width: tableColumnWidths.narrow, align: "center" },
  { key: "player", label: "Player", width: tableColumnWidths.entity, align: "left" },
  { key: "physical", label: "Physical", width: tableColumnWidths.text, align: "left" },
  { key: "box", label: "Box", width: tableColumnWidths.text, align: "left" },
  { key: "per36", label: "Per 36", width: tableColumnWidths.text, align: "left" },
  { key: "score", label: "Score", width: tableColumnWidths.compact, align: "center" },
  { key: "components", label: "Components", width: tableColumnWidths.wideText, align: "left" },
  { key: "traits", label: "Closest Traits", width: tableColumnWidths.wideText, align: "left" },
] as const;

const similarPlayerTableMinWidth = tableMinWidth(similarPlayerColumns);

function alignClass(align: typeof similarPlayerColumns[number]["align"]) {
  if (align === "center") return "text-center";
  return "text-left";
}

export function SimilarPlayersTable({ rows, season = DEFAULT_SEASON, seasonType = "Regular Season" }: { rows: SimilarPlayerMatch[]; season?: string; seasonType?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3 text-sm font-black text-ink">Most Similar Players</div>
      <div className="table-scroll overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm" style={similarPlayerTableMinWidth ? { minWidth: similarPlayerTableMinWidth } : undefined}>
          <colgroup>
            {similarPlayerColumns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              {similarPlayerColumns.map((column) => (
                <th key={column.key} className={`h-11 overflow-hidden whitespace-nowrap border-b border-slate-200 px-3 py-3 align-middle font-black ${alignClass(column.align)}`}>
                  <span className="block truncate">{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.player.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                <td className="h-20 overflow-hidden whitespace-nowrap px-3 py-3 text-center align-middle font-black text-slate-400">{index + 1}</td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle">
                  <Link href={playerHref(row.player.slug, season, seasonType)} className="font-black text-signal hover:underline">{row.player.name}</Link>
                  <div className="mt-1 text-xs text-slate-500">{row.team.abbreviation} · {row.summary.games} G · {decimal(row.summary.minutesPerGame)} MPG</div>
                </td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle text-xs leading-5 text-slate-600">
                  <div>{row.summary.position} · {row.summary.height} · {row.summary.weight}</div>
                  <div>Wingspan: {row.summary.wingspan}</div>
                </td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle text-xs leading-5 text-slate-700">
                  <div>{decimal(row.summary.ppg)} PPG</div>
                  <div>{decimal(row.summary.rpg)} RPG · {decimal(row.summary.apg)} APG</div>
                </td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle text-xs leading-5 text-slate-700">
                  <div>{decimal(row.summary.ptsPer36)} PTS</div>
                  <div>{decimal(row.summary.rebPer36)} REB · {decimal(row.summary.astPer36)} AST</div>
                </td>
                <td className="h-20 overflow-hidden whitespace-nowrap px-3 py-3 text-center align-middle">
                  <span className="text-2xl font-black text-ink">{row.score}</span>
                </td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle text-xs leading-5 text-slate-600">
                  <div>Stats {row.ratioScore} · Rates {row.perMinuteScore}</div>
                  <div>Physical {row.physicalScore} · Role {row.roleScore}</div>
                </td>
                <td className="h-20 overflow-hidden px-3 py-3 align-middle text-xs font-semibold text-slate-600">{row.matchingTraits.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
