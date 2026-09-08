import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { syncPortalToNotion, type SyncPayload } from "@/lib/notion-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractToken(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-notion-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("token") ||
    process.env.NOTION_API_TOKEN ||
    undefined
  );
}

/** Bidirectional write: portal actions → Notion properties + audit callout */
export async function POST(
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

    const body = (await req.json()) as SyncPayload;
    if (
      !body.action ||
      !["confirm", "unconfirm", "progress", "view"].includes(body.action)
    ) {
      return NextResponse.json({ error: "Invalid sync action" }, { status: 400 });
    }

    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const client = createNotionClient(token);
    const result = await syncPortalToNotion(client, pageId, body);

    return NextResponse.json({
      ok: true,
      pageId,
      ...result,
      direction: "portal → notion",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
