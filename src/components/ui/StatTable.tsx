"use client";

import Link from "next/link";
import Image from "next/image";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type Row, type SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { compareStatTableValues } from "@/lib/tableSorting";

export type StatTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
  minWidth?: string;
  truncate?: boolean;
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
      {failed ? <span aria-hidden="true">{fallback}</span> : null}
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

function alignmentClasses(align?: StatTableColumn["align"]) {
  if (align === "right") {
    return {
      cell: "text-right tabular-nums",
      header: "text-right",
      button: "justify-end",
      icon: ""
    };
  }
  if (align === "center") {
    return {
      cell: "text-center tabular-nums",
      header: "text-center",
      button: "justify-center",
      icon: "absolute right-0"
    };
  }
  return {
    cell: "text-left",
    header: "text-left",
    button: "justify-start",
    icon: ""
  };
}

export function StatTable({
  columns,
  rows,
  dense = false,
  layout = "auto",
  minWidth
}: {
  columns: StatTableColumn[];
  rows: StatTableRow[];
  dense?: boolean;
  layout?: "auto" | "fixed";
  minWidth?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const hasColumnSizing = columns.some((column) => column.width || column.minWidth);
  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        accessorKey: column.key,
        header: column.label,
        sortingFn: (rowA: Row<StatTableRow>, rowB: Row<StatTableRow>, columnId: string) =>
          compareStatTableValues(rowA.getValue(columnId), rowB.getValue(columnId)),
        cell: (info: { getValue: () => unknown; row: { original: StatTableRow } }) => {
          const value = info.getValue();
          const formatted = value === null || value === undefined ? "N/A" : String(value);
          const href = column.hrefKey ? info.row.original[column.hrefKey] : undefined;
          const imageUrl = column.imageKey ? info.row.original[column.imageKey] : undefined;
          const imageAlt = column.imageAltKey ? info.row.original[column.imageAltKey] : undefined;
          const imageFallback = column.imageFallbackKey ? info.row.original[column.imageFallbackKey] : undefined;
          const content = (
            <span className={imageUrl ? `inline-flex min-h-7 max-w-full items-center gap-2 ${column.truncate ? "min-w-0" : ""}` : column.truncate ? "block truncate" : undefined}>
              {imageUrl ? (
                <CellImage
                  src={String(imageUrl)}
                  alt={imageAlt ? String(imageAlt) : ""}
                  fallback={imageFallback ? String(imageFallback) : ""}
                />
              ) : null}
              <span className={column.truncate ? "min-w-0 truncate" : undefined}>{formatted}</span>
            </span>
          );
          return href ? <Link href={String(href)} className={`font-bold text-signal hover:underline ${column.truncate ? "block truncate" : ""}`}>{content}</Link> : content;
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
      <table
        className={`w-full min-w-full border-collapse text-sm ${layout === "fixed" ? "table-fixed" : ""}`}
        style={minWidth ? { minWidth } : undefined}
      >
        {hasColumnSizing ? (
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width || column.minWidth ? { width: column.width, minWidth: column.minWidth } : undefined} />
            ))}
          </colgroup>
        ) : null}
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const align = alignmentClasses(columns[index]?.align);
                return (
                  <th
                    key={header.id}
                    className={`h-11 overflow-hidden whitespace-nowrap border-b border-slate-200 px-3 align-middle ${dense ? "py-2" : "py-3"} font-black ${align.header}`}
                  >
                    <button type="button" onClick={header.column.getToggleSortingHandler()} className={`relative inline-flex w-full items-center gap-1 ${align.button}`}>
                      <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <span className={`shrink-0 text-slate-400 ${align.icon}`}>{header.column.getIsSorted() === "asc" ? "▲" : header.column.getIsSorted() === "desc" ? "▼" : ""}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              {row.getVisibleCells().map((cell, index) => {
                const align = alignmentClasses(columns[index]?.align);
                return (
                  <td key={cell.id} className={`h-14 overflow-hidden whitespace-nowrap px-3 align-middle ${dense ? "py-2" : "py-3"} ${align.cell}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
