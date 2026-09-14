import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildHumanoidRig, type BoneName } from './HumanoidRig';

const ASSET_URL = '/assets/avatar/body/chibi_base_2head_tpose.glb';

/**
 * The authored asset (public/assets/avatar/body/chibi_base_2head_tpose.glb)
 * is a static, geometry-only T-pose body exported from a Z-up/Y-forward
 * tool (its own scene extras confirm this and that it carries no
 * skeleton/VRM data). We convert every mesh into three.js's Y-up/Z-forward
 * convention and scale it down to our ~0.85m rig (see HumanoidRig.ts,
 * whose joint positions were measured directly from this same asset).
 */
const AXIS_SCALE = 0.2;
const FOOT_OFFSET = 0.04; // raw z=-0.2 (heel bottom) -> y=0

/**
 * Which humanoid bone each named mesh in the asset rigidly attaches to.
 * Keys use the names as THREE's GLTFLoader exposes them at runtime: it
 * sanitizes node names for animation-binding safety, stripping dots — so
 * the source asset's "UpperArm.L" node comes through as "UpperArmL".
 */
const MESH_BONE_MAP: Record<string, BoneName> = {
  Head: 'head',
  Neck: 'chest',
  Torso: 'chest',
  Hips: 'hips',
  UpperArmL: 'leftShoulder',
  LowerArmL: 'leftUpperArm',
  HandL: 'leftLowerArm',
  UpperArmR: 'rightShoulder',
  LowerArmR: 'rightUpperArm',
  HandR: 'rightLowerArm',
  UpperLegL: 'hips',
  LowerLegL: 'leftUpperLeg',
  FootL: 'leftLowerLeg',
  UpperLegR: 'hips',
  LowerLegR: 'rightUpperLeg',
  FootR: 'rightLowerLeg',
};

export interface ChibiBodyPiece {
  geometry: THREE.BufferGeometry;
  bone: BoneName;
}

export type ChibiBaseBody = Map<string, ChibiBodyPiece>;

function convertToRigSpace(geometry: THREE.BufferGeometry, boneWorld: THREE.Vector3): THREE.BufferGeometry {
  const converted = geometry.clone();
  const position = converted.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const rawX = position.getX(i);
    const rawY = position.getY(i);
    const rawZ = position.getZ(i);
    // Z-up, Y-forward (raw) -> Y-up, Z-forward (three.js), scaled to meters,
    // then made relative to the target bone's bind-pose world position so
    // the mesh rotates correctly around that joint.
    const x = rawX * AXIS_SCALE - boneWorld.x;
    const y = rawZ * AXIS_SCALE + FOOT_OFFSET - boneWorld.y;
    const z = -rawY * AXIS_SCALE - boneWorld.z;
    position.setXYZ(i, x, y, z);
  }
  position.needsUpdate = true;
  converted.computeVertexNormals();
  converted.computeBoundingBox();
  converted.computeBoundingSphere();
  return converted;
}

let cache: ChibiBaseBody | null = null;
let inflight: Promise<ChibiBaseBody> | null = null;

/** Kicks off (and memoizes) loading + converting the base body once. */
export function preloadChibiBaseBody(): Promise<ChibiBaseBody> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  const { bones } = buildHumanoidRig();
  const worldPos = new THREE.Vector3();

  inflight = new GLTFLoader().loadAsync(ASSET_URL).then((gltf) => {
    const pieces: ChibiBaseBody = new Map();
    gltf.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const boneName = MESH_BONE_MAP[obj.name];
      if (!boneName) return; // skip the asset's own Ear/Eye/EyeHighlight/Mouth meshes
      bones[boneName].getWorldPosition(worldPos);
      pieces.set(obj.name, { geometry: convertToRigSpace(obj.geometry, worldPos), bone: boneName });
    });
    cache = pieces;
    return pieces;
  });

  return inflight;
}

export function getChibiBaseBody(): ChibiBaseBody | null {
  return cache;
}
