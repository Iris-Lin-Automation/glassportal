import { NextRequest, NextResponse } from "next/server";
import { listRuns } from "@/lib/genui/stores/run-store";
import { guardGenui } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = guardGenui(req, { allowAnonymousFixture: false, costly: false });
    if (!guard.ok) return guard.response;
    const limit = Number(req.nextUrl.searchParams.get("limit") || 30);
    const runs = await listRuns(guard.ownerKey, Math.min(limit, 100));
    return NextResponse.json({ runs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "List failed" },
      { status: 500 }
    );
  }
}
