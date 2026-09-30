"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

// The live viewport rect of an element while `active`: follows scrolling (any ancestor), resizes
// and layout shifts, so floating UI can sit on top of it with position: fixed. After `active`
// turns off it keeps the last rect, so exit animations play where the element was.
export function useAnchorRect(ref: RefObject<HTMLElement | null>, active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const read = (): void => {
      const el = ref.current;
      if (!el) return;
      const next = el.getBoundingClientRect();
      setRect((prev) =>
        prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    if (ref.current) ro.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
    };
  }, [ref, active]);

  return rect;
}
