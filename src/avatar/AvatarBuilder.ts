import * as THREE from 'three';
import { buildHumanoidRig, type BoneName, type Rig } from './HumanoidRig';
import { buildPrimitiveMesh, countMeshTriangles } from './PartMeshFactory';
import { getPartById } from './PartManager';
import { getChibiBaseBody } from './ChibiBaseBody';
import type { AvatarConfig, ColorableSlot } from '../types/avatar';
import type { PartCategory, PartDefinition } from '../types/parts';

/** Subtle per-variant silhouette tweaks, applied as a mesh-local scale so
 * they never disturb the shared skeleton or any attached parts. */
const FACE_SCALE: Record<string, [number, number, number]> = {
  face_normal: [1, 1, 1],
  face_cute: [0.97, 0.96, 1.02],
  face_round: [1.06, 1.03, 1.02],
  face_anime: [0.98, 1.04, 1],
};
const BODY_SCALE: Record<string, [number, number, number]> = {
  body_01: [1, 1, 1],
  body_02: [0.9, 1, 0.92],
  body_03: [1.12, 0.97, 1.1],
};

export interface ExpressionTargets {
  mouth: THREE.Mesh[];
  eyes: THREE.Mesh[];
  eyebrowLeft: THREE.Mesh;
  eyebrowRight: THREE.Mesh;
  blushLeft: THREE.Mesh;
  blushRight: THREE.Mesh;
  headBone: THREE.Bone;
}

export interface BuiltAvatar {
  root: THREE.Group;
  bones: Rig;
  expressionTargets: ExpressionTargets;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  usedParts: PartDefinition[];
}

const SLOT_CATEGORY: Record<ColorableSlot, PartCategory> = {
  hair: 'hair',
  eyes: 'eyes',
  clothes: 'clothes',
  shoes: 'shoes',
  accessories: 'accessories',
};
void SLOT_CATEGORY; // documents the category<->slot mapping used by ColorPicker

function attachPart(
  part: PartDefinition,
  bones: Rig,
  color: string | null,
  materialRegistry: Map<string, THREE.MeshStandardMaterial>,
): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const bone = bones[part.attachTo as BoneName];
  const group = new THREE.Group();
  group.name = `part_${part.id}`;
  const meshes: THREE.Mesh[] = [];

  part.primitive.forEach((node, i) => {
    const useColor = node.color ?? (node.colorable && color ? color : part.defaultColor);
    const matKey = `${part.id}:${i}:${useColor}`;
    let material = materialRegistry.get(matKey);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: useColor,
        roughness: 0.6,
        metalness: 0.05,
      });
      materialRegistry.set(matKey, material);
    }
    const mesh = buildPrimitiveMesh(node, material, `${part.id}_${i}`);
    group.add(mesh);
    meshes.push(mesh);
  });

  bone.add(group);
  return { group, meshes };
}

const LIMB_SEGMENTS: [BoneName, BoneName, number][] = [
  ['leftShoulder', 'leftUpperArm', 0.04],
  ['leftUpperArm', 'leftLowerArm', 0.037],
  ['leftLowerArm', 'leftHand', 0.032],
  ['rightShoulder', 'rightUpperArm', 0.04],
  ['rightUpperArm', 'rightLowerArm', 0.037],
  ['rightLowerArm', 'rightHand', 0.032],
  ['hips', 'leftUpperLeg', 0.065],
  ['leftUpperLeg', 'leftLowerLeg', 0.06],
  ['leftLowerLeg', 'leftFoot', 0.05],
  ['hips', 'rightUpperLeg', 0.065],
  ['rightUpperLeg', 'rightLowerLeg', 0.06],
  ['rightLowerLeg', 'rightFoot', 0.05],
];

/**
 * Our PartDefinitions only cover torso/head/accessories — nothing in
 * parts.json supplies arm or leg geometry. Rather than requiring every
 * body variant to author its own limbs, we generate simple capsule limbs
 * procedurally from the humanoid rig itself (bone.position already holds
 * the parent-relative offset, so each segment's length/orientation comes
 * straight from the skeleton) and skin them with the selected body part's
 * color. This keeps §7's "脚:約25%" proportion and gives animations
 * (wave/dance/walk) something visible to move.
 */
