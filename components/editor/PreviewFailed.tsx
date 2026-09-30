"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onClose: () => void;
};

// Shown when the 3D book can't be drawn: a WebGL crash, or the pages failed to render.
export function PreviewFailed({ onClose }: Props) {
  return (
    <div role="alert" className="absolute inset-0 flex items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-foreground">Preview couldn&apos;t start.</p>
        <p className="text-sm text-muted-foreground">
          This browser couldn&apos;t draw the 3D book. Your zine is unchanged.
        </p>
        <Button size="sm" onClick={onClose}>
          Back to the editor
        </Button>
      </div>
    </div>
  );
}
