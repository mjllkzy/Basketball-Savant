export const tableColumnWidths = {
  narrow: "72px",
  entity: "290px",
  compact: "94px",
  summary: "112px",
  money: "126px",
  salary: "126px",
  action: "180px",
  text: "160px",
  wideText: "220px",
  division: "120px",
  guaranteed: "150px",
} as const;

type TableSizingColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
  minWidth?: string;
  hrefKey?: string;
  imageKey?: string;
};

function pxValue(width: string | undefined) {
  const match = width?.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : 0;
}

export function defaultTableColumnWidth(column: TableSizingColumn) {
  const key = column.key.toLowerCase();
  const label = column.label.toLowerCase();
  const text = `${key} ${label}`;

  if (key === "rank" || label === "rk" || label === "q") return tableColumnWidths.narrow;
  if (key === "pos" || key === "conf" || key === "opp" || key === "g" || label === "+/-") return tableColumnWidths.compact;
  if (column.align === "right" || column.align === "center") return tableColumnWidths.compact;
  if (text.includes("player") || text.includes("lineup")) return tableColumnWidths.entity;
  if (column.imageKey && text.includes("team")) return tableColumnWidths.entity;
  if (text.includes("matchup") || text.includes("description") || text.includes("formula") || text.includes("context") || text.includes("notes") || text.includes("scorer")) return tableColumnWidths.wideText;
  if (text.includes("offense") || text.includes("defense") || text.includes("category") || text.includes("required data")) return tableColumnWidths.text;
  if (text.includes("metric") || text.includes("name") || text.includes("zone")) return tableColumnWidths.text;
  if (text.includes("path") || text.includes("source") || text.includes("status") || text.includes("feed") || text.includes("method")) return tableColumnWidths.text;
  if (text.includes("play type") || text.includes("shot profile")) return tableColumnWidths.text;
  return tableColumnWidths.compact;
}

export function tableMinWidth(columns: ReadonlyArray<Pick<TableSizingColumn, "width" | "minWidth">>) {
  const width = columns.reduce((sum, column) => sum + Math.max(pxValue(column.width), pxValue(column.minWidth)), 0);
  return width > 0 ? `${width}px` : undefined;
}
