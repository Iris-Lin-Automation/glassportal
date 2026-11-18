import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}
