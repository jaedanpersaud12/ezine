"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { useTestCrash } from "@/lib/editor/testHooks";

const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

type Props = ComponentProps<typeof ReaderScene>;

// The reader as the editor's preview uses it, inside PreviewBoundary.
export function PreviewScene(props: Props) {
  useTestCrash("preview");
  return <ReaderScene {...props} />;
}
