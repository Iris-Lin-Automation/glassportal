/**
 * Hardened portal → PDF export.
 * Survives cross-origin images, long pages, and canvas size limits.
 */
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

/** Wait until Notion proxy images finish loading (blob/http). */
async function waitForImages(root: HTMLElement, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const placeholders = root.querySelectorAll(".animate-pulse");
    const imgs = Array.from(root.querySelectorAll("img"));
    const unloaded = imgs.filter(
      (img) => !img.complete || img.naturalWidth === 0
    );
    if (placeholders.length === 0 && unloaded.length === 0) return;
    await new Promise((r) => window.setTimeout(r, 120));
  }
}

async function srcToDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    // blob: + same-origin /api/media — do not force CORS mode (breaks some blobs)
    const res = await fetch(src, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/** Convert every <img> under root to a data URL so toPng cannot taint / drop pasted Notion files. */
async function inlineImagesForExport(root: HTMLElement): Promise<() => void> {
  await waitForImages(root);
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const imgs = Array.from(root.querySelectorAll("img"));
  const restore: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const original = img.getAttribute("src") || img.currentSrc || "";
      if (!original) return;

      const prevSrc = img.src;
      const prevMaxH = img.style.maxHeight;
      restore.push(() => {
        img.src = prevSrc;
        img.style.maxHeight = prevMaxH;
      });
      // Pasted Notion screenshots are often tall — don't clip in the PDF raster
      img.style.maxHeight = "none";

      if (original.startsWith("data:")) return;

      const inlined = await srcToDataUrl(original);
      if (inlined) {
        img.src = inlined;
        return;
      }

      try {
        // Draw via canvas if already decoded in this document
        if (img.complete && img.naturalWidth > 0) {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          if (!ctx) throw new Error("no ctx");
          ctx.drawImage(img, 0, 0);
          img.src = c.toDataURL("image/png");
        } else {
          img.src =
            "data:image/svg+xml," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(img.width || 120, 40)}" height="${Math.max(img.height || 80, 40)}"><rect fill="#e2e8f0" width="100%" height="100%"/><text x="50%" y="50%" fill="#94a3b8" font-size="10" text-anchor="middle" dy=".3em">image</text></svg>`
            );
        }
      } catch {
        /* keep previous src */
      }
    })
  );

  // One more paint frame so inlined data URLs decode before html-to-image runs
  await new Promise((r) => window.requestAnimationFrame(() => r(undefined)));
  await waitForImages(root, 4000);

  return () => {
    restore.forEach((fn) => fn());
  };
}

/**
 * html-to-image + `mx-auto` / scroll parents often rasterize content shifted
 * to the right (left half blank). Pin layout to top-left for the capture.
 */
function prepareNodeForCapture(node: HTMLElement): () => void {
  const prev = {
    marginLeft: node.style.marginLeft,
    marginRight: node.style.marginRight,
    marginInline: node.style.marginInline,
    left: node.style.left,
    right: node.style.right,
    transform: node.style.transform,
    position: node.style.position,
    width: node.style.width,
    maxWidth: node.style.maxWidth,
  };

  const scrollParents: Array<{ el: HTMLElement; top: number; left: number }> =
    [];
  let walk: HTMLElement | null = node.parentElement;
  while (walk) {
    if (walk.scrollTop || walk.scrollLeft) {
      scrollParents.push({
        el: walk,
        top: walk.scrollTop,
        left: walk.scrollLeft,
      });
      walk.scrollTop = 0;
      walk.scrollLeft = 0;
    }
    walk = walk.parentElement;
  }
  const winX = window.scrollX;
  const winY = window.scrollY;
  window.scrollTo(0, 0);

  const box = node.getBoundingClientRect();
  const width = Math.max(
    Math.ceil(box.width),
    node.offsetWidth,
    node.clientWidth,
    320
  );

  node.style.marginLeft = "0";
  node.style.marginRight = "0";
  node.style.marginInline = "0";
  node.style.left = "0";
  node.style.right = "auto";
  node.style.transform = "none";
  node.style.position = "relative";
  node.style.maxWidth = "none";
  node.style.width = `${width}px`;

  return () => {
    node.style.marginLeft = prev.marginLeft;
    node.style.marginRight = prev.marginRight;
    node.style.marginInline = prev.marginInline;
    node.style.left = prev.left;
    node.style.right = prev.right;
    node.style.transform = prev.transform;
    node.style.position = prev.position;
    node.style.width = prev.width;
    node.style.maxWidth = prev.maxWidth;
    scrollParents.forEach(({ el, top, left }) => {
      el.scrollTop = top;
      el.scrollLeft = left;
    });
    window.scrollTo(winX, winY);
  };
}

