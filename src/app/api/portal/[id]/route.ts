import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { fetchPortalData } from "@/lib/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractToken(req: NextRequest): string | undefined {
  const headerToken =
    req.headers.get("x-notion-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const queryToken = req.nextUrl.searchParams.get("token") || undefined;
  return headerToken || queryToken || process.env.NOTION_API_TOKEN || undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Notion Integration Token is required." },
        { status: 401 }
      );
    }

    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
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
