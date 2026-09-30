"use client";

import { useEffect } from "react";
import { catchError, type ErrorInfo } from "next/error";
import { PreviewFailed } from "@/components/editor/PreviewFailed";

type Props = {
  onClose: () => void;
};

// The 3D reader needs WebGL, which some browsers and machines don't give us. When it fails the
// preview says so and hands back to the editor, which never left.
function PreviewFallback({ onClose }: Props, { error }: ErrorInfo) {
  useEffect(() => {
    console.error("Preview crashed", error);
  }, [error]);

  return <PreviewFailed onClose={onClose} />;
}

export const PreviewBoundary = catchError(PreviewFallback);
