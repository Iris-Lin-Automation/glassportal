import { NextRequest, NextResponse } from "next/server";
import { loadRunDetail } from "@/lib/genui/stores/run-store";
import { guardGenui } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const guard = guardGenui(req, { allowAnonymousFixture: false, costly: false });
    if (!guard.ok) return guard.response;
    const detail = await loadRunDetail(params.runId);
    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    if (detail.run.ownerKey !== guard.ownerKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Load failed" },
      { status: 500 }
    );
  }
}
