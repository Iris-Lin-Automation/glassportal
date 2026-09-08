import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

function isAppHost(host: string) {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".vercel.app")) return true;
  const app = (process.env.NEXT_PUBLIC_APP_HOST || "glassportal.app")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return h === app || h === `www.${app}`;
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!host || isAppHost(host)) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/p/")) {
    return NextResponse.next();
  }

  try {
    const lookup = new URL("/api/domains/lookup", req.nextUrl.origin);
    lookup.searchParams.set("host", host);
    const res = await fetch(lookup.toString(), {
      headers: { "x-middleware-domain-lookup": "1" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.next();
    const json = (await res.json()) as { found?: boolean; pageId?: string };
    if (!json.found || !json.pageId) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = `/p/${encodeURIComponent(json.pageId)}`;
    return NextResponse.rewrite(url);
  } catch {
    return NextResponse.next();
  }
}
