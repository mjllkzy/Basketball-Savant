import type { Metadata } from "next";
import type { Team } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Landmark, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn, type StatTableRow } from "@/components/ui/StatTable";
import { tableColumnWidths, tableMinWidth } from "@/components/ui/tableSizing";
import { nbaTeams } from "@/lib/data/nbaTeams";
import {
  contractSeasons,
  contractDealSummary,
  contractSalarySortValue,
  freeAgencyStatusForSeason,
  hasNonRosterContractForSeason,
  hasTwoWayContractForSeason,
  listPlayerContracts,
  selectActiveContractDeal,
  summarizeContractSalaries,
  summarizeTotalRemainingContract,
  type ContractSeason,
  type PlayerContractRow,
} from "@/lib/db/playerContracts.server";
import { UPCOMING_SEASON, baseSeasonOptions } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { nbaTeamLogoUrl, teamAccentColor } from "@/lib/teamBranding";

export const revalidate = 300;

type FinanceMode = "overview" | "teams" | "players";

const defaultFinanceSeason = UPCOMING_SEASON as ContractSeason;
const entityColumnWidth = tableColumnWidths.entity;
const compactColumnWidth = tableColumnWidths.compact;
const contractSummaryColumnWidth = tableColumnWidths.summary;
const moneyColumnWidth = tableColumnWidths.money;
const salaryColumnWidth = tableColumnWidths.salary;
const actionColumnWidth = tableColumnWidths.action;
const divisionColumnWidth = tableColumnWidths.division;
const guaranteedColumnWidth = tableColumnWidths.guaranteed;
const pastSalaryHeaderClassName = "bg-slate-200/80 text-slate-500";
const pastSalaryCellClassName = "bg-slate-100/60 text-slate-500";
const teamPrimaryColorByAbbreviation = new Map(nbaTeams.map((team) => [team.abbreviation, team.primaryColor]));
const salaryCapBySeason: Partial<Record<ContractSeason, number>> = {
  "2025-26": 154_647_000,
  "2026-27": 164_961_000,
};
const standardRosterLimitBySeason: Partial<Record<ContractSeason, number>> = {
  "2025-26": 15,
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
  const season = value?.trim();
  return season && contractSeasons.includes(season as ContractSeason) ? (season as ContractSeason) : defaultFinanceSeason;
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

function financeHref(mode: Exclude<FinanceMode, "overview">, season: ContractSeason, teamId?: string) {
  const params = new URLSearchParams({ mode, season });
  if (teamId) params.set("teamId", teamId);
  return `/finances?${params.toString()}`;
}

function identityColumn(key: string, label: string, width: string = compactColumnWidth, group = "Profile"): StatTableColumn {
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
    { key: "originalYears", label: "Orig Yrs", group: "Contract Summary", align: "center", width: contractSummaryColumnWidth, sortValueKey: "originalYearsSort" },
    { key: "remainingYears", label: "Time Left", group: "Contract Summary", align: "center", width: contractSummaryColumnWidth, sortValueKey: "remainingYearsSort", subValueKey: "remainingYearsSub", subValueClassName: "text-rose-700", noteValueKey: "remainingYearsNote", noteValueClassName: "text-cyan-700", valueClassNameKey: "remainingYearsClass" },
    { key: "originalTotal", label: "Orig Total", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "originalTotalSort" },
    { key: "remainingTotal", label: "Money Left", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "remainingTotalSort" },
    { key: "originalAav", label: "Orig AAV", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "originalAavSort" },
    { key: "currentAav", label: "Current AAV", group: "Contract Summary", align: "center", width: moneyColumnWidth, sortValueKey: "currentAavSort" },
    ...contractSeasons.map((contractSeason) => contractSalaryColumn(contractSeason, selectedSeason)),
    { key: "guaranteed", label: "Guaranteed", group: "Guaranteed Money", align: "center", width: guaranteedColumnWidth, sortValueKey: "guaranteedSort", valueClassNameKey: "guaranteedClass" },
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
  { key: "breakdown", label: "Breakdown", group: "Team", align: "center", width: actionColumnWidth, hrefKey: "breakdownHref", hrefVariant: "button", valueClassNameKey: "breakdownClass" },
  identityColumn("conf", "Conf", compactColumnWidth, "Team"),
  identityColumn("division", "Division", divisionColumnWidth, "Team"),
  { key: "contractedPlayers", label: "Players", group: "Roster Money", align: "center", width: compactColumnWidth, sortValueKey: "contractedPlayersSort" },
  { key: "payroll", label: "Payroll", group: "Roster Money", align: "center", width: moneyColumnWidth, sortValueKey: "payrollSort", subValueKey: "payrollCapPct" },
  { key: "capPosition", label: "Cap Position", group: "Roster Money", align: "center", width: actionColumnWidth, sortValueKey: "capPositionSort", subValueKey: "capLineSub", subValueClassName: "text-slate-500" },
  { key: "topSalary", label: "Top Salary", group: "Top Contract", align: "center", width: moneyColumnWidth, sortValueKey: "topSalarySort", subValueKey: "topPlayer", subValueClassName: "text-signal" },
  { key: "guaranteed", label: "Guaranteed", group: "Guaranteed Money", align: "center", width: guaranteedColumnWidth, sortValueKey: "guaranteedSort" },
];

const teamFinanceMinWidth = tableMinWidth(teamFinanceColumns);

const contractLegend = [
  { label: "Player option", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { label: "Team option", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { label: "Mutual option", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { label: "Non/partial guarantee", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { label: "Two-way", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
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
      <div className="grid min-h-[calc(100vh-280px)] grid-cols-[repeat(2,minmax(280px,1fr))] gap-4 overflow-x-auto pb-1">
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

function FinanceControls({ mode, season, teamId }: { mode: Exclude<FinanceMode, "overview">; season: ContractSeason; teamId?: string }) {
  return (
    <section className="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.08em]">
        <Link
          href={financeHref("teams", season, teamId)}
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
        {teamId ? <input type="hidden" name="teamId" value={teamId} /> : null}
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
    const twoWayContract = hasTwoWayContractForSeason(row, season);
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
      remainingYearsNote: twoWayContract ? "Two-way" : "",
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

function hasSelectedSeasonSalary(row: PlayerContractRow, season: ContractSeason) {
  return typeof row.salaryBySeason[season] === "number";
}

function isSelectedSeasonBookOnly(row: PlayerContractRow, season: ContractSeason) {
  return hasSelectedSeasonSalary(row, season) && !row.playerSlug;
}

function isSelectedSeasonTwoWay(row: PlayerContractRow, season: ContractSeason) {
  return hasSelectedSeasonSalary(row, season) && hasTwoWayContractForSeason(row, season);
}

function isSelectedSeasonNonRoster(row: PlayerContractRow, season: ContractSeason) {
  return hasSelectedSeasonSalary(row, season) && (!row.position || hasNonRosterContractForSeason(row, season));
}

function isSelectedSeasonStandardRosterCandidate(row: PlayerContractRow, season: ContractSeason) {
  return (
    hasSelectedSeasonSalary(row, season) &&
    !isSelectedSeasonBookOnly(row, season) &&
    !isSelectedSeasonTwoWay(row, season) &&
    !isSelectedSeasonNonRoster(row, season)
  );
}

function isSelectedSeasonFreeAgent(row: PlayerContractRow, season: ContractSeason) {
  return !hasSelectedSeasonSalary(row, season) && Boolean(freeAgencyStatusForSeason(row.contractDeals, season));
}

function sortContractsBySeasonSalary(rows: PlayerContractRow[], season: ContractSeason) {
  return rows
    .slice()
    .sort((left, right) => (contractSalarySortValue(right, season) ?? Number.NEGATIVE_INFINITY) - (contractSalarySortValue(left, season) ?? Number.NEGATIVE_INFINITY) || left.playerName.localeCompare(right.playerName));
}

function guaranteedSalaryForSeason(row: PlayerContractRow, season: ContractSeason) {
  const amount = row.salaryBySeason[season];
  if (typeof amount !== "number" || !Number.isFinite(amount)) return 0;

  const detail = displayContractDetail(season, row.optionsBySeason[season], row.guaranteeStatusBySeason[season]);
  const kind = optionKind(detail);
  if (kind === "player" || kind === "team" || kind === "mutual" || kind === "guarantee" || kind === "unknown") return 0;
  return amount;
}

function teamContractsForSeason(rows: PlayerContractRow[], team: Team, season: ContractSeason) {
  const contracts = rows.filter((row) => row.teamAbbreviation === team.abbreviation);
  const activeContracts = contracts.filter((row) => hasSelectedSeasonSalary(row, season));
  const bookOnlyContracts = activeContracts.filter((row) => isSelectedSeasonBookOnly(row, season));
  const twoWayContracts = activeContracts.filter((row) => !isSelectedSeasonBookOnly(row, season) && isSelectedSeasonTwoWay(row, season));
  const explicitNonRosterContracts = activeContracts.filter(
    (row) => !isSelectedSeasonBookOnly(row, season) && !isSelectedSeasonTwoWay(row, season) && isSelectedSeasonNonRoster(row, season),
  );
  const rosterCandidates = sortContractsBySeasonSalary(
    activeContracts.filter((row) => isSelectedSeasonStandardRosterCandidate(row, season)),
    season,
  );
  const standardRosterLimit = standardRosterLimitBySeason[season];
  const rosteredContracts = standardRosterLimit ? rosterCandidates.slice(0, standardRosterLimit) : rosterCandidates;
  const overflowNonRosterContracts = standardRosterLimit ? rosterCandidates.slice(standardRosterLimit) : [];
  const nonRosterContracts = [...explicitNonRosterContracts, ...overflowNonRosterContracts];
  const payroll = activeContracts.reduce((sum, row) => sum + (row.salaryBySeason[season] ?? 0), 0);
  const guaranteed = activeContracts.reduce((sum, row) => sum + guaranteedSalaryForSeason(row, season), 0);
  const topContract = activeContracts
    .slice()
    .sort((left, right) => (right.salaryBySeason[season] ?? 0) - (left.salaryBySeason[season] ?? 0))[0];
  const topSalary = topContract?.salaryBySeason[season];
  const capPosition = formatCapPosition(payroll, season);

  return { contracts, activeContracts, rosteredContracts, bookOnlyContracts, twoWayContracts, nonRosterContracts, payroll, guaranteed, topContract, topSalary, capPosition };
}

function teamFinanceRows(rows: PlayerContractRow[], season: ContractSeason, selectedTeamId?: string): StatTableRow[] {
  return nbaTeams
    .map((team) => {
      const { rosteredContracts, payroll, guaranteed, topContract, topSalary, capPosition } = teamContractsForSeason(rows, team, season);
      const isSelected = selectedTeamId === team.id;
      return {
        team: `${team.city} ${team.name}`,
        href: `/teams/${team.slug}`,
        logo: nbaTeamLogoUrl(team.id),
        logoAlt: `${team.city} ${team.name} logo`,
        abbr: team.abbreviation,
        breakdown: isSelected ? "Viewing" : "Show breakdown",
        breakdownHref: `${financeHref("teams", season, team.id)}#team-breakdown`,
        breakdownClass: isSelected ? "text-signal" : "",
        conf: team.conference,
        division: team.division,
        teamAccent: teamAccentColor(team),
        contractedPlayers: rosteredContracts.length,
        contractedPlayersSort: rosteredContracts.length,
        payroll: formatMoney(payroll),
        payrollSort: payroll,
        payrollCapPct: formatSalaryCapShare(payroll, season),
        capPosition: capPosition.value,
        capPositionSort: capPosition.sort,
        capLineSub: capPosition.sub ? `${capPosition.sub} cap` : "",
        topSalary: formatMoney(topSalary),
        topSalarySort: topSalary ?? null,
        topPlayer: topContract?.playerName ?? "",
        guaranteed: formatMoney(guaranteed),
        guaranteedSort: guaranteed,
      };
    })
    .sort((left, right) => Number(right.payrollSort ?? 0) - Number(left.payrollSort ?? 0));
}

const teamBreakdownColumns: StatTableColumn[] = [
  { key: "season", label: "Season", group: "Cap Situation", align: "center", width: contractSummaryColumnWidth },
  { key: "players", label: "Players", group: "Cap Situation", align: "center", width: compactColumnWidth, sortValueKey: "playersSort" },
  { key: "payroll", label: "Payroll", group: "Cap Situation", align: "center", width: moneyColumnWidth, sortValueKey: "payrollSort", subValueKey: "payrollCapPct" },
  { key: "capPosition", label: "Cap Position", group: "Cap Situation", align: "center", width: actionColumnWidth, sortValueKey: "capPositionSort", subValueKey: "capLineSub", subValueClassName: "text-slate-500" },
  { key: "topSalary", label: "Top Salary", group: "Top Contract", align: "center", width: moneyColumnWidth, sortValueKey: "topSalarySort", subValueKey: "topPlayer", subValueClassName: "text-signal" },
  { key: "guaranteed", label: "Guaranteed", group: "Guaranteed Money", align: "center", width: guaranteedColumnWidth, sortValueKey: "guaranteedSort" },
];

const teamBreakdownMinWidth = tableMinWidth(teamBreakdownColumns);

function teamBreakdownRows(rows: PlayerContractRow[], team: Team): StatTableRow[] {
  return contractSeasons.map((contractSeason) => {
    const { rosteredContracts, payroll, guaranteed, topContract, topSalary, capPosition } = teamContractsForSeason(rows, team, contractSeason);
    return {
      season: contractSeason,
      players: rosteredContracts.length,
      playersSort: rosteredContracts.length,
      payroll: formatMoney(payroll),
      payrollSort: payroll,
      payrollCapPct: formatSalaryCapShare(payroll, contractSeason),
      capPosition: capPosition.value,
      capPositionSort: capPosition.sort,
      capLineSub: capPosition.sub ? `${capPosition.sub} cap` : "",
      topSalary: formatMoney(topSalary),
      topSalarySort: topSalary ?? null,
      topPlayer: topContract?.playerName ?? "",
      guaranteed: formatMoney(guaranteed),
      guaranteedSort: guaranteed,
    };
  });
}

function TeamFinanceBreakdown({ team, rows, season }: { team: Team; rows: PlayerContractRow[]; season: ContractSeason }) {
  const selectedSalarySort = contractSalaryKey(season);
  const selectedSeasonSummary = teamContractsForSeason(rows, team, season);
  const teamRows = sortContractsBySeasonSalary(rows.filter((row) => row.teamAbbreviation === team.abbreviation), season);
  const rosteredRows = selectedSeasonSummary.rosteredContracts;
  const twoWayRows = sortContractsBySeasonSalary(selectedSeasonSummary.twoWayContracts, season);
  const nonRosterRows = sortContractsBySeasonSalary([...selectedSeasonSummary.nonRosterContracts, ...selectedSeasonSummary.bookOnlyContracts], season);
  const freeAgentRows = teamRows.filter((row) => isSelectedSeasonFreeAgent(row, season));
  const yearlyRows = teamBreakdownRows(rows, team);
  const financeColumns = playerFinanceColumns(season);
  const financeMinWidth = tableMinWidth(financeColumns);
  const playerRows = playerFinanceRows(rosteredRows, season);
  const twoWayPlayerRows = playerFinanceRows(twoWayRows, season);
  const nonRosterPlayerRows = playerFinanceRows(nonRosterRows, season);
  const freeAgentPlayerRows = playerFinanceRows(freeAgentRows, season);

  return (
    <section id="team-breakdown" className="grid scroll-mt-6 gap-4 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center">
            <Image src={nbaTeamLogoUrl(team.id)} alt={`${team.city} ${team.name} logo`} width={48} height={48} className="h-12 w-12 object-contain" unoptimized />
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-signal">Team Breakdown</div>
            <h2 className="text-2xl font-black tracking-normal text-ink">{team.city} {team.name}</h2>
            <p className="text-sm text-slate-600">
              {formatMoney(selectedSeasonSummary.payroll)} tracked {selectedSeasonLabel(season)} payroll across {selectedSeasonSummary.rosteredContracts.length} rostered players.
            </p>
          </div>
        </div>
        <Link
          href={`/players?season=${encodeURIComponent(season)}&seasonType=Regular+Season&teamId=${encodeURIComponent(team.id)}&position=&view=contracts`}
          className="inline-flex min-h-10 items-center justify-center rounded bg-ink px-4 text-sm font-black text-white hover:bg-slate-800"
        >
          Open player contracts
        </Link>
      </div>
      <StatTable
        dense
        columns={teamBreakdownColumns}
        rows={yearlyRows}
        layout="fixed"
        minWidth={teamBreakdownMinWidth}
      />
      <div className="border-t border-slate-200 pt-4">
        <div className="mb-3">
          <h3 className="text-lg font-black tracking-normal text-ink">{selectedSeasonLabel(season)} Rostered Contracts</h3>
          <p className="text-sm text-slate-600">Players with active {selectedSeasonLabel(season)} salary counting toward tracked team payroll.</p>
        </div>
        <StatTable
          columns={financeColumns}
          rows={playerRows}
          layout="fixed"
          minWidth={financeMinWidth}
          initialSorting={[{ id: selectedSalarySort, desc: true }]}
          rowAccentColorKey="teamAccent"
          rowAccentColumnKey="player"
        />
      </div>
      {twoWayPlayerRows.length > 0 ? (
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-black tracking-normal text-ink">{selectedSeasonLabel(season)} Two-Way Contracts</h3>
            <p className="text-sm text-slate-600">Two-way contracts are tagged separately and do not count toward the standard roster total.</p>
          </div>
          <StatTable
            columns={financeColumns}
            rows={twoWayPlayerRows}
            layout="fixed"
            minWidth={financeMinWidth}
            initialSorting={[{ id: selectedSalarySort, desc: true }]}
            rowAccentColorKey="teamAccent"
            rowAccentColumnKey="player"
          />
        </div>
      ) : null}
      {nonRosterPlayerRows.length > 0 ? (
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-black tracking-normal text-ink">{selectedSeasonLabel(season)} On-Books, Not Rostered</h3>
            <p className="text-sm text-slate-600">Salary rows outside the standard roster count, separated from active players while still counting toward tracked payroll.</p>
          </div>
          <StatTable
            columns={financeColumns}
            rows={nonRosterPlayerRows}
            layout="fixed"
            minWidth={financeMinWidth}
            initialSorting={[{ id: selectedSalarySort, desc: true }]}
            rowAccentColorKey="teamAccent"
            rowAccentColumnKey="player"
          />
        </div>
      ) : null}
      {freeAgentPlayerRows.length > 0 ? (
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-black tracking-normal text-ink">{selectedSeasonLabel(season)} Free Agents</h3>
            <p className="text-sm text-slate-600">Expired team-linked contracts separated from rostered payroll so they do not read as active players.</p>
          </div>
          <StatTable
            columns={financeColumns}
            rows={freeAgentPlayerRows}
            layout="fixed"
            minWidth={financeMinWidth}
            initialSorting={[{ id: selectedSalarySort, desc: true }]}
            rowAccentColorKey="teamAccent"
            rowAccentColumnKey="player"
          />
        </div>
      ) : null}
    </section>
  );
}

async function TeamFinanceView({ season, selectedTeamId }: { season: ContractSeason; selectedTeamId?: string }) {
  const selectedSalarySort = contractSalaryKey(season);
  const contractResult = await listPlayerContracts({ season, all: true, pageSize: 1000, sort: selectedSalarySort, order: "desc" });
  const selectedTeam = nbaTeams.find((team) => team.id === selectedTeamId || team.abbreviation === selectedTeamId);
  const rows = teamFinanceRows(contractResult.rows, season, selectedTeam?.id);
  const totalPayroll = rows.reduce((sum, row) => sum + Number(row.payrollSort ?? 0), 0);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Finance Desk"
        title="Team Finances"
        description={`Committed ${selectedSeasonLabel(season)} salary, cap share, top salary, and guaranteed money by team.`}
      />
      <FinanceControls mode="teams" season={season} teamId={selectedTeam?.id} />
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
      {selectedTeam ? <TeamFinanceBreakdown team={selectedTeam} rows={contractResult.rows} season={season} /> : null}
    </div>
  );
}

async function PlayerFinanceView({ season }: { season: ContractSeason }) {
  const selectedSalarySort = contractSalaryKey(season);
  const contractResult = await listPlayerContracts({ season, all: true, pageSize: 1000, sort: selectedSalarySort, order: "desc" });
  const financeColumns = playerFinanceColumns(season);
  const financeMinWidth = tableMinWidth(financeColumns);
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
        columns={financeColumns}
        rows={rows}
        layout="fixed"
        minWidth={financeMinWidth}
        initialSorting={[{ id: selectedSalarySort, desc: true }]}
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
  const selectedTeamId = singleParam(resolvedSearchParams, "teamId") ?? undefined;

  if (mode === "teams") return <TeamFinanceView season={season} selectedTeamId={selectedTeamId} />;
  if (mode === "players") return <PlayerFinanceView season={season} />;
  return <FinanceChooser season={season} />;
}
