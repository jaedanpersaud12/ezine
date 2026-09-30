"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";

const MAT_URL = "/models/cuttingmat.glb";

// 450 × 300 mm, top face at y = 3 mm.
export const MAT_TOP_M = 0.003;

export function CuttingMat() {
  const { scene } = useGLTF(MAT_URL);

  useEffect(() => {
    scene.traverse((o) => {
      o.receiveShadow = true;
    });
  }, [scene]);

  return <primitive object={scene} />;
}

useGLTF.preload(MAT_URL);
