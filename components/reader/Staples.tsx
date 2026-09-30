"use client";

import type { RefObject } from "react";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh, Object3D } from "three";

const STAPLE_URL = "/models/staple.glb";

type StaplesProps = {
  heightM: number;
  // Book moves this group to the centre spread's surface as leaves turn.
  clinchRef: RefObject<Group | null>;
};

function isMesh(o: Object3D | undefined): o is Mesh {
  return o !== undefined && "isMesh" in o && o.isMesh === true;
}

function part(scene: Object3D, name: string): Mesh {
  const mesh = scene.getObjectByName(name);
  if (!isMesh(mesh)) throw new Error(`staple.glb is missing ${name}`);
  return mesh;
}

// Two saddle-stitch staples along the spine: crowns under the book, clinches on the centre spread.
export function Staples({ heightM, clinchRef }: StaplesProps) {
  const { scene } = useGLTF(STAPLE_URL);
  const crown = part(scene, "GEO-staple-crown");
  const clinchL = part(scene, "GEO-staple-clinch-L");
  const clinchR = part(scene, "GEO-staple-clinch-R");
  const along = [-heightM / 4, heightM / 4];

  return (
    <group>
      {along.map((z) => (
        // The model's crown runs along x; the spine runs along z.
        <mesh key={`crown${z}`} geometry={crown.geometry} material={crown.material} position={[0, -0.0003, z]} rotation-y={Math.PI / 2} castShadow />
      ))}
      <group ref={clinchRef}>
        {along.map((z) => (
          <group key={`clinch${z}`} position-z={z} rotation-y={Math.PI / 2}>
            <mesh geometry={clinchL.geometry} material={clinchL.material} castShadow />
            <mesh geometry={clinchR.geometry} material={clinchR.material} castShadow />
          </group>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload(STAPLE_URL);