function buildLimbs(
  bones: Rig,
  skinColor: string,
  materialRegistry: Map<string, THREE.MeshStandardMaterial>,
): THREE.Mesh[] {
  const matKey = `skin:${skinColor}`;
  let material = materialRegistry.get(matKey);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
    materialRegistry.set(matKey, material);
  }

  const meshes: THREE.Mesh[] = [];
  for (const [parentName, childName, radius] of LIMB_SEGMENTS) {
    const parentBone = bones[parentName];
    const childBone = bones[childName];
    const offset = childBone.position;
    const length = offset.length();
    const capLength = Math.max(0.006, length - radius * 2);
    const geometry = new THREE.CapsuleGeometry(radius, capLength, 4, 8);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `limb_${parentName}_${childName}`;
    mesh.position.copy(offset).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), offset.clone().normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parentBone.add(mesh);
    meshes.push(mesh);
  }

  const handGeometry = new THREE.SphereGeometry(0.036, 12, 10);
  for (const handBone of [bones.leftHand, bones.rightHand]) {
    const handMesh = new THREE.Mesh(handGeometry, material);
    handMesh.name = 'hand_cap';
    handMesh.position.set(0, -0.02, 0);
    handMesh.castShadow = true;
    handBone.add(handMesh);
    meshes.push(handMesh);
  }

  return meshes;
}

/**
 * A short cylindrical neck connecting the chest to the head bone (spec's
 * Nendoroid-style reference: a distinct neck "attachment area" rather than
 * the head floating directly on the torso). Spans chest→head directly — the
 * head sphere naturally overlaps and hides its upper portion, exactly like
 * a doll's head socketed onto a neck peg.
 */
function buildNeck(
  bones: Rig,
  skinColor: string,
  materialRegistry: Map<string, THREE.MeshStandardMaterial>,
): THREE.Mesh {
  const matKey = `skin:${skinColor}`;
  let material = materialRegistry.get(matKey);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
    materialRegistry.set(matKey, material);
  }
  const length = bones.neck.position.y + bones.head.position.y;
  const geometry = new THREE.CylinderGeometry(0.052, 0.06, length, 14);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'neck';
  mesh.position.set(0, length / 2, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  bones.chest.add(mesh);
  return mesh;
}

function buildExpressionExtras(headBone: THREE.Bone): Omit<ExpressionTargets, 'mouth' | 'eyes' | 'headBone'> {
  const browMaterial = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.8 });
  const eyebrowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.008), browMaterial);
  eyebrowLeft.name = 'eyebrowLeft';
  eyebrowLeft.position.set(-0.075, 0.05, 0.25);
  const eyebrowRight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.008), browMaterial);
  eyebrowRight.name = 'eyebrowRight';
  eyebrowRight.position.set(0.075, 0.05, 0.25);

  const blushGeometry = new THREE.CircleGeometry(0.02, 12);
  const blushLeft = new THREE.Mesh(
    blushGeometry,
    new THREE.MeshBasicMaterial({ color: '#ff8ac1', transparent: true, opacity: 0 }),
  );
  blushLeft.name = 'blushLeft';
  blushLeft.position.set(-0.11, -0.04, 0.21);
  blushLeft.rotation.y = -0.5;
  const blushRight = new THREE.Mesh(
    blushGeometry,
    new THREE.MeshBasicMaterial({ color: '#ff8ac1', transparent: true, opacity: 0 }),
  );
  blushRight.name = 'blushRight';
  blushRight.position.set(0.11, -0.04, 0.21);
  blushRight.rotation.y = 0.5;

  headBone.add(eyebrowLeft, eyebrowRight, blushLeft, blushRight);
  return { eyebrowLeft, eyebrowRight, blushLeft, blushRight };
}

/**
 * Attaches the authored base body (public/assets/avatar/body/…glb, see
 * ChibiBaseBody.ts) onto the skeleton, one mesh per bone. Returns the
 * meshes keyed by name so face/body variants can nudge their scale
 * (FACE_SCALE / BODY_SCALE) without touching the skeleton itself.
 */
