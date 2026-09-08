"use client";

import { useEffect, useRef } from "react";

function guessType(href: string): string | undefined {
  if (href.startsWith("data:image/png")) return "image/png";
  if (href.startsWith("data:image/jpeg") || href.startsWith("data:image/jpg"))
    return "image/jpeg";
  if (href.startsWith("data:image/webp")) return "image/webp";
  if (href.startsWith("data:image/svg")) return "image/svg+xml";
  if (/\.png(\?|$)/i.test(href)) return "image/png";
  if (/\.jpe?g(\?|$)/i.test(href)) return "image/jpeg";
  if (/\.webp(\?|$)/i.test(href)) return "image/webp";
  if (/\.svg(\?|$)/i.test(href)) return "image/svg+xml";
  return undefined;
}

function applyBrandFavicon(href: string) {
  if (
    !href ||
    (!href.startsWith("data:") &&
      !href.startsWith("http") &&
      !href.startsWith("/"))
  ) {
    return;
  }

  const type = guessType(href);
  const rels = ["icon", "shortcut icon", "apple-touch-icon"];

  for (const rel of rels) {
    // Remove competing default/Next icons so brand logo wins the tab
    document
      .querySelectorAll(`link[rel="${rel}"]`)
      .forEach((node) => {
        const el = node as HTMLLinkElement;
        if (el.getAttribute("data-glassportal-brand") !== "1") {
          el.remove();
        }
      });

    let link = document.querySelector(
      `link[rel="${rel}"][data-glassportal-brand="1"]`
    ) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      link.setAttribute("data-glassportal-brand", "1");
      document.head.appendChild(link);
    }

    if (type) link.type = type;
    // Stable href (no Date.now) — avoid tab flicker; browsers still pick it up
    if (link.getAttribute("href") !== href) {
      link.href = href;
    }
  }
}

/**
 * CRITICAL PRODUCT RULE:
 * Browser tab favicon MUST always show the uploaded client brand logo.
 * Do not remove this component or replace with a default GlassPortal icon.
 */
export function BrandFavicon({ href }: { href?: string }) {
  const lastHref = useRef<string>("");

  useEffect(() => {
    if (!href) return;
    lastHref.current = href;
    applyBrandFavicon(href);

    // Re-assert if Next.js / other scripts inject a default favicon later
    const observer = new MutationObserver(() => {
      if (!lastHref.current) return;
      const brand = document.querySelector(
        'link[rel="icon"][data-glassportal-brand="1"]'
      ) as HTMLLinkElement | null;
      const anyIcon = document.querySelector(
        'link[rel="icon"]'
      ) as HTMLLinkElement | null;
      if (
        !brand ||
        (anyIcon && anyIcon.getAttribute("data-glassportal-brand") !== "1")
      ) {
        applyBrandFavicon(lastHref.current);
      }
    });

    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [href]);

  return null;
}
