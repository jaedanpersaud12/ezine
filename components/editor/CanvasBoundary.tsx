"use client";

import { useEffect } from "react";
import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

// Fabric runs inside this boundary; the document lives in the editor store outside it, so a crash
// here loses the drawing surface, never the zine. Reloading remounts a fresh canvas from the store.
function CanvasFallback(_props: object, { error, reset }: ErrorInfo) {
  useEffect(() => {
    console.error("Canvas crashed", error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-1 items-center justify-center bg-muted px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-foreground">The canvas hit a problem.</p>
        <p className="text-sm text-muted-foreground">Your zine is safe and still saving. Reload the canvas to keep working.</p>
        <Button size="sm" onClick={() => reset()}>
          Reload canvas
        </Button>
      </div>
    </div>
  );
}

export const CanvasBoundary = catchError(CanvasFallback);
