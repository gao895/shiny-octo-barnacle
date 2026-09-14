import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ASSET_URL = `${import.meta.env.BASE_URL}assets/avatar/body/chibi_rich_body.glb`;

/**
 * The authored "rich body" (public/assets/avatar/body/chibi_rich_body.glb)
 * is a single fully-textured, unrigged mesh (AI-generated via Tripo) with
 * the face — eyes, eyebrows, mouth, blush — baked directly into its
 * texture. It already uses three.js's Y-up/+Z-forward convention, so
 * unlike ChibiBaseBody.ts no per-vertex axis conversion is needed here —
 * just a uniform scale to match our rig (see RICH_BODY_SCALE / HumanoidRig.ts,
 * whose bone heights were re-measured from this asset's own vertex profile).
 *
 * Because it is one rigid, unrigged mesh, it cannot bend at elbows/knees:
 * selecting it trades per-limb animation (wave/dance/walk arm & leg
 * movement) for dramatically better sculpted/shaded body and face quality.
 * It is attached as a single rigid child of the hips bone, so whole-body
 * motions (idle breathing, jump height) still apply to it.
 */
export const RICH_BODY_SCALE = 0.85;

let cache: THREE.Object3D | null = null;
let inflight: Promise<THREE.Object3D> | null = null;

export function preloadRichBody(): Promise<THREE.Object3D> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = new GLTFLoader().loadAsync(ASSET_URL).then((gltf) => {
    const scene = gltf.scene;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    cache = scene;
    return scene;
  });

  return inflight;
}

export function getRichBody(): THREE.Object3D | null {
  return cache;
}
