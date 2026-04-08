import { NextResponse } from "next/server";
import { getDailyActivity, getTotalStats } from "@/lib/stats-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const activity = await getDailyActivity(90);
  const totals = getTotalStats();
  return NextResponse.json({ activity, totals }, {
    headers: { "Cache-Control": "no-store" },
  });
}
