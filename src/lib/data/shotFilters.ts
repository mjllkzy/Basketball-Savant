import type { Shot } from "@/lib/types";

export type ShotCollectionFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  season?: string;
  quarter?: number;
  clutch?: boolean;
  shotZone?: string;
  shotType?: string;
  playType?: string;
  result?: "made" | "missed";
  transition?: boolean;
  assisted?: boolean;
  pullUp?: boolean;
  catchAndShoot?: boolean;
  minExpectedPoints?: number;
  minActualMinusExpected?: number;
  maxActualMinusExpected?: number;
  sort?: string;
  order?: "asc" | "desc";
};

export function filterShotRows(sourceRows: Shot[], params: ShotCollectionFilters = {}) {
  let rows = [...sourceRows];
  if (params.season) rows = rows.filter((shot) => shot.season === params.season);
  if (params.quarter) rows = rows.filter((shot) => shot.quarter === params.quarter);
  if (params.clutch !== undefined) rows = rows.filter((shot) => shot.isClutch === params.clutch);
  if (params.shotZone) rows = rows.filter((shot) => shot.shotZone === params.shotZone);
  if (params.shotType) rows = rows.filter((shot) => shot.shotType === params.shotType);
  if (params.playType) rows = rows.filter((shot) => shot.playType === params.playType);
  if (params.result) rows = rows.filter((shot) => shot.made === (params.result === "made"));
  if (params.transition !== undefined) rows = rows.filter((shot) => shot.isTransition === params.transition);
  if (params.assisted !== undefined) rows = rows.filter((shot) => shot.assisted === params.assisted);
  if (params.pullUp !== undefined) rows = rows.filter((shot) => shot.isPullUp === params.pullUp);
  if (params.catchAndShoot !== undefined) rows = rows.filter((shot) => shot.isCatchAndShoot === params.catchAndShoot);
  if (params.minExpectedPoints !== undefined) rows = rows.filter((shot) => shot.expectedPoints >= params.minExpectedPoints!);
  if (params.minActualMinusExpected !== undefined) rows = rows.filter((shot) => shot.actualMinusExpected >= params.minActualMinusExpected!);
  if (params.maxActualMinusExpected !== undefined) rows = rows.filter((shot) => shot.actualMinusExpected <= params.maxActualMinusExpected!);
  if (params.q) {
    const query = params.q.toLowerCase();
    rows = rows.filter((shot) => `${shot.playType} ${shot.shotZone} ${shot.shotType}`.toLowerCase().includes(query));
  }

  const sort = params.sort ?? "expectedPoints";
  const order = params.order ?? "desc";
  rows.sort((left, right) => {
    const leftValue = Number(left[sort as keyof Shot]);
    const rightValue = Number(right[sort as keyof Shot]);
    if (Number.isFinite(leftValue) && Number.isFinite(rightValue)) {
      return order === "asc" ? leftValue - rightValue : rightValue - leftValue;
    }
    return left.id.localeCompare(right.id);
  });
  return rows;
}

export function filterShotCollection(sourceRows: Shot[], params: ShotCollectionFilters = {}) {
  const rows = filterShotRows(sourceRows, params);
  const total = rows.length;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  return {
    rows: rows.slice(offset, offset + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
