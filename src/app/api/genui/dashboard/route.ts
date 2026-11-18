import { NextRequest, NextResponse } from "next/server";
import { buildDashboardStats } from "@/lib/genui/dashboard-stats";
import { guardGenui } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = guardGenui(req, { allowAnonymousFixture: false, costly: false });
    if (!guard.ok) return guard.response;
    const limit = Number(req.nextUrl.searchParams.get("limit") || "80");
    const stats = await buildDashboardStats({
      ownerKey: guard.ownerKey,
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
