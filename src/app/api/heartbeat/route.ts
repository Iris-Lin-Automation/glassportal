import { NextRequest, NextResponse } from "next/server";
import {
  listHeartbeats,
  pushHeartbeat,
  type HeartbeatEvent,
  type HeartbeatEventType,
} from "@/lib/analytics-store";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { syncPortalToNotion } from "@/lib/notion-sync";
import { loadBranding } from "@/lib/branding-store";
import { resolvePortalNotionToken } from "@/lib/security/portal-credential";
import { clientIp } from "@/lib/security/genui-guard";
import { requireSessionEmail } from "@/lib/security/studio-session";

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

const postHits = new Map<string, { n: number; reset: number }>();

function rateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = postHits.get(key);
  if (!cur || now > cur.reset) {
    postHits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  if (cur.n >= limit) return true;
  cur.n += 1;
  return false;
}

export async function GET(req: NextRequest) {
  const email = requireSessionEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const pageIdRaw = req.nextUrl.searchParams.get("pageId");
  if (!pageIdRaw) {
    return NextResponse.json(
      { error: "pageId is required" },
      { status: 400 }
    );
  }
  const pageId = resolveNotionPageId(pageIdRaw);
  const branding = await loadBranding(pageId);
  if (!branding?.ownerEmail || branding.ownerEmail.toLowerCase() !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") || 40);
  return NextResponse.json({
    events: listHeartbeats(pageId, Math.min(Math.max(limit, 1), 100)),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (rateLimited(`hb:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawText = await req.text();
    if (rawText.length > 8_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const body = JSON.parse(rawText || "{}") as Partial<HeartbeatEvent> & {
      syncNotion?: boolean;
      shareTicket?: string;
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
      pageId: String(body.pageId).slice(0, 128),
      sessionId: String(body.sessionId).slice(0, 128),
      sectionId: body.sectionId ? String(body.sectionId).slice(0, 128) : undefined,
      sectionTitle: body.sectionTitle
        ? String(body.sectionTitle).slice(0, 200)
        : undefined,
      progress:
        typeof body.progress === "number"
          ? Math.max(0, Math.min(100, body.progress))
          : undefined,
      ts: body.ts || Date.now(),
      meta: undefined, // drop arbitrary meta from anonymous writers
    };

    pushHeartbeat(event);

    let sync: { updated: string[]; appended: boolean } | null = null;
    const shouldSync =
      body.syncNotion &&
      (event.type === "confirm" ||
        (event.type === "progress" &&
          typeof event.progress === "number" &&
          event.progress >= 95));

    if (shouldSync) {
      try {
        const pageId = resolveNotionPageId(event.pageId);
        const ticket =
          body.shareTicket ||
          req.headers.get("x-portal-ticket") ||
          undefined;
        const token = await resolvePortalNotionToken({
          pageId,
          headerToken: null,
          shareTicket: ticket,
        });
        if (token) {
          const client = createNotionClient(token);
          sync = await syncPortalToNotion(client, pageId, {
            action: event.type === "confirm" ? "confirm" : "progress",
            progress: event.progress,
            note: event.sectionTitle,
          });
        }
      } catch {
        /* analytics still recorded */
      }
    }

    return NextResponse.json({ ok: true, sync });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}
