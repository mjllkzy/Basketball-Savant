import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Landmark, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn, type StatTableRow } from "@/components/ui/StatTable";
import { nbaTeams } from "@/lib/data/nbaTeams";
import {
  contractSeasons,
  contractDealSummary,
  contractSalarySortValue,
  freeAgencyStatusForSeason,
  listPlayerContracts,
  selectActiveContractDeal,
  summarizeContractSalaries,
  summarizeTotalRemainingContract,
  type ContractSeason,
  type PlayerContractRow,
} from "@/lib/db/playerContracts.server";
import { UPCOMING_SEASON, baseSeasonOptions, parseSeason } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { nbaTeamLogoUrl, teamAccentColor } from "@/lib/teamBranding";

type FinanceMode = "overview" | "teams" | "players";

const defaultFinanceSeason = UPCOMING_SEASON as ContractSeason;
const entityColumnWidth = "290px";
const compactColumnWidth = "94px";
const moneyColumnWidth = "126px";
const salaryColumnWidth = "126px";
const playerFinanceMinWidth = "1920px";
const teamFinanceMinWidth = "1180px";
const pastSalaryHeaderClassName = "bg-slate-200/80 text-slate-500";
const pastSalaryCellClassName = "bg-slate-100/60 text-slate-500";
const teamPrimaryColorByAbbreviation = new Map(nbaTeams.map((team) => [team.abbreviation, team.primaryColor]));
const salaryCapBySeason: Partial<Record<ContractSeason, number>> = {
  "2025-26": 154_647_000,
  "2026-27": 164_961_000,
};

export const metadata: Metadata = {
  title: "NBA Finances",
  description: "Explore NBA team payroll and player contract tables.",
  alternates: { canonical: "/finances" },
};

function parseFinanceMode(value: string | null | undefined): FinanceMode {
  if (value === "teams" || value === "players") return value;
  return "overview";
}

function parseContractSeason(value: string | null | undefined): ContractSeason {
  const season = parseSeason(value);
  return contractSeasons.includes(season as ContractSeason) ? (season as ContractSeason) : defaultFinanceSeason;
}

