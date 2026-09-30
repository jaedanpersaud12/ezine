"use client";

import dynamic from "next/dynamic";
import type { EditorSource } from "@/components/editor/EditorApp";
import { EditorLoading } from "@/components/editor/EditorLoading";

type Props = {
  source: EditorSource;
};

// The editor is canvas and IndexedDB all the way down, so it only renders in the browser.
const EditorApp = dynamic(() => import("@/components/editor/EditorApp").then((m) => m.EditorApp), {
  ssr: false,
  loading: () => <EditorLoading />,
});

export function EditorEntry({ source }: Props) {
  return <EditorApp source={source} />;
}
