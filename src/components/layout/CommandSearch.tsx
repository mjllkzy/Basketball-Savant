"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { SiteSearchResult } from "@/lib/db/search.server";

export function CommandSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/v1/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal })
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
  }, [query]);

  return (
    <div className="relative w-full max-w-xl">
      <label className="flex min-h-11 items-center gap-2 rounded border border-slate-300 bg-white px-3 shadow-sm focus-within:border-signal">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players, teams, games"
          className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
        />
      </label>
      {query.trim().length > 0 ? (
        <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded border border-slate-200 bg-white shadow-card">
          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-500">Searching...</div>
          ) : results.length ? (
            results.map((result) => (
              <Link key={`${result.type}-${result.id}`} href={result.href} onClick={() => setQuery("")} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50">
                <span className="font-semibold">{result.label}</span>
                <span className="text-xs uppercase text-slate-500">{result.type} · {result.meta}</span>
              </Link>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">No matches</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
