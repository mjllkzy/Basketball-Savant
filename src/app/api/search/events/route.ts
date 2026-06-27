import { SHORT_DATA_CACHE_CONTROL, cachedOk } from "@/lib/api/response";
import { searchSite } from "@/lib/db/search.server";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return cachedOk(await searchSite(q), undefined, SHORT_DATA_CACHE_CONTROL);
}
