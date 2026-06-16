"use client";

import Link from "next/link";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";

export type StatTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  hrefKey?: string;
};

export type StatTableRow = Record<string, string | number | null | undefined>;

export function StatTable({ columns, rows, dense = false }: { columns: StatTableColumn[]; rows: StatTableRow[]; dense?: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        accessorKey: column.key,
        header: column.label,
        cell: (info: { getValue: () => unknown; row: { original: StatTableRow } }) => {
          const value = info.getValue();
          const formatted = value === null || value === undefined ? "N/A" : String(value);
          const href = column.hrefKey ? info.row.original[column.hrefKey] : undefined;
          return href ? (
            <Link href={String(href)} className="font-bold text-signal hover:underline">
              {formatted}
            </Link>
          ) : (
            formatted
          );
        }
      })),
    [columns]
  );
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`whitespace-nowrap border-b border-slate-200 px-3 ${dense ? "py-2" : "py-3"} text-left font-black ${columns[index]?.align === "right" ? "text-right" : columns[index]?.align === "center" ? "text-center" : ""}`}
                >
                  <button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <span className="text-slate-400">{header.column.getIsSorted() === "asc" ? "▲" : header.column.getIsSorted() === "desc" ? "▼" : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              {row.getVisibleCells().map((cell, index) => (
                <td key={cell.id} className={`whitespace-nowrap px-3 ${dense ? "py-2" : "py-3"} ${columns[index]?.align === "right" ? "text-right tabular-nums" : columns[index]?.align === "center" ? "text-center" : ""}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
