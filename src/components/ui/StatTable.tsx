"use client";

import Link from "next/link";
import Image from "next/image";
import { flexRender, getCoreRowModel, useReactTable, type Row, type SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { compareStatTableValues, compareStatTableValuesForSort } from "@/lib/tableSorting";

export type StatTableColumn = {
  key: string;
  label: string;
  group?: string;
  align?: "left" | "right" | "center";
  width?: string;
  minWidth?: string;
  truncate?: boolean;
  sortOrder?: string[];
  hrefKey?: string;
  imageKey?: string;
  imageAltKey?: string;
  imageFallbackKey?: string;
};

export type StatTableRow = Record<string, string | number | null | undefined>;

function rgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(15, 118, 110, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rowAccentStyle(value: StatTableRow[string]) {
  if (typeof value !== "string" || !value) return undefined;
  return {
    background: `linear-gradient(90deg, ${rgba(value, 0.2)} 0%, ${rgba(value, 0.12)} 38%, rgba(255, 255, 255, 0.96) 74%, #ffffff 100%)`,
  };
}

function CellImage({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-grid h-8 w-8 shrink-0 place-items-center overflow-hidden bg-transparent text-[9px] font-black text-slate-500">
      {failed ? <span aria-hidden="true" className="leading-none">{fallback}</span> : null}
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          width={32}
          height={32}
          className={`h-8 w-8 object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
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

function groupBoundaryClasses(columns: StatTableColumn[], index: number) {
  const group = columns[index]?.group;
  if (!group) return "";
  const startsGroup = index === 0 || columns[index - 1]?.group !== group;
  const endsGroup = index === columns.length - 1 || columns[index + 1]?.group !== group;
  return `${startsGroup ? "border-l border-slate-300" : ""} ${endsGroup ? "border-r border-slate-300" : ""}`;
}

function columnGroups(columns: StatTableColumn[]) {
  return columns.reduce<Array<{ label: string; start: number; span: number }>>((groups, column, index) => {
    const label = column.group ?? "";
    const previous = groups[groups.length - 1];
    if (previous && previous.label === label) {
      previous.span += 1;
      return groups;
    }
    groups.push({ label, start: index, span: 1 });
    return groups;
  }, []);
}

export function StatTable({
  columns,
  rows,
  dense = false,
  layout = "auto",
  minWidth,
  rowAccentColorKey,
  rowAccentColumnKey
}: {
  columns: StatTableColumn[];
  rows: StatTableRow[];
  dense?: boolean;
  layout?: "auto" | "fixed";
  minWidth?: string;
  rowAccentColorKey?: string;
  rowAccentColumnKey?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const hasColumnSizing = columns.some((column) => column.width || column.minWidth);
  const hasColumnGroups = columns.some((column) => column.group);
  const groups = useMemo(() => columnGroups(columns), [columns]);
  const sortedRows = useMemo(() => {
    if (sorting.length === 0) return rows;

    return rows.slice().sort((a, b) => {
      for (const sort of sorting) {
        const column = columns.find((item) => item.key === sort.id);
        const compared = compareStatTableValuesForSort(a[sort.id], b[sort.id], sort.desc ? "desc" : "asc", column?.sortOrder);
        if (compared !== 0) return compared;
      }
      return 0;
    });
  }, [columns, rows, sorting]);
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
    data: sortedRows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel()
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
          {hasColumnGroups ? (
            <tr className="bg-white">
              {groups.map((group) => (
                <th key={`${group.label}-${group.start}`} colSpan={group.span} className="border-b border-slate-200 px-1 pt-2 align-bottom">
                  {group.label ? (
                    <div className="flex min-h-7 items-center justify-center gap-2 overflow-hidden rounded-t border border-b-0 border-slate-300 bg-slate-50 px-2 text-[10px] font-black tracking-normal text-slate-500">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
                      <span className="min-w-0 truncate">{group.label}</span>
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          ) : null}
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const align = alignmentClasses(columns[index]?.align);
                const groupBoundary = groupBoundaryClasses(columns, index);
                return (
                  <th
                    key={header.id}
                    className={`h-11 overflow-hidden whitespace-nowrap border-b border-slate-200 px-3 align-middle ${dense ? "py-2" : "py-3"} font-black ${align.header} ${groupBoundary}`}
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
                const column = columns[index];
                const align = alignmentClasses(column?.align);
                const groupBoundary = groupBoundaryClasses(columns, index);
                const accentStyle = rowAccentColorKey && (rowAccentColumnKey ?? columns[0]?.key) === column?.key
                  ? rowAccentStyle(row.original[rowAccentColorKey])
                  : undefined;
                return (
                  <td key={cell.id} style={accentStyle} className={`h-14 overflow-hidden whitespace-nowrap px-3 align-middle ${dense ? "py-2" : "py-3"} ${align.cell} ${groupBoundary}`}>
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
