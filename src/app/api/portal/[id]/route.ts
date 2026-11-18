import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { fetchPortalData } from "@/lib/parser";
import { looksLikeNotionToken } from "@/lib/security/crypto";
import { resolvePortalNotionToken } from "@/lib/security/portal-credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const headerToken =
      req.headers.get("x-notion-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const shareTicket =
      req.headers.get("x-portal-ticket") ||
      req.nextUrl.searchParams.get("s") ||
      undefined;

    // Never fall back to server NOTION_API_TOKEN for anonymous callers.
    // Never accept Notion secrets from query strings.
    const token = await resolvePortalNotionToken({
      pageId,
      headerToken: looksLikeNotionToken(headerToken) ? headerToken : null,
      shareTicket,
    });

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Portal credential required. Use a published share ticket or a Notion token header.",
        },
        { status: 401 }
      );
    }

    const client = createNotionClient(token);
    const data = await fetchPortalData(client, pageId);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.toLowerCase().includes("could not parse") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
