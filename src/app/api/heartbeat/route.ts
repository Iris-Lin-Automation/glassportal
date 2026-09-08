import { NextRequest, NextResponse } from "next/server";
import {
  listHeartbeats,
  pushHeartbeat,
  type HeartbeatEvent,
  type HeartbeatEventType,
} from "@/lib/analytics-store";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { syncPortalToNotion } from "@/lib/notion-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: HeartbeatEventType[] = [
  "page_view",
  "heartbeat",
  "section_view",
  "progress",
  "confirm",
  "export",
  "copy_link",
];

export async function GET(req: NextRequest) {
  const pageId = req.nextUrl.searchParams.get("pageId") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 40);
  return NextResponse.json({
    events: listHeartbeats(pageId, limit),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<HeartbeatEvent> & {
      token?: string;
      syncNotion?: boolean;
    };

    if (!body.type || !TYPES.includes(body.type as HeartbeatEventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (!body.pageId || !body.sessionId) {
      return NextResponse.json(
        { error: "pageId and sessionId are required" },
        { status: 400 }
      );
    }

    const event: HeartbeatEvent = {
      type: body.type as HeartbeatEventType,
      pageId: body.pageId,
      sessionId: body.sessionId,
      sectionId: body.sectionId,
      sectionTitle: body.sectionTitle,
      progress: body.progress,
      ts: body.ts || Date.now(),
      meta: body.meta,
    };

    pushHeartbeat(event);

    // Optional Notion writeback for confirm / deep reading progress
    let sync: { updated: string[]; appended: boolean } | null = null;
    const shouldSync =
      body.syncNotion &&
      body.token &&
      (event.type === "confirm" ||
        (event.type === "progress" &&
          typeof event.progress === "number" &&
          event.progress >= 95));

    if (shouldSync && body.token) {
      try {
        const pageId = resolveNotionPageId(event.pageId);
        const client = createNotionClient(body.token);
        sync = await syncPortalToNotion(client, pageId, {
          action: event.type === "confirm" ? "confirm" : "progress",
          progress: event.progress,
          note: event.sectionTitle,
        });
      } catch (err) {
        return NextResponse.json({
          ok: true,
          event,
          syncError: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ ok: true, event, sync });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bad request" },
      { status: 400 }
    );
  }
}
