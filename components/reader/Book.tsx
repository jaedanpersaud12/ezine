"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import type { Group } from "three";
import { createBookRig } from "@/lib/book/bookRig";
import { useReaderStore } from "@/stores/reader";
import { Staples } from "@/components/reader/Staples";

const LEAF_URL = "/models/leaf.glb";

// A drag commits once the leaf is this far through its turn.
const DRAG_COMMIT = 0.35;
// Horizontal drag, as a fraction of the canvas width, that carries a leaf through a full turn.
const DRAG_FULL_TURN = 0.45;
// Pointer travel in px under which a press counts as a click.
const CLICK_SLOP_PX = 4;

type Drag = { pointerId: number; startX: number; leaf: number | null; dir: 1 | -1; p: number };

type BookProps = {
  widthMm: number;
  heightMm: number;
  leafCount: number;
  pageImage?: (side: number) => HTMLCanvasElement | undefined;
  // Saddle-stitch staples along the spine; off for unbound books.
  stapled?: boolean;
};

export function Book({ widthMm, heightMm, leafCount, pageImage, stapled = true }: BookProps) {
  const { scene, animations } = useGLTF(LEAF_URL);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const domElement = useThree((s) => s.gl.domElement);
  const opened = useReaderStore((s) => s.opened);

  const groupRef = useRef<Group>(null);
  const clinchRef = useRef<Group>(null);

  const book = useMemo(
    () => createBookRig({ gltfScene: scene, animations, widthMm, heightMm, leafCount, maxAnisotropy, pageImage }),
    [scene, animations, widthMm, heightMm, leafCount, maxAnisotropy, pageImage],
  );

  useEffect(() => {
    book.setClinch(clinchRef.current);
    return () => book.dispose();
  }, [book]);

  useEffect(() => {
    book.turnTo(opened);

    // Keep whatever is showing centred: the right half when closed on the front, the left on the back.
    const group = groupRef.current;
    if (!group) return;
    const x = opened === 0 ? -book.widthM / 2 : opened === book.leafCount ? book.widthM / 2 : 0;
    gsap.to(group.position, { x, duration: 0.9, ease: "power2.inOut", overwrite: true });
  }, [book, opened]);

  // Drag to turn: the leaf follows the pointer. A click turns forward on the right half, back on the left.
  useEffect(() => {
    let drag: Drag | null = null;

    const onDown = (e: PointerEvent): void => {
      if (e.button !== 0 || drag) return;
      drag = { pointerId: e.pointerId, startX: e.clientX, leaf: null, dir: 1, p: 0 };
      domElement.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent): void => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = (e.clientX - drag.startX) / (domElement.clientWidth * DRAG_FULL_TURN);

      if (drag.leaf === null) {
        if (Math.abs(e.clientX - drag.startX) <= CLICK_SLOP_PX) return;
        const current = useReaderStore.getState().opened;
        drag.dir = dx < 0 ? 1 : -1;
        const leaf = drag.dir === 1 ? current : current - 1;
        if (leaf < 0 || leaf >= book.leafCount) return;
        drag.leaf = leaf;
        book.hold(leaf);
      }

      const travel = Math.min(1, Math.max(0, Math.abs(dx)));
      drag.p = drag.dir === 1 ? travel : 1 - travel;
      book.setProgress(drag.leaf, drag.p);
    };

    const onUp = (e: PointerEvent): void => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const { leaf, dir, p, startX } = drag;
      drag = null;
      if (domElement.hasPointerCapture(e.pointerId)) domElement.releasePointerCapture(e.pointerId);

      const store = useReaderStore.getState();
      if (leaf === null) {
        if (Math.abs(e.clientX - startX) > CLICK_SLOP_PX) return;
        const rect = domElement.getBoundingClientRect();
        if (e.clientX - rect.left > rect.width / 2) store.turnNext();
        else store.turnPrev();
        return;
      }

      const committed = dir === 1 ? p > DRAG_COMMIT : p < 1 - DRAG_COMMIT;
      if (committed) store.setOpened(store.opened + dir);
      else book.settle(leaf);
    };

    domElement.addEventListener("pointerdown", onDown);
    domElement.addEventListener("pointermove", onMove);
    domElement.addEventListener("pointerup", onUp);
    domElement.addEventListener("pointercancel", onUp);
    return () => {
      domElement.removeEventListener("pointerdown", onDown);
      domElement.removeEventListener("pointermove", onMove);
      domElement.removeEventListener("pointerup", onUp);
      domElement.removeEventListener("pointercancel", onUp);
    };
  }, [domElement, book]);

  return (
    <group ref={groupRef} position-x={-book.widthM / 2}>
      {book.roots.map((root, i) => (
        <primitive key={i} object={root} />
      ))}
      {stapled && leafCount % 2 === 0 ? <Staples heightM={book.heightM} clinchRef={clinchRef} /> : null}
    </group>
  );
}

useGLTF.preload(LEAF_URL);