async function captureNode(node: HTMLElement): Promise<string> {
  const restoreLayout = prepareNodeForCapture(node);
  try {
    // Prefer layout width (not inflated table scrollWidth) so the canvas
    // matches the visible column and stays left-aligned.
    const width = Math.max(node.offsetWidth, node.clientWidth, 320);
    const height = Math.max(node.scrollHeight, node.clientHeight, 320);

    const baseOpts = {
      cacheBust: true,
      backgroundColor: "#F9FAFB",
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      style: {
        transform: "none",
        transformOrigin: "top left",
        overflow: "visible",
        margin: "0",
        marginLeft: "0",
        marginRight: "0",
        left: "0",
        right: "auto",
        position: "relative",
        maxWidth: "none",
        width: `${width}px`,
      },
      filter: (domNode: Node) => {
        if (!(domNode instanceof HTMLElement)) return true;
        return domNode.dataset.exportIgnore !== "1";
      },
    };

    const ratios = [2, 1.5, 1];
    let lastError: unknown;

    for (const pixelRatio of ratios) {
      try {
        return await toPng(node, { ...baseOpts, pixelRatio });
      } catch (e) {
        lastError = e;
      }
    }

    // JPEG fallback — smaller payload, often succeeds when PNG OOMs
    try {
      return await toJpeg(node, { ...baseOpts, pixelRatio: 1, quality: 0.92 });
    } catch (e) {
      lastError = e;
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to capture portal for PDF");
  } finally {
    restoreLayout();
  }
}

function dataUrlToPdf(
  dataUrl: string,
  fileName: string,
  img: HTMLImageElement,
  watermarkText?: string
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const footerReserve = watermarkText ? 8 : 0;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - footerReserve;

  const imgWidthMm = contentWidth;
  const imgHeightMm = (img.height * imgWidthMm) / img.width;
  const format = dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";

  const stampWatermark = () => {
    if (!watermarkText) return;
    // Strip emoji / non-WinAnsi chars that Helvetica cannot render (avoids "&j& &D&e&…" garbage)
    const safe = watermarkText
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!safe) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(safe, pageWidth / 2, pageHeight - 4.5, {
      align: "center",
    });
  };

  if (imgHeightMm <= contentHeight) {
    pdf.addImage(
      dataUrl,
      format,
      margin,
      margin,
      imgWidthMm,
      imgHeightMm,
      undefined,
      "FAST"
    );
    stampWatermark();
  } else {
    const pageCanvas = document.createElement("canvas");
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    const scale = img.width / imgWidthMm;
    const pageSliceHeightPx = Math.floor(contentHeight * scale);
    pageCanvas.width = img.width;

    let renderedHeightMm = 0;
    let pageIndex = 0;

    while (renderedHeightMm < imgHeightMm - 0.1) {
      const sourceY = Math.floor(renderedHeightMm * scale);
      const sliceHeightPx = Math.min(pageSliceHeightPx, img.height - sourceY);
      pageCanvas.height = Math.max(sliceHeightPx, 1);
      ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.fillStyle = "#F9FAFB";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        img,
        0,
        sourceY,
        img.width,
        sliceHeightPx,
        0,
        0,
        img.width,
        sliceHeightPx
      );

      const sliceData =
        format === "JPEG"
          ? pageCanvas.toDataURL("image/jpeg", 0.92)
          : pageCanvas.toDataURL("image/png");
      const sliceHeightMm = sliceHeightPx / scale;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        sliceData,
        format,
        margin,
        margin,
        imgWidthMm,
        sliceHeightMm,
        undefined,
        "FAST"
      );
      stampWatermark();

      renderedHeightMm += sliceHeightMm;
      pageIndex += 1;

      if (sliceHeightMm < 0.01) break;
    }
  }

  pdf.save(fileName);
}

export async function exportNodeAsPdf(
  node: HTMLElement,
  fileName: string,
  opts?: { watermarkText?: string }
) {
  const restore = await inlineImagesForExport(node);
  try {
    const dataUrl = await captureNode(node);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load export image"));
      el.src = dataUrl;
    });
    dataUrlToPdf(dataUrl, fileName, img, opts?.watermarkText);
  } finally {
    restore();
  }
}
