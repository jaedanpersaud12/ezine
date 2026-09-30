import gsap from "gsap";
import {
  AnimationMixer,
  CanvasTexture,
  SRGBColorSpace,
  type AnimationAction,
  type AnimationClip,
  type Material,
  MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
  type Texture,
} from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildStack, leafHeight, leafKind, type LeafKind } from "@/lib/book/stack";
import { makePlaceholderPage } from "@/lib/book/placeholder";
import { mmToM } from "@/lib/book/trim";

// A whole book cloned from leaf.glb, plus the imperative turn logic.
// Contract: ~/Projects/zine-assets/leaf-kit/README.md.

const TURN_SECONDS: Record<LeafKind, number> = { page: 0.85, cover: 1.2 };
const TURN_STAGGER_SECONDS = 0.12;
const SETTLE_SECONDS = 0.4;

type Leaf = {
  root: Object3D;
  mixer: AnimationMixer;
  action: AnimationAction;
  kind: LeafKind;
  state: { p: number };
  target: number;
  textures: Texture[];
  materials: Material[];
};

export type BookRigOptions = {
  gltfScene: Object3D;
  animations: AnimationClip[];
  widthMm: number;
  heightMm: number;
  leafCount: number;
  maxAnisotropy: number;
  // Real page art, by 1-based side number; placeholders fill any gaps.
  pageImage?: (side: number) => HTMLCanvasElement | undefined;
};

export type BookRig = {
  leafCount: number;
  widthM: number;
  heightM: number;
  roots: Object3D[];
  // Saddle-stitch clinches follow the centre spread's surface.
  setClinch: (clinch: Object3D | null) => void;
  setProgress: (index: number, p: number) => void;
  progress: (index: number) => number;
  // Turn every leaf that's on the wrong side of `opened`, staggered in reading order.
  turnTo: (opened: number) => void;
  // Stop a leaf's tween so a drag can own it.
  hold: (index: number) => void;
  // Ease a leaf back to where it belongs after a drag that didn't commit.
  settle: (index: number) => void;
  dispose: () => void;
};

function isSkinnedMesh(o: Object3D): o is SkinnedMesh {
  return "isSkinnedMesh" in o && o.isSkinnedMesh === true;
}

function findClip(clips: AnimationClip[], name: string): AnimationClip {
  const clip = clips.find((c) => c.name === name);
  if (!clip) throw new Error(`leaf.glb is missing the "${name}" clip`);
  return clip;
}

export function createBookRig(options: BookRigOptions): BookRig {
  const { gltfScene, animations, widthMm, heightMm, leafCount, maxAnisotropy, pageImage } = options;
  const w = mmToM(widthMm);
  const h = mmToM(heightMm);
  const stack = buildStack(leafCount, w);
  const sideCount = leafCount * 2;

  const templates: Record<LeafKind, Object3D | undefined> = {
    page: gltfScene.getObjectByName("LEAF-page"),
    cover: gltfScene.getObjectByName("LEAF-cover"),
  };
  const clips: Record<LeafKind, AnimationClip> = {
    page: findClip(animations, "turn"),
    cover: findClip(animations, "turn_cover"),
  };

  const leaves: Leaf[] = Array.from({ length: leafCount }, (_, i) => {
    const kind = leafKind(i, leafCount);
    const template = templates[kind];
    if (!template) throw new Error(`leaf.glb is missing LEAF-${kind}`);

    const root = SkeletonUtils.clone(template);
    root.scale.set(w, w, h); // width on x AND y, height on z: keeps the curl undistorted

    const pageTexture = (side: number): Texture => {
      const image = pageImage?.(side);
      if (!image) return makePlaceholderPage(side, sideCount, widthMm, heightMm, maxAnisotropy);
      const texture = new CanvasTexture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false; // glTF UV convention
      texture.anisotropy = maxAnisotropy;
      return texture;
    };
    const recto = pageTexture(i * 2 + 1);
    const verso = pageTexture(i * 2 + 2);
    const materials: Material[] = [];

    root.traverse((o) => {
      if (!isSkinnedMesh(o) || !(o.material instanceof MeshStandardMaterial)) return;
      const material = o.material.clone();
      if (material.name === "MAT-leaf-front") material.map = recto;
      if (material.name === "MAT-leaf-back") material.map = verso;
      if (material.map) material.color.set(0xffffff);
      o.material = material;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // the bind-pose bounds don't follow the turn
      materials.push(material);
    });

    const mixer = new AnimationMixer(root);
    const action = mixer.clipAction(clips[kind]);
    action.play();
    action.paused = true;

    return { root, mixer, action, kind, state: { p: 0 }, target: 0, textures: [recto, verso], materials };
  });

  const centreA = leafCount / 2 - 1;
  const centreB = leafCount / 2;
  let clinch: Object3D | null = null;

  const placeClinch = (): void => {
    if (!clinch) return;
    const a = leaves[centreA].state.p;
    const b = leaves[centreB].state.p;
    const topA = leafHeight(stack, centreA, a) + stack.thickness[centreA] / 2;
    const topB = leafHeight(stack, centreB, b) + stack.thickness[centreB] / 2;
    clinch.position.y = a < 0.5 ? topB : b >= 0.5 ? topA : Math.max(topA, topB);
  };

  const setProgress = (index: number, p: number): void => {
    const leaf = leaves[index];
    leaf.state.p = p;
    leaf.action.time = p * leaf.action.getClip().duration;
    leaf.mixer.update(0);
    leaf.root.position.y = leafHeight(stack, index, p);
    if (index === centreA || index === centreB) placeClinch();
  };

  const tween = (index: number, to: number, duration: number, delay: number, ease: string): void => {
    const leaf = leaves[index];
    gsap.to(leaf.state, {
      p: to,
      duration,
      delay,
      ease,
      overwrite: true,
      onUpdate: () => setProgress(index, leaf.state.p),
    });
  };

  leaves.forEach((_, i) => setProgress(i, 0));

  return {
    leafCount,
    widthM: w,
    heightM: h,
    roots: leaves.map((l) => l.root),
    setClinch: (object) => {
      clinch = object;
      placeClinch();
    },
    setProgress,
    progress: (index) => leaves[index].state.p,
    turnTo: (opened) => {
      const changing = leaves
        .map((leaf, i) => ({ leaf, i, target: i < opened ? 1 : 0 }))
        .filter(({ leaf, target }) => leaf.target !== target);
      if (changing.some(({ target }) => target === 0)) changing.reverse();

      changing.forEach(({ leaf, i, target }, order) => {
        leaf.target = target;
        const distance = Math.max(0.35, Math.abs(target - leaf.state.p));
        tween(i, target, TURN_SECONDS[leaf.kind] * distance, order * TURN_STAGGER_SECONDS, "sine.inOut");
      });
    },
    hold: (index) => {
      gsap.killTweensOf(leaves[index].state);
    },
    settle: (index) => {
      tween(index, leaves[index].target, SETTLE_SECONDS, 0, "power2.out");
    },
    dispose: () => {
      leaves.forEach((leaf) => {
        // Safe to run twice (StrictMode): three re-uploads disposed textures and materials on next use.
        gsap.killTweensOf(leaf.state);
        leaf.textures.forEach((t) => t.dispose());
        leaf.materials.forEach((m) => m.dispose());
      });
    },
  };
}
