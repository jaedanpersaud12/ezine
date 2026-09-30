"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import { MOUSE, TOUCH } from "three";
import { Book } from "@/components/reader/Book";
import { CuttingMat, MAT_TOP_M } from "@/components/reader/CuttingMat";

const CAMERA_REST: [number, number, number] = [0, 0.36, 0.26];

// The camera drops in from above the first time the scene appears.
function IntroCamera() {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const tween = gsap.fromTo(
      camera.position,
      { x: 0, y: 0.62, z: 0.08 },
      {
        x: CAMERA_REST[0],
        y: CAMERA_REST[1],
        z: CAMERA_REST[2],
        duration: 1.6,
        ease: "power3.out",
        onUpdate: () => camera.lookAt(0, 0, 0),
      },
    );
    return () => {
      tween.kill();
    };
  }, [camera]);

  return null;
}

type ReaderSceneProps = {
  widthMm: number;
  heightMm: number;
  leafCount: number;
  pageImage?: (side: number) => HTMLCanvasElement | undefined;
  stapled?: boolean;
  // Changes whenever the page art does, so the book rebuilds with new textures.
  version?: string;
};

export default function ReaderScene({ widthMm, heightMm, leafCount, pageImage, stapled = true, version = "" }: ReaderSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA_REST, fov: 38, near: 0.01, far: 5 }}
      className="touch-none"
    >
      <hemisphereLight intensity={0.9} />
      <directionalLight
        position={[-0.25, 0.6, 0.35]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.0004}
        shadow-camera-left={-0.3}
        shadow-camera-right={0.3}
        shadow-camera-top={0.3}
        shadow-camera-bottom={-0.3}
        shadow-camera-near={0.1}
        shadow-camera-far={1.5}
      />
      <Suspense fallback={null}>
        <CuttingMat />
        <group position-y={MAT_TOP_M}>
          <Book
            key={`${widthMm}x${heightMm}-${leafCount}-${version}`}
            widthMm={widthMm}
            heightMm={heightMm}
            leafCount={leafCount}
            pageImage={pageImage}
            stapled={stapled}
          />
        </group>
      </Suspense>
      <IntroCamera />
      {/* No LEFT / ONE binding: left drag and one finger turn pages (Book); right drag orbits, wheel or pinch zooms. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.15}
        maxDistance={0.9}
        maxPolarAngle={Math.PI * 0.46}
        mouseButtons={{ MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
        touches={{ TWO: TOUCH.DOLLY_ROTATE }}
      />
    </Canvas>
  );
}
