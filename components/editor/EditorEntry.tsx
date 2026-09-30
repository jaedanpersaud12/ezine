"use client";

import dynamic from "next/dynamic";

// The editor is canvas and IndexedDB all the way down, so it only renders in the browser.
export const EditorEntry = dynamic(() => import("@/components/editor/EditorApp").then((m) => m.EditorApp), {
  ssr: false,
  loading: () => <div className="h-dvh bg-muted" />,
});
