import { NextRequest, NextResponse } from "next/server";
import { listRuns } from "@/lib/genui/stores/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ownerKey =
      req.nextUrl.searchParams.get("ownerKey") ||
      req.headers.get("x-playground-owner") ||
      "*";
    const limit = Number(req.nextUrl.searchParams.get("limit") || 30);
    const runs = await listRuns(ownerKey, Math.min(limit, 100));
    return NextResponse.json({ runs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "List failed" },
      { status: 500 }
    );
  }
}
