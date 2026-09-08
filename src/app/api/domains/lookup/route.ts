import { NextRequest, NextResponse } from "next/server";
import { findDomain } from "@/lib/domain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lookup custom domain → pageId (used by middleware rewrite). */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host") || "";
  if (!host) {
    return NextResponse.json({ error: "host required" }, { status: 400 });
  }
  const binding = await findDomain(host);
  if (!binding) {
    return NextResponse.json({ found: false }, { status: 404 });
  }
  return NextResponse.json({
    found: true,
    pageId: binding.pageId,
    hostname: binding.hostname,
  });
}
