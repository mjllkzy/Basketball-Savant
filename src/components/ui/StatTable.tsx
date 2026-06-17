"use client";

import Link from "next/link";
import Image from "next/image";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";

export type StatTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  hrefKey?: string;
  imageKey?: string;
  imageAltKey?: string;
  imageFallbackKey?: string;
};

export type StatTableRow = Record<string, string | number | null | undefined>;

function CellImage({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative inline-grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-[9px] font-black text-slate-500">
      <span aria-hidden="true">{fallback}</span>
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          width={28}
          height={28}
          className={`absolute inset-0 h-7 w-7 object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          unoptimized
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}

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
          const imageUrl = column.imageKey ? info.row.original[column.imageKey] : undefined;
          const imageAlt = column.imageAltKey ? info.row.original[column.imageAltKey] : undefined;
          const imageFallback = column.imageFallbackKey ? info.row.original[column.imageFallbackKey] : undefined;
          const content = (
            <span className={imageUrl ? "inline-flex min-h-7 items-center gap-2" : undefined}>
              {imageUrl ? (
                <CellImage
                  src={String(imageUrl)}
                  alt={imageAlt ? String(imageAlt) : ""}
                  fallback={imageFallback ? String(imageFallback) : ""}
                />
              ) : null}
              <span>{formatted}</span>
            </span>
          );
          return href ? <Link href={String(href)} className="font-bold text-signal hover:underline">{content}</Link> : content;
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
