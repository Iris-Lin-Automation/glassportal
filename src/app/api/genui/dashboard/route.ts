import { NextRequest, NextResponse } from "next/server";
import { buildDashboardStats } from "@/lib/genui/dashboard-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ownerKey = req.nextUrl.searchParams.get("ownerKey") || "*";
    const limit = Number(req.nextUrl.searchParams.get("limit") || "80");
    const stats = await buildDashboardStats({
      ownerKey,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 80,
    });
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dashboard failed" },
      { status: 500 }
    );
  }
}
