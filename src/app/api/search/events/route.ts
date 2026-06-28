import { SHORT_DATA_CACHE_CONTROL, cachedOk } from "@/lib/api/response";
import { searchSite, type SiteSearchResultType } from "@/lib/db/search.server";

function searchTypes(params: URLSearchParams): SiteSearchResultType[] | undefined {
  const rawTypes = params.getAll("type").flatMap((value) => value.split(","));
  const types = rawTypes.filter((type): type is SiteSearchResultType => type === "player" || type === "team");
  return types.length ? types : undefined;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const limit = Number(params.get("limit") ?? 8);
  return cachedOk(await searchSite(q, limit, searchTypes(params)), undefined, SHORT_DATA_CACHE_CONTROL);
}
