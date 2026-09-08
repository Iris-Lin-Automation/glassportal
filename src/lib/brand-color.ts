/** Resize / compress a logo data-URL for storage & share-link delivery. */
export async function compressLogoDataUrl(
  dataUrl: string,
  maxSize = 256,
  quality = 0.85
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:")) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = dataUrl.startsWith("data:image/png");
        resolve(
          isPng
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", quality)
        );
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Sample a data-URL logo and return a saturated brand hex for UI accents.
 * Falls back to slate if sampling fails.
 */
export async function extractBrandColor(
  dataUrl: string,
  fallback = "#0F172A"
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl) return fallback;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fallback);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let best = { score: -1, r: 15, g: 23, b: 42 };
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          // Skip near-white / near-black noise
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
          if (lum > 0.92 || lum < 0.08) continue;

          rSum += r;
          gSum += g;
          bSum += b;
          count += 1;

          const score = sat * 1.4 + (1 - Math.abs(lum - 0.45));
          if (score > best.score) best = { score, r, g, b };
        }

        const pick =
          best.score > 0
            ? best
            : count > 0
              ? {
                  r: Math.round(rSum / count),
                  g: Math.round(gSum / count),
                  b: Math.round(bSum / count),
                }
              : { r: 15, g: 23, b: 42 };

        // Slightly deepen for UI contrast
        const deepen = (c: number) => Math.max(0, Math.min(255, Math.round(c * 0.88)));
        const hex = `#${[deepen(pick.r), deepen(pick.g), deepen(pick.b)]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()}`;
        resolve(hex);
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = dataUrl;
  });
}

/** Readable text on brand fill */
export function brandForeground(hex: string): "#FFFFFF" | "#0F172A" {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#FFFFFF";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  return lum > 0.62 ? "#0F172A" : "#FFFFFF";
}
