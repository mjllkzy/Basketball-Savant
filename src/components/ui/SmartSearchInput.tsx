"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import clsx from "clsx";
import type { SiteSearchResult } from "@/lib/db/search.server";

type SearchResultType = SiteSearchResult["type"];

type SmartSearchInputProps = {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  resultTypes?: readonly SearchResultType[];
  maxResults?: number;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  showIcon?: boolean;
  noMatchesText?: string;
};

export function SmartSearchInput({
  name,
  defaultValue = "",
  placeholder,
  resultTypes,
  maxResults = 8,
  className,
  labelClassName,
  inputClassName,
  dropdownClassName,
  showIcon = true,
  noMatchesText = "No matches"
}: SmartSearchInputProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: normalized,
        limit: String(maxResults)
      });
      resultTypes?.forEach((type) => params.append("type", type));

      setLoading(true);
      void fetch(`/api/v1/search?${params.toString()}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Search failed")))
        .then((payload: { data?: SiteSearchResult[] }) => setResults(payload.data ?? []))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [maxResults, query, resultTypes]);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className={clsx("relative", className)}>
      <label
        className={clsx("flex min-h-11 items-center gap-2 rounded border border-slate-300 bg-white px-3 shadow-sm focus-within:border-signal", labelClassName)}
      >
        {showIcon ? <Search className="h-4 w-4 shrink-0 text-slate-500" /> : null}
        <input
          name={name}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={clsx("h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none", inputClassName)}
        />
      </label>
      {showDropdown ? (
        <div
          className={clsx("absolute left-0 right-0 top-12 z-50 overflow-hidden rounded border border-slate-200 bg-white shadow-card", dropdownClassName)}
          onMouseDown={(event) => event.preventDefault()}
        >
          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-500">Searching...</div>
          ) : results.length ? (
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-semibold">{result.label}</span>
                <span className="shrink-0 text-xs uppercase text-slate-500">{result.type} · {result.meta}</span>
              </Link>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">{noMatchesText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
