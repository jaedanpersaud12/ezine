"use client";

import { useEffect, useRef, useState } from "react";
import { renderSpread } from "@/lib/editor/render";
import type { Spread, Zine } from "@/lib/zine/schema";

const THUMB_PX_PER_MM = 0.9;
const DEBOUNCE_MS = 350;

type Entry = { spread: Spread; paper: string; trim: string; url: string };

// Data-URL thumbnails per spread id, re-rendered only for spreads whose content changed.
export function useSpreadThumbnails(zine: Zine | null): Map<string, string> {
  const cache = useRef(new Map<string, Entry>());
  const [urls, setUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!zine) return;
    let cancelled = false;
    const trim = `${zine.trim.widthMm}x${zine.trim.heightMm}`;

    const timer = window.setTimeout(async () => {
      for (let i = 0; i < zine.spreads.length; i++) {
        if (cancelled) return;
        const spread = zine.spreads[i];
        const hit = cache.current.get(spread.id);
        if (hit && hit.spread === spread && hit.paper === zine.paper.color && hit.trim === trim) continue;
        try {
          const canvas = await renderSpread(zine, i, { pxPerMm: THUMB_PX_PER_MM, bleed: false });
          cache.current.set(spread.id, { spread, paper: zine.paper.color, trim, url: canvas.toDataURL("image/png") });
        } catch (error) {
          console.error("Thumbnail failed", spread.id, error);
        }
      }
      if (!cancelled) setUrls(new Map([...cache.current].map(([id, e]) => [id, e.url])));
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [zine]);

  return urls;
}
