import { NextRequest, NextResponse } from "next/server";
import { resolveNotionPageId } from "@/lib/notion";
import { loadBranding } from "@/lib/branding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Raster logos only — never SVG (stored XSS risk when served from app origin). */
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const branding = await loadBranding(pageId);
    const dataUrl = branding?.logoDataUrl;
    if (!dataUrl?.startsWith("data:")) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid logo data" }, { status: 400 });
    }

    const rawType = (match[1] || "image/png").toLowerCase().trim();
    if (!ALLOWED.has(rawType) || rawType.includes("svg")) {
      return NextResponse.json({ error: "Unsupported logo type" }, { status: 400 });
    }
    const contentType = rawType === "image/jpg" ? "image/jpeg" : rawType;
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to serve logo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
