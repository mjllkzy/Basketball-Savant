"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";

type Option = {
  label: string;
  value: string;
};

type DivisionOption = Option & {
  conference: "East" | "West";
};

type TeamFilterFormProps = {
  q?: string;
  season: string;
  seasonType: string;
  conference?: string;
  division?: string;
  month?: string;
  seasons: Option[];
  seasonTypes: Option[];
  conferences: Option[];
  divisions: DivisionOption[];
  months: Option[];
};

const teamSearchResultTypes = ["team"] as const;

export function TeamFilterForm({
  q,
  season,
  seasonType,
  conference,
  division,
  month,
  seasons,
  seasonTypes,
  conferences,
  divisions,
  months
}: TeamFilterFormProps) {
  const [selectedConference, setSelectedConference] = useState(conference ?? "");
  const [selectedDivision, setSelectedDivision] = useState(division ?? "");
  useEffect(() => setSelectedConference(conference ?? ""), [conference]);
  useEffect(() => setSelectedDivision(division ?? ""), [division]);
  const allPeriodLabel = seasonType === "Playoffs" ? "All playoffs" : "Full season";

  const visibleDivisions = useMemo(
    () => selectedConference
      ? divisions.filter((option) => option.conference === selectedConference)
      : divisions,
    [divisions, selectedConference],
  );

  function handleConferenceChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextConference = event.target.value;
    setSelectedConference(nextConference);
    setSelectedDivision((currentDivision) => {
      if (!currentDivision || !nextConference) return currentDivision;
      const divisionOption = divisions.find((option) => option.value === currentDivision);
      return divisionOption?.conference === nextConference ? currentDivision : "";
    });
  }

  return (
    <form className="grid gap-4 rounded border border-slate-200 bg-white p-4 shadow-sm" method="get" action="/teams">
      <div className="grid gap-3 md:grid-cols-3">
        <SmartSearchInput
          name="q"
          defaultValue={q}
          placeholder="Search team"
          resultTypes={teamSearchResultTypes}
          noMatchesText="No matching teams"
          labelClassName="min-h-10 px-3 py-0"
        />
        <select name="season" defaultValue={season} aria-label="Season" className="rounded border border-slate-300 px-3 py-2 text-sm">
          {seasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="seasonType" defaultValue={seasonType} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {seasonTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="conference" value={selectedConference} onChange={handleConferenceChange} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All conferences</option>
          {conferences.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="division" value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All divisions</option>
          {visibleDivisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="month" defaultValue={month ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">{allPeriodLabel}</option>
          {months.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="min-h-10 rounded bg-ink px-3 py-2 text-sm font-black text-white md:col-span-3">Apply</button>
      </div>
    </form>
  );
}
