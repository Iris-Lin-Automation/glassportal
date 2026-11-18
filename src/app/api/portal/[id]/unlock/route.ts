import { NextRequest, NextResponse } from "next/server";
import { resolveNotionPageId } from "@/lib/notion";
import { loadBranding } from "@/lib/branding-store";
import { passcodeMatches } from "@/lib/security/public-branding";
import {
  gateCookieName,
  mintGateCookie,
} from "@/lib/security/gate-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const body = (await req.json()) as { passcode?: string };
    const branding = await loadBranding(pageId);
    if (!passcodeMatches(branding, body.passcode || "")) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(gateCookieName(pageId), mintGateCookie(pageId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unlock failed" },
      { status: 500 }
    );
  }
}
