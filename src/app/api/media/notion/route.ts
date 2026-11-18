import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, normalizeId, resolveNotionPageId } from "@/lib/notion";
import { looksLikeNotionToken } from "@/lib/security/crypto";
import { resolvePortalNotionToken } from "@/lib/security/portal-credential";
import { isNotionSignedUrl, isSafePublicHttpsUrl } from "@/lib/security/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTrashed(block: Record<string, unknown>) {
  return Boolean(block.in_trash || block.archived);
}

function extractImageUrl(block: Record<string, unknown>): string | null {
  const type = String(block.type || "");
  const payload = block[type] as
    | {
        type?: string;
        file?: { url?: string };
        external?: { url?: string };
        file_upload?: { id?: string; url?: string };
        url?: string;
      }
    | undefined;

  if (!payload) return null;

  if (
    type === "image" ||
    type === "video" ||
    type === "pdf" ||
    type === "file" ||
    type === "audio"
  ) {
    if (payload.type === "external") return payload.external?.url || null;
    if (payload.type === "file") return payload.file?.url || null;
    if (payload.type === "file_upload") {
      return payload.file_upload?.url || payload.file?.url || null;
    }
    return (
      payload.external?.url ||
      payload.file?.url ||
      payload.file_upload?.url ||
      null
    );
  }

  return (
    payload.url ||
    payload.external?.url ||
    payload.file?.url ||
    payload.file_upload?.url ||
    null
  );
}

async function fetchUpstream(imageUrl: string) {
  if (!isSafePublicHttpsUrl(imageUrl) && !isNotionSignedUrl(imageUrl)) {
    throw new Error("Blocked non-Notion media URL");
  }
  return fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GlassPortalMediaProxy/1.2; +https://glassportal.app)",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    cache: "no-store",
    redirect: "manual",
  });
}

/**
 * Proxy Notion images: re-issue a fresh signed URL via blocks.retrieve, then
 * stream bytes. Auth: Notion-shaped header token OR published share ticket.
 */
export async function GET(req: NextRequest) {
  try {
    const blockIdRaw = req.nextUrl.searchParams.get("blockId");
    const fallbackUrl = req.nextUrl.searchParams.get("url");
    const pageIdRaw = req.nextUrl.searchParams.get("pageId");
    const headerToken = req.headers.get("x-notion-token");
    const shareTicket =
      req.headers.get("x-portal-ticket") ||
      req.nextUrl.searchParams.get("s") ||
      undefined;

    if (!blockIdRaw) {
      return NextResponse.json({ error: "blockId required" }, { status: 400 });
    }

    const pageId = pageIdRaw ? resolveNotionPageId(pageIdRaw) : "";
    const token = await resolvePortalNotionToken({
      pageId: pageId || "media",
      headerToken: looksLikeNotionToken(headerToken) ? headerToken : null,
      shareTicket: pageId ? shareTicket : null,
    });

    // Header Notion token alone is enough when no page ticket (Studio preview).
    const effectiveToken =
      token ||
      (looksLikeNotionToken(headerToken) ? headerToken!.trim() : null);

    if (!effectiveToken) {
      return NextResponse.json(
        { error: "Portal credential required for media proxy." },
        { status: 401 }
      );
    }

    let imageUrl = "";
    let retrieveError = "";

    try {
      const client = createNotionClient(effectiveToken);
      const block = (await client.blocks.retrieve({
        block_id: normalizeId(blockIdRaw),
      })) as unknown as Record<string, unknown>;

      if (isTrashed(block)) {
        retrieveError = "Image block is archived/trashed";
      } else {
        const fresh = extractImageUrl(block);
        if (fresh) imageUrl = fresh;
        else
          retrieveError = `Block type "${String(block.type || "unknown")}" has no image URL`;
      }
    } catch (e) {
      retrieveError =
        e instanceof Error ? e.message : "blocks.retrieve failed";
    }

    // Only allow Notion-signed fallback URLs (never arbitrary hosts).
    if (!imageUrl && fallbackUrl && isNotionSignedUrl(fallbackUrl)) {
      imageUrl = fallbackUrl;
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            retrieveError ||
            "Image URL not found. Block may be archived or Integration lacks access.",
        },
        { status: 404 }
      );
    }

    if (!isNotionSignedUrl(imageUrl) && !isSafePublicHttpsUrl(imageUrl)) {
      return NextResponse.json({ error: "Blocked media host" }, { status: 400 });
    }

    let upstream = await fetchUpstream(imageUrl);

    // Follow a single HTTPS redirect only to another Notion host
    if (
      upstream.status >= 300 &&
      upstream.status < 400 &&
      upstream.headers.get("location")
    ) {
      const loc = upstream.headers.get("location")!;
      if (!isNotionSignedUrl(loc) && !isSafePublicHttpsUrl(loc)) {
        return NextResponse.json({ error: "Blocked redirect host" }, { status: 400 });
      }
      upstream = await fetchUpstream(loc);
      imageUrl = loc;
    }

    if (!upstream.ok && blockIdRaw) {
      try {
        const client = createNotionClient(effectiveToken);
        const block = (await client.blocks.retrieve({
          block_id: normalizeId(blockIdRaw),
        })) as unknown as Record<string, unknown>;
        const fresh = !isTrashed(block) ? extractImageUrl(block) : null;
        if (fresh && fresh !== imageUrl && isNotionSignedUrl(fresh)) {
          imageUrl = fresh;
          upstream = await fetchUpstream(imageUrl);
        }
      } catch {
        /* keep original upstream failure */
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream image fetch failed (${upstream.status})` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    if (/text\/html|application\/json|text\/xml|application\/xml/i.test(contentType)) {
      return NextResponse.json(
        { error: `Upstream returned non-image content-type (${contentType})` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "Empty image payload" }, { status: 502 });
    }

    const safeType = contentType.startsWith("image/") ? contentType : "image/png";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": safeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Media proxy failed",
      },
      { status: 500 }
    );
  }
}
