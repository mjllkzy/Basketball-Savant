import { ok } from "@/lib/api/response";
import { searchSite } from "@/lib/db/search.server";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const response = ok(await searchSite(q));
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return response;
}
