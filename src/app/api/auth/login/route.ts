import { NextRequest, NextResponse } from "next/server";
import { authenticateAccount } from "@/lib/security/accounts";
import { attachSessionCookie } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const result = await authenticateAccount(body.email || "", body.password || "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      email: result.account.email,
      name: result.account.name,
    });
    return attachSessionCookie(res, result.account.email);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    );
  }
}
