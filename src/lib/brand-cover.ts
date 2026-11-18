/**
 * Commercial executive cover posters — auto-rendered from brand color.
 * Used for Sample preview + after logo color sampling (unless user uploads).
 */

function clampHex(hex: string, fallback = "#0F172A"): string {
  const raw = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return fallback;
  return `#${raw.toUpperCase()}`;
}

function mix(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const x = parseInt(pa.slice(i, i + 2), 16);
    const y = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`.toUpperCase();
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

/** Static SVG cover — works in SSR / Sample without canvas. */
export function buildExecutiveCoverSvg(opts: {
  brandColor: string;
  clientName?: string;
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
}): string {
  const brand = clampHex(opts.brandColor, "#059669");
  const deep = mix(brand, "#020617", 0.72);
  const mid = mix(brand, "#0F172A", 0.45);
  const glow = mix(brand, "#FFFFFF", 0.18);
  const w = opts.width || 1600;
  const h = opts.height || 900;
  const client = escapeXml((opts.clientName || "Client").trim() || "Client");
  const titleLines = wrapLines(
    opts.title || "Executive Strategy Briefing",
    28,
    3
  ).map(escapeXml);
  const subtitle = escapeXml(
    (opts.subtitle || "Confidential commercial delivery").trim()
  );

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="96" y="${520 + i * 64}" fill="#F8FAFC" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700">${line}</text>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Executive cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${deep}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${brand}"/>
    </linearGradient>
    <radialGradient id="orb" cx="78%" cy="18%" r="45%">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${brand}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${brand}"/>
      <stop offset="100%" stop-color="#F8FAFC" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#orb)"/>
  <path d="M0 640 L1600 420 L1600 900 L0 900 Z" fill="#020617" fill-opacity="0.28"/>
  <circle cx="1280" cy="210" r="180" fill="none" stroke="#F8FAFC" stroke-opacity="0.12" stroke-width="2"/>
  <circle cx="1280" cy="210" r="110" fill="none" stroke="${brand}" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="96" y="96" width="72" height="6" rx="3" fill="url(#bar)"/>
  <text x="96" y="150" fill="#E2E8F0" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="3">${client.toUpperCase()}</text>
  <text x="96" y="188" fill="#94A3B8" font-family="Inter, system-ui, sans-serif" font-size="16" letter-spacing="2">EXECUTIVE BRIEFING</text>
  ${titleSvg}
  <text x="96" y="760" fill="#CBD5E1" font-family="Inter, system-ui, sans-serif" font-size="22">${subtitle}</text>
  <rect x="96" y="800" width="180" height="4" rx="2" fill="${brand}"/>
</svg>`;
}

export function buildExecutiveCoverDataUrl(opts: {
  brandColor: string;
  clientName?: string;
  title?: string;
  subtitle?: string;
}): string {
  const svg = buildExecutiveCoverSvg(opts);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Browser canvas raster — sharper for share cards / uploads pipeline. */
export async function renderExecutiveCoverJpeg(opts: {
  brandColor: string;
  clientName?: string;
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  quality?: number;
}): Promise<string> {
  if (typeof window === "undefined") {
    return buildExecutiveCoverDataUrl(opts);
  }
  const w = opts.width || 1600;
  const h = opts.height || 900;
  const brand = clampHex(opts.brandColor, "#059669");
  const deep = mix(brand, "#020617", 0.72);
  const mid = mix(brand, "#0F172A", 0.45);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return buildExecutiveCoverDataUrl(opts);

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, deep);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, brand);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const orb = ctx.createRadialGradient(w * 0.78, h * 0.18, 20, w * 0.78, h * 0.18, w * 0.35);
  orb.addColorStop(0, `${mix(brand, "#FFFFFF", 0.25)}99`);
  orb.addColorStop(1, `${brand}00`);
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(2,6,23,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.71);
  ctx.lineTo(w, h * 0.47);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(248,250,252,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.23, 180, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `${brand}73`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.23, 110, 0, Math.PI * 2);
  ctx.stroke();

  const bar = ctx.createLinearGradient(96, 0, 168, 0);
  bar.addColorStop(0, brand);
  bar.addColorStop(1, "rgba(248,250,252,0.35)");
  ctx.fillStyle = bar;
  ctx.fillRect(96, 96, 72, 6);

  ctx.fillStyle = "#E2E8F0";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText((opts.clientName || "Client").toUpperCase(), 96, 150);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "16px Inter, system-ui, sans-serif";
  ctx.fillText("EXECUTIVE BRIEFING", 96, 188);

  const lines = wrapLines(opts.title || "Executive Strategy Briefing", 28, 3);
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "700 52px Georgia, 'Times New Roman', serif";
  lines.forEach((line, i) => {
    ctx.fillText(line, 96, 520 + i * 64);
  });

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "22px Inter, system-ui, sans-serif";
  ctx.fillText(
    opts.subtitle || "Confidential commercial delivery",
    96,
    760
  );
  ctx.fillStyle = brand;
  ctx.fillRect(96, 800, 180, 4);

  return canvas.toDataURL("image/jpeg", opts.quality ?? 0.86);
}

/** Default Sample cover (Acme emerald). */
export const DEFAULT_SAMPLE_COVER = buildExecutiveCoverDataUrl({
  brandColor: "#059669",
  clientName: "Acme Corporation",
  title: "2026 Q3 B2B Go-To-Market & Revenue Expansion Strategy",
  subtitle: "Confidential executive briefing — CEO & CFO",
});
