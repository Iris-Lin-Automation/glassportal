import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/security/accounts";
import { getSessionEmail } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = getSessionEmail(req);
  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const account = await getAccount(email);
  return NextResponse.json({
    authenticated: true,
    email,
    name: account?.name || email.split("@")[0],
  });
}
