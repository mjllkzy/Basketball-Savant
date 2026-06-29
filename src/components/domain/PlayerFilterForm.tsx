"use client";

import { useState } from "react";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { defaultMinGames, defaultMinMinutes, maxMinGames, maxMinMinutes } from "@/lib/playerFilters";
import type { PlayerStatView } from "@/lib/playerStatViews";

type Option = {
  label: string;
  value: string;
};

type PlayerFilterFormProps = {
  q?: string;
  teamId?: string;
  position?: string;
  statView: PlayerStatView;
  season: string;
  seasonType: string;
  minMinutes: number;
  minGames: number;
  seasons: Option[];
  seasonTypes: Option[];
  teamOptions: Option[];
  positionOptions: string[];
};

const playerSearchResultTypes = ["player"] as const;

export function PlayerFilterForm({
  q,
  teamId,
  position,
  statView,
  season,
  seasonType,
  minMinutes,
  minGames,
  seasons,
  seasonTypes,
  teamOptions,
  positionOptions
}: PlayerFilterFormProps) {
  const [view, setView] = useState<PlayerStatView>(statView);
  const [minutes, setMinutes] = useState(minMinutes);
  const [games, setGames] = useState(minGames);

  return (
    <form className="grid gap-4 rounded border border-slate-200 bg-white p-4 shadow-sm" method="get" action="/players">
      <div className="grid gap-3 md:grid-cols-3">
        <SmartSearchInput
          name="q"
          defaultValue={q}
          placeholder="Search player"
          resultTypes={playerSearchResultTypes}
          noMatchesText="No matching players"
          labelClassName="min-h-10 px-3 py-0"
        />
        <select name="season" defaultValue={season} aria-label="Season" className="rounded border border-slate-300 px-3 py-2 text-sm">
          {seasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="seasonType" defaultValue={seasonType} aria-label="Season type" className="rounded border border-slate-300 px-3 py-2 text-sm">
          {seasonTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="teamId" defaultValue={teamId ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All teams</option>
          {teamOptions.map((team) => <option key={team.value} value={team.value}>{team.label}</option>)}
        </select>
        <select name="position" defaultValue={position ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All positions</option>
          {positionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="view" value={view} onChange={(event) => setView(event.target.value as PlayerStatView)} aria-label="Stat view" className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="standard">Standard Stats</option>
          <option value="advanced">Advanced Stats</option>
          <option value="contracts">Contracts</option>
        </select>
        <button className="min-h-10 rounded bg-ink px-3 py-2 text-sm font-black text-white md:col-span-3">Apply</button>
      </div>

      {view !== "contracts" ? (
        <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Minimum Total Minutes
            <strong className="rounded bg-white px-2 py-1 text-ink shadow-sm">{minutes.toLocaleString()}+</strong>
          </span>
          <input
            type="range"
            name="minMinutes"
            min={0}
            max={maxMinMinutes}
            step={50}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="accent-signal"
          />
          <span className="text-xs text-slate-500">Default baseline: {defaultMinMinutes.toLocaleString()} total minutes</span>
        </label>

        <label className="grid gap-2">
          <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Minimum Games Played
            <strong className="rounded bg-white px-2 py-1 text-ink shadow-sm">{games}+</strong>
          </span>
          <input
            type="range"
            name="minGames"
            min={0}
            max={maxMinGames}
            step={1}
            value={games}
            onChange={(event) => setGames(Number(event.target.value))}
            className="accent-signal"
          />
          <span className="text-xs text-slate-500">Default baseline: {defaultMinGames} games</span>
        </label>
        </div>
      ) : null}
    </form>
  );
}
