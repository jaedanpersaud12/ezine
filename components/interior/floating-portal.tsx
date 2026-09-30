"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = (): (() => void) => () => {};

// Renders floating UI (menus, tooltips, popovers) at the end of <body>, so it never takes space
// in, gets clipped by, or scrolls with the panel that opened it. Nothing renders on the server.
export function FloatingPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}
