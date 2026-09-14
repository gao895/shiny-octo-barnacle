import * as THREE from 'three';

/**
 * VRM 1.0 requires this exact set of humanoid bones at minimum. The rig
 * below builds all of them (plus a few optional ones) so that every VRM we
 * export is a spec-valid humanoid, regardless of which bones our simple
 * primitive parts happen to attach to.
 */
export const VRM_REQUIRED_BONES = [
  'hips',
  'spine',
  'head',
  'leftUpperArm',
  'rightUpperArm',
  'leftLowerArm',
  'rightLowerArm',
  'leftHand',
  'rightHand',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftFoot',
  'rightFoot',
] as const;

export type VrmRequiredBoneName = (typeof VRM_REQUIRED_BONES)[number];

export const VRM_OPTIONAL_BONES = ['neck', 'chest', 'leftShoulder', 'rightShoulder'] as const;
export type VrmOptionalBoneName = (typeof VRM_OPTIONAL_BONES)[number];

export type BoneName = VrmRequiredBoneName | VrmOptionalBoneName;

interface BoneSpec {
  name: BoneName;
  parent: BoneName | null;
  /** local position offset from the parent bone, in meters */
  position: [number, number, number];
}

/**
 * A "2-head-tall" (二頭身) doll-style humanoid skeleton. Joint heights are
 * derived from the current base body mesh's own vertex profile — bucketing
 * vertices by Y and tracking silhouette width reveals the leg column
 * (0–42% of height), the T-pose arm span (44–52%), the neck pinch
 * (~53%) and the head (54–100%) — scaled by RICH_BODY_SCALE (see
 * RichBodyModel.ts) so the skeleton lines up with that geometry. Feet sit
 * at y=0 (spec §7/10, shared Avatar Coordinate System). Only hair/clothes/
 * shoes/accessories actually hang off these bones now — the body itself is
 * one rigid unrigged mesh parented to `hips` (see AvatarBuilder.ts).
 */
const BONE_SPECS: BoneSpec[] = [
  { name: 'hips', parent: null, position: [0, 0.357, 0] },
  { name: 'spine', parent: 'hips', position: [0, 0.03, 0] },
  { name: 'chest', parent: 'spine', position: [0, 0.038, 0] },
  { name: 'neck', parent: 'chest', position: [0, 0.026, 0] },
  { name: 'head', parent: 'neck', position: [0, 0.25, 0] },

  { name: 'leftShoulder', parent: 'chest', position: [-0.07, -0.01, 0] },
  { name: 'leftUpperArm', parent: 'leftShoulder', position: [-0.128, 0, 0] },
  { name: 'leftLowerArm', parent: 'leftUpperArm', position: [-0.082, 0, 0] },
  { name: 'leftHand', parent: 'leftLowerArm', position: [-0.05, 0, 0] },

  { name: 'rightShoulder', parent: 'chest', position: [0.07, -0.01, 0] },
  { name: 'rightUpperArm', parent: 'rightShoulder', position: [0.128, 0, 0] },
  { name: 'rightLowerArm', parent: 'rightUpperArm', position: [0.082, 0, 0] },
  { name: 'rightHand', parent: 'rightLowerArm', position: [0.05, 0, 0] },

  { name: 'leftUpperLeg', parent: 'hips', position: [-0.067, -0.03, 0] },
  { name: 'leftLowerLeg', parent: 'leftUpperLeg', position: [-0.005, -0.16, 0] },
  { name: 'leftFoot', parent: 'leftLowerLeg', position: [0, -0.16, 0.02] },

  { name: 'rightUpperLeg', parent: 'hips', position: [0.067, -0.03, 0] },
  { name: 'rightLowerLeg', parent: 'rightUpperLeg', position: [0.005, -0.16, 0] },
  { name: 'rightFoot', parent: 'rightLowerLeg', position: [0, -0.16, 0.02] },
];

export type Rig = Record<BoneName, THREE.Bone>;

export interface BuiltHumanoidRig {
  hipsBone: THREE.Bone;
  bones: Rig;
  root: THREE.Group;
}

export function buildHumanoidRig(): BuiltHumanoidRig {
  const bones = {} as Rig;
  const root = new THREE.Group();
  root.name = 'ChibiAvatarRoot';

  for (const spec of BONE_SPECS) {
    const bone = new THREE.Bone();
    bone.name = spec.name;
    bone.position.set(...spec.position);
    bones[spec.name] = bone;
    if (spec.parent) {
      bones[spec.parent].add(bone);
    } else {
      root.add(bone);
    }
  }

  return { hipsBone: bones.hips, bones, root };
}

export function getBoneWorldHeight(bones: Rig, name: BoneName): number {
  const v = new THREE.Vector3();
  bones[name].getWorldPosition(v);
  return v.y;
}
