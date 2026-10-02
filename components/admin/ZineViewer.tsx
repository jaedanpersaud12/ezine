"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { primeFont, primeImage } from "@/lib/editor/assets";
import { renderPages } from "@/lib/editor/render";
import { leafCount, type Asset, type Zine } from "@/lib/zine/schema";
import { useReaderStore } from "@/stores/reader";

const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

// Same texture resolution as the editor's preview.
const PX_PER_MM = 5;

type Rendered = { pages: Map<number, HTMLCanvasElement> };

// Fetch one asset through the admin route and hand it to the renderer. It never goes into this
// browser's blob store. A file that can't be fetched is skipped: that layer draws as a placeholder.
async function loadAsset(asset: Asset): Promise<void> {
  try {
    const res = await fetch(`/api/admin/assets/${asset.id}`);
    const body = (await res.json()) as { success: boolean; data?: { url: string } };
    if (!res.ok || !body.success || !body.data) return;
    const file = await fetch(body.data.url);
    if (!file.ok) return;
    const blob = await file.blob();
    if (asset.kind === "image") primeImage(asset, blob);
    else await primeFont(asset, blob);
  } catch (error) {
    console.error("Could not load asset", asset.id, error);
  }
}

// A zine, read-only, in the 3D reader. No editor store, no tools: just the pages.
export function ZineViewer({ zine }: { zine: Zine }) {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState(false);
  const pageImage = useMemo(() => (rendered ? (side: number) => rendered.pages.get(side) : undefined), [rendered]);

  useEffect(() => {
    let cancelled = false;
    useReaderStore.getState().setLeafCount(leafCount(zine));
    (async () => {
      await Promise.all(Object.values(zine.assets).map(loadAsset));
      const pages = await renderPages(zine, PX_PER_MM);
      if (!cancelled) setRendered({ pages });
    })().catch((error: unknown) => {
      console.error("Could not render the zine", error);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [zine]);

  return (
    <div className="relative h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden rounded-2xl bg-muted shadow-border" data-testid="zine-viewer">
      {rendered ? (
        <>
          <ReaderScene
            widthMm={zine.trim.widthMm}
            heightMm={zine.trim.heightMm}
            leafCount={leafCount(zine)}
            pageImage={pageImage}
            stapled={zine.binding === "saddle"}
            version={zine.updatedAt}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
            <ReaderToolbar bookControls={false} />
          </div>
        </>
      ) : (
        <div role="status" className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {failed ? "This zine couldn't be drawn." : "Loading pages…"}
        </div>
      )}
    </div>
  );
}
