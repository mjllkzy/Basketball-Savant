import { ok } from "@/lib/api/response";
import { searchAll } from "@/lib/data/queries";

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return ok(searchAll(q));
}