function formatMoney(amount: number | null | undefined, missingLabel = "--") {
  if (amount === null || amount === undefined) return missingLabel;
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: value >= 10 ? 1 : 2,
      maximumFractionDigits: value >= 10 ? 1 : 2,
    })}M`;
  }
  return `$${amount.toLocaleString("en-US")}`;
}

function formatSalaryCapShare(amount: number | null | undefined, season: ContractSeason) {
  const cap = salaryCapBySeason[season];
  if (amount === null || amount === undefined || cap === undefined) return "";
  return `${((amount / cap) * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% of cap`;
}

function formatContractYears(years: number | null | undefined, missingLabel = "--") {
  if (years === null || years === undefined) return missingLabel;
  return years === 1 ? "1 yr" : `${years} yrs`;
}

function formatCapPosition(payroll: number, season: ContractSeason) {
  const cap = salaryCapBySeason[season];
  if (!cap) return { value: "Cap pending", sort: null, sub: "" };
  const difference = cap - payroll;
  return {
    value: difference >= 0 ? `${formatMoney(difference)} room` : `${formatMoney(Math.abs(difference))} over`,
    sort: difference,
    sub: formatMoney(cap),
  };
}

function optionKind(label: string | null | undefined) {
  const value = label?.toLowerCase() ?? "";
  if (!value) return null;
  if (value.includes("player")) return "player";
  if (value.includes("team") || value.includes("club")) return "team";
  if (value.includes("mutual")) return "mutual";
  if (value.includes("non") || value.includes("partial")) return "guarantee";
  if (value.includes("unknown") || value.includes("unavailable")) return "unknown";
  return "unknown";
}

function optionCode(label: string | null | undefined) {
  const kind = optionKind(label);
  if (kind === "player") return "PO";
  if (kind === "team") return "TO";
  if (kind === "mutual") return "MO";
  if (kind === "guarantee") return "NG";
  if (kind === "unknown") return "TBD";
  return "";
}

function optionClassName(label: string | null | undefined) {
  const kind = optionKind(label);
  if (kind === "player") return "font-black text-amber-700";
  if (kind === "team") return "font-black text-sky-700";
  if (kind === "mutual") return "font-black text-violet-700";
  if (kind === "guarantee") return "font-black text-rose-700";
  if (kind === "unknown") return "font-black text-slate-600";
  return "";
}

function isDecidedCurrentSeasonOption(season: ContractSeason, label: string | null | undefined) {
  const kind = optionKind(label);
  return season === "2025-26" && (kind === "player" || kind === "team" || kind === "mutual");
}

function displayContractDetail(season: ContractSeason, optionLabel: string | null | undefined, guaranteeLabel: string | null | undefined) {
  if (isDecidedCurrentSeasonOption(season, optionLabel)) return guaranteeLabel;
  return optionLabel ?? guaranteeLabel;
}

function contractSalaryKey(season: ContractSeason) {
  return `salary_${season.replace("-", "_")}`;
}

function contractSeasonStartYear(season: ContractSeason) {
  return Number(season.slice(0, 4));
}

function selectedSeasonLabel(season: ContractSeason) {
  return season === "2026-27" ? "2026-27" : "2025-26";
}

function financeHref(mode: Exclude<FinanceMode, "overview">, season: ContractSeason) {
  return `/finances?mode=${mode}&season=${encodeURIComponent(season)}`;
}

function identityColumn(key: string, label: string, width = compactColumnWidth, group = "Profile"): StatTableColumn {
  return { key, label, width, group, align: "center" };
}

function contractSalaryColumn(season: ContractSeason, selectedSeason: ContractSeason): StatTableColumn {
  const key = contractSalaryKey(season);
  const isPastSeason = contractSeasonStartYear(season) < contractSeasonStartYear(selectedSeason);
  return {
    key,
    label: season,
    group: "Annual Salary",
    align: "center",
    width: salaryColumnWidth,
    sortValueKey: `${key}Sort`,
    subValueKey: `${key}CapPct`,
    subValueClassName: "text-slate-500",
    valueClassNameKey: `${key}Class`,
    headerClassName: isPastSeason ? pastSalaryHeaderClassName : undefined,
    cellClassName: isPastSeason ? pastSalaryCellClassName : undefined,
  };
}

function playerFinanceColumns(selectedSeason: ContractSeason): StatTableColumn[] {
  return [
    { key: "player", label: "Player", group: "Profile", hrefKey: "href", width: entityColumnWidth, truncate: true },
    identityColumn("team", "Team"),
    identityColumn("pos", "Pos"),
    { key: "originalYears", label: "Orig Yrs", group: "Contract Summary", align: "center", width: compactColumnWidth, sortValueKey: "originalYearsSort" },
    { key: "remainingYears", label: "Time Left", group: "Contract Summary", align: "center", width: compactColumnWidth, sortValueKey: "remainingYearsSort", subValueKey: "remainingYearsSub", subValueClassName: "text-rose-700", valueClassNameKey: "remainingYearsClass" },
    { key: "originalTotal", label: "Orig Total", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "originalTotalSort" },
    { key: "remainingTotal", label: "Money Left", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "remainingTotalSort" },
    { key: "originalAav", label: "Orig AAV", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "originalAavSort" },
    { key: "currentAav", label: "Current AAV", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "currentAavSort" },
    ...contractSeasons.map((contractSeason) => contractSalaryColumn(contractSeason, selectedSeason)),
    { key: "guaranteed", label: "Guaranteed", group: "Guaranteed Money", align: "center", width: "150px", sortValueKey: "guaranteedSort", valueClassNameKey: "guaranteedClass" },
  ];
}

const teamFinanceColumns: StatTableColumn[] = [
  {
    key: "team",
    label: "Team",
    group: "Team",
    hrefKey: "href",
    imageKey: "logo",
    imageAltKey: "logoAlt",
    imageFallbackKey: "abbr",
    width: entityColumnWidth,
    truncate: true,
  },
  identityColumn("conf", "Conf", compactColumnWidth, "Team"),
  identityColumn("division", "Division", "120px", "Team"),
  { key: "contractedPlayers", label: "Players", group: "Roster Money", align: "center", width: compactColumnWidth, sortValueKey: "contractedPlayersSort" },
  { key: "payroll", label: "Payroll", group: "Roster Money", align: "center", width: moneyColumnWidth, sortValueKey: "payrollSort", subValueKey: "payrollCapPct" },
  { key: "capPosition", label: "Cap Position", group: "Roster Money", align: "center", width: "140px", sortValueKey: "capPositionSort", subValueKey: "capLineSub", subValueClassName: "text-slate-500" },
  { key: "topSalary", label: "Top Salary", group: "Top Contract", align: "center", width: moneyColumnWidth, sortValueKey: "topSalarySort", subValueKey: "topPlayer", subValueClassName: "text-signal" },
  { key: "guaranteed", label: "Guaranteed", group: "Guaranteed Money", align: "center", width: moneyColumnWidth, sortValueKey: "guaranteedSort" },
];

const contractLegend = [
  { label: "Player option", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { label: "Team option", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { label: "Mutual option", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { label: "Non/partial guarantee", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { label: "Details pending", className: "border-slate-200 bg-slate-50 text-slate-600" },
];

function FinanceChooser({ season }: { season: ContractSeason }) {
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Finance Desk"
        title="Finances"
        description="Separate workspaces for team payroll context and all-player contract tables from the contract masterfile."
      />
      <div className="grid min-h-[calc(100vh-280px)] gap-4 lg:grid-cols-2">
        <Link
          href={financeHref("teams", season)}
          className="group relative isolate flex min-h-[420px] overflow-hidden rounded border border-signal/30 bg-signal p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_46%)]" />
          <div className="relative flex h-full w-full flex-col justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-white/15">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Team finances</div>
              <h1 className="mt-2 text-5xl font-black tracking-normal">Team Payroll</h1>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">Committed salary, cap share, roster contract counts, and top contract by team.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-white">
              Open team finances <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link
          href={financeHref("players", season)}
          className="group relative isolate flex min-h-[420px] overflow-hidden rounded border border-ink/20 bg-ink p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,162,97,0.3),transparent_44%)]" />
          <div className="relative flex h-full w-full flex-col justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-white/15">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">All players</div>
              <h1 className="mt-2 text-5xl font-black tracking-normal">Player Contracts</h1>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">Annual salary, option status, guaranteed money, and remaining deal context for every player.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-white">
              Open player finances <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function FinanceControls({ mode, season }: { mode: Exclude<FinanceMode, "overview">; season: ContractSeason }) {
  return (
    <section className="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.08em]">
        <Link
          href={financeHref("teams", season)}
          className={`inline-flex min-h-10 items-center rounded border px-4 ${mode === "teams" ? "border-ink bg-ink text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Team Finances
        </Link>
        <Link
          href={financeHref("players", season)}
          className={`inline-flex min-h-10 items-center rounded border px-4 ${mode === "players" ? "border-ink bg-ink text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          All Players
        </Link>
      </div>
      <form className="grid gap-3 sm:grid-cols-[1fr_220px]" action="/finances">
        <input type="hidden" name="mode" value={mode} />
        <label className="grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Season</span>
          <select name="season" defaultValue={season} className="min-h-11 rounded border border-slate-300 px-3 text-sm">
            {baseSeasonOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <button className="self-end rounded bg-ink px-4 py-3 text-sm font-black text-white hover:bg-slate-800">Apply</button>
      </form>
    </section>
  );
}

function ContractLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 shadow-sm">
      <span className="mr-1 text-slate-600">Legend</span>
      {contractLegend.map((item) => (
        <span key={item.label} className={`rounded border px-2 py-1 ${item.className}`}>{item.label}</span>
      ))}
    </div>
  );
}

function playerHref(row: PlayerContractRow, season: ContractSeason) {
  if (!row.playerSlug) return undefined;
  return `/players/${row.playerSlug}?season=${encodeURIComponent(season)}&view=contracts`;
}

function playerFinanceRows(rows: PlayerContractRow[], season: ContractSeason): StatTableRow[] {
  return rows.map((row) => {
    const activeDeal = selectActiveContractDeal(row.contractDeals, season);
    const originalContract = contractDealSummary(activeDeal) ?? summarizeContractSalaries(row.salaryBySeason);
    const currentContract = summarizeTotalRemainingContract(row.salaryBySeason, row.contractDeals, season);
    const freeAgencyStatus = currentContract ? null : freeAgencyStatusForSeason(row.contractDeals, season);
    const base: StatTableRow = {
      player: row.playerName,
      href: playerHref(row, season),
      team: row.teamAbbreviation,
      teamAccent: teamPrimaryColorByAbbreviation.get(row.teamAbbreviation) ?? "#0f766e",
      pos: row.position ?? "N/A",
      originalYears: formatContractYears(originalContract?.years),
      originalYearsSort: originalContract?.years ?? null,
      remainingYears: currentContract ? formatContractYears(currentContract.years) : freeAgencyStatus ? "0 yrs" : "--",
      remainingYearsSub: freeAgencyStatus ?? "",
      remainingYearsSort: currentContract?.years ?? (freeAgencyStatus ? 0 : null),
      remainingYearsClass: freeAgencyStatus ? "text-rose-700" : "",
      originalTotal: formatMoney(originalContract?.total),
      originalTotalSort: originalContract?.total ?? null,
      remainingTotal: currentContract ? formatMoney(currentContract.total) : freeAgencyStatus ? "$0" : "--",
      remainingTotalSort: currentContract?.total ?? (freeAgencyStatus ? 0 : null),
      originalAav: formatMoney(originalContract?.averageAnnualValue),
      originalAavSort: originalContract?.averageAnnualValue ?? null,
      currentAav: currentContract ? formatMoney(currentContract.averageAnnualValue) : freeAgencyStatus ? "$0" : "--",
      currentAavSort: currentContract?.averageAnnualValue ?? (freeAgencyStatus ? 0 : null),
      guaranteed: formatMoney(row.guaranteedAmount, "Unavailable"),
      guaranteedSort: row.guaranteedAmount,
      guaranteedClass: row.needsFollowup ? "font-black text-slate-600" : "",
    };
    return contractSeasons.reduce<StatTableRow>((contractRow, contractSeason) => {
      const key = contractSalaryKey(contractSeason);
      const amount = row.salaryBySeason[contractSeason];
      const detail = displayContractDetail(contractSeason, row.optionsBySeason[contractSeason], row.guaranteeStatusBySeason[contractSeason]);
      const code = optionCode(detail);
      contractRow[key] = amount === undefined ? "--" : `${formatMoney(amount)}${code ? ` ${code}` : ""}`;
      contractRow[`${key}CapPct`] = formatSalaryCapShare(amount, contractSeason);
      contractRow[`${key}Sort`] = contractSalarySortValue(row, contractSeason);
      contractRow[`${key}Class`] = optionClassName(detail);
      return contractRow;
    }, base);
  });
}

function teamFinanceRows(rows: PlayerContractRow[], season: ContractSeason): StatTableRow[] {
  return nbaTeams
    .map((team) => {
      const contracts = rows.filter((row) => row.teamAbbreviation === team.abbreviation);
      const activeContracts = contracts.filter((row) => typeof row.salaryBySeason[season] === "number");
      const payroll = activeContracts.reduce((sum, row) => sum + (row.salaryBySeason[season] ?? 0), 0);
      const guaranteed = contracts.reduce((sum, row) => sum + (row.guaranteedAmount ?? 0), 0);
      const topContract = activeContracts
        .slice()
        .sort((left, right) => (right.salaryBySeason[season] ?? 0) - (left.salaryBySeason[season] ?? 0))[0];
      const topSalary = topContract?.salaryBySeason[season];
      const capPosition = formatCapPosition(payroll, season);
      return {
        team: `${team.city} ${team.name}`,
        href: `/teams/${team.slug}`,
        logo: nbaTeamLogoUrl(team.id),
        logoAlt: `${team.city} ${team.name} logo`,
        abbr: team.abbreviation,
        conf: team.conference,
        division: team.division,
        teamAccent: teamAccentColor(team),
        contractedPlayers: activeContracts.length,
        contractedPlayersSort: activeContracts.length,
        payroll: formatMoney(payroll),
        payrollSort: payroll,
        payrollCapPct: formatSalaryCapShare(payroll, season),
        capPosition: capPosition.value,
        capPositionSort: capPosition.sort,
        capLineSub: capPosition.sub ? `${capPosition.sub} cap` : "",
        topSalary: formatMoney(topSalary),
        topSalarySort: topSalary ?? null,
        topPlayer: topContract?.playerName ?? "",
        guaranteed: guaranteed > 0 ? formatMoney(guaranteed) : "Unavailable",
        guaranteedSort: guaranteed > 0 ? guaranteed : null,
      };
    })
    .sort((left, right) => Number(right.payrollSort ?? 0) - Number(left.payrollSort ?? 0));
}

async function TeamFinanceView({ season }: { season: ContractSeason }) {
  const contractResult = await listPlayerContracts({ season, all: true, pageSize: 1000, sort: "selected_salary", order: "desc" });
  const rows = teamFinanceRows(contractResult.rows, season);
  const totalPayroll = rows.reduce((sum, row) => sum + Number(row.payrollSort ?? 0), 0);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Finance Desk"
        title="Team Finances"
        description={`Committed ${selectedSeasonLabel(season)} salary, cap share, top salary, and guaranteed money by team.`}
      />
      <FinanceControls mode="teams" season={season} />
      <div data-data-source={contractResult.meta.source} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{rows.length}</strong> teams with <strong className="text-ink">{formatMoney(totalPayroll)}</strong> in tracked {selectedSeasonLabel(season)} payroll.
      </div>
      <StatTable
        columns={teamFinanceColumns}
        rows={rows}
        layout="fixed"
        minWidth={teamFinanceMinWidth}
        rowAccentColorKey="teamAccent"
        rowAccentColumnKey="team"
      />
    </div>
  );
}

async function PlayerFinanceView({ season }: { season: ContractSeason }) {
  const contractResult = await listPlayerContracts({ season, all: true, pageSize: 1000, sort: "selected_salary", order: "desc" });
  const rows = playerFinanceRows(contractResult.rows, season);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Finance Desk"
        title="Player Contracts"
        description={`All-player ${selectedSeasonLabel(season)} contract view with annual salary, cap share, option status, and guaranteed money.`}
      />
      <FinanceControls mode="players" season={season} />
      <div data-data-source={contractResult.meta.source} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{contractResult.meta.total}</strong> contract/free-agent rows for {selectedSeasonLabel(season)}.
      </div>
      <ContractLegend />
      <StatTable
        columns={playerFinanceColumns(season)}
        rows={rows}
        layout="fixed"
        minWidth={playerFinanceMinWidth}
        rowAccentColorKey="teamAccent"
        rowAccentColumnKey="player"
      />
    </div>
  );
}

export default async function FinancesPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const mode = parseFinanceMode(singleParam(resolvedSearchParams, "mode"));
  const season = parseContractSeason(singleParam(resolvedSearchParams, "season"));

  if (mode === "teams") return <TeamFinanceView season={season} />;
  if (mode === "players") return <PlayerFinanceView season={season} />;
  return <FinanceChooser season={season} />;
}
