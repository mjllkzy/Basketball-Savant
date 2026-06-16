export type RouteSearchParams = Record<string, string | string[] | undefined>;

export function singleParam(params: RouteSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function numberParam(params: RouteSearchParams, key: string): number | undefined {
  const value = singleParam(params, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function booleanParam(params: RouteSearchParams, key: string): boolean | undefined {
  const value = singleParam(params, key);
  if (value === undefined) return undefined;
  return value === "true";
}
