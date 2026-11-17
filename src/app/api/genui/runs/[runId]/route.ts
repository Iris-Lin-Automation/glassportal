import { NextRequest, NextResponse } from "next/server";
import { loadRunDetail } from "@/lib/genui/stores/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const detail = await loadRunDetail(params.runId);
    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Load failed" },
      { status: 500 }
    );
  }
}
