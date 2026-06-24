import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/db/health.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await getDatabaseHealth();
  const ready = database.status === "connected" && database.schemaReady && database.dataReady;
  return NextResponse.json(
    {
      data: {
        status: ready ? "ok" : "not_ready",
        database,
      },
    },
    { status: ready ? 200 : 503 },
  );
}