function attachRealBody(
  bones: Rig,
  skinColor: string,
  materialRegistry: Map<string, THREE.MeshStandardMaterial>,
): Map<string, THREE.Mesh> {
  const baseBody = getChibiBaseBody();
  const meshesByName = new Map<string, THREE.Mesh>();
  if (!baseBody) return meshesByName;

  const matKey = `skin:${skinColor}`;
  let material = materialRegistry.get(matKey);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
    materialRegistry.set(matKey, material);
  }

  for (const [name, piece] of baseBody) {
    const mesh = new THREE.Mesh(piece.geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bones[piece.bone].add(mesh);
    meshesByName.set(name, mesh);
  }
  return meshesByName;
}

/**
 * Rebuilds the entire avatar Object3D graph from an AvatarConfig. This is
 * deliberately a full rebuild rather than an incremental diff: with a
 * primitive-shape part count this small it is fast (<1ms), and it keeps the
 * mental model simple ("config in, scene graph out") for both the live
 * preview and the VRM exporter, which call this same function.
 */
export function buildAvatarScene(config: AvatarConfig): BuiltAvatar {
  const { root, bones } = buildHumanoidRig();
  const materialRegistry = new Map<string, THREE.MeshStandardMaterial>();
  const usedParts: PartDefinition[] = [];
  let mouthMeshes: THREE.Mesh[] = [];
  let eyeMeshes: THREE.Mesh[] = [];

  const attachSimple = (category: PartCategory, id: string | null, slot: ColorableSlot | null) => {
    const part = getPartById(category, id);
    if (!part) return null;
    usedParts.push(part);
    const color = slot ? config.colors[slot] : null;
    return attachPart(part, bones, color, materialRegistry);
  };

  const bodyPart = getPartById('body', config.parts.body);
  const facePart = getPartById('face', config.parts.face);
  if (bodyPart) {
    const realBodyMeshes = attachRealBody(bones, bodyPart.defaultColor, materialRegistry);
    if (realBodyMeshes.size > 0) {
      usedParts.push(bodyPart);
      if (facePart) usedParts.push(facePart);
      const bodyScale = BODY_SCALE[bodyPart.id] ?? [1, 1, 1];
      realBodyMeshes.get('Torso')?.scale.set(...bodyScale);
      realBodyMeshes.get('Hips')?.scale.set(...bodyScale);
      const faceScale = FACE_SCALE[facePart?.id ?? ''] ?? [1, 1, 1];
      realBodyMeshes.get('Head')?.scale.set(...faceScale);
    } else {
      // Real asset not loaded yet (or unavailable) — fall back to
      // procedural primitives so the app is never blocked on the network.
      attachSimple('body', config.parts.body, null);
      attachSimple('face', config.parts.face, null);
      buildLimbs(bones, bodyPart.defaultColor, materialRegistry);
      buildNeck(bones, bodyPart.defaultColor, materialRegistry);
    }
  }

  const eyesResult = attachSimple('eyes', config.parts.eyes, 'eyes');
  if (eyesResult) eyeMeshes = eyesResult.meshes;

  const mouthResult = attachSimple('mouth', config.parts.mouth, null);
  if (mouthResult) mouthMeshes = mouthResult.meshes;

  attachSimple('hair', config.parts.hair, 'hair');
  attachSimple('clothes', config.parts.clothes, 'clothes');
  attachSimple('back', config.parts.back, null);

  const shoePart = getPartById('shoes', config.parts.shoes);
  if (shoePart) {
    usedParts.push(shoePart);
    const left = attachPart(shoePart, bones, config.colors.shoes, materialRegistry);
    const rightGroup = left.group.clone();
    rightGroup.name = `part_${shoePart.id}_right`;
    rightGroup.children.forEach((child) => {
      child.position.x *= -1;
    });
    bones.rightFoot.add(rightGroup);
  }

  for (const accessoryId of config.parts.accessories) {
    attachSimple('accessories', accessoryId, 'accessories');
  }

  const extras = buildExpressionExtras(bones.head);

  let triangleCount = 0;
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) triangleCount += countMeshTriangles(obj);
  });

  return {
    root,
    bones,
    expressionTargets: {
      mouth: mouthMeshes,
      eyes: eyeMeshes,
      ...extras,
      headBone: bones.head,
    },
    triangleCount: Math.round(triangleCount),
    materialCount: materialRegistry.size,
    textureCount: 0,
    usedParts,
  };
}
