"use client";

import { Download } from "lucide-react";

export function ExportCsvButton({ rows, filename = "basketball-savant-export.csv" }: { rows: Array<Record<string, unknown>>; filename?: string }) {
  function exportCsv() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={exportCsv} className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-bold hover:bg-slate-50">
      <Download className="h-4 w-4" />
      Export
    </button>
  );
}
