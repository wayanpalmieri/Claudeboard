import { NextResponse } from "next/server";
import { getCachedInsights, refreshInsights } from "@/lib/insights-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  let data = getCachedInsights();

  // Refresh if no cache, forced, or cache older than 30min
  if (!data || forceRefresh || (Date.now() - new Date(data.lastRun).getTime() > 30 * 60 * 1000)) {
    data = await refreshInsights();
  }

  return NextResponse.json({
    lastRun: data.lastRun,
    insights: data.insights,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
