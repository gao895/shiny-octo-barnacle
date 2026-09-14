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
 * A "2-head-tall" (二頭身) doll-style humanoid skeleton. Joint positions are
 * derived directly from the authored base body mesh
 * (public/assets/avatar/body/chibi_base_2head_tpose.glb — see
 * ChibiBaseBody.ts) so the skeleton lines up exactly with that geometry:
 * head/torso/legs are ~50%/25%/25% of the ~0.85m total height, feet at
 * y=0 (spec §7/10, shared Avatar Coordinate System).
 */
const BONE_SPECS: BoneSpec[] = [
  { name: 'hips', parent: null, position: [0, 0.276, 0] },
  { name: 'spine', parent: 'hips', position: [0, 0.034, 0] },
  { name: 'chest', parent: 'spine', position: [0, 0.186, 0] },
  { name: 'neck', parent: 'chest', position: [0, 0.009, 0] },
  { name: 'head', parent: 'neck', position: [0, 0.145, 0] },

  { name: 'leftShoulder', parent: 'chest', position: [-0.07, -0.036, 0] },
  { name: 'leftUpperArm', parent: 'leftShoulder', position: [-0.128, 0, 0] },
  { name: 'leftLowerArm', parent: 'leftUpperArm', position: [-0.082, 0, 0] },
  { name: 'leftHand', parent: 'leftLowerArm', position: [-0.05, 0, 0] },

  { name: 'rightShoulder', parent: 'chest', position: [0.07, -0.036, 0] },
  { name: 'rightUpperArm', parent: 'rightShoulder', position: [0.128, 0, 0] },
  { name: 'rightLowerArm', parent: 'rightUpperArm', position: [0.082, 0, 0] },
  { name: 'rightHand', parent: 'rightLowerArm', position: [0.05, 0, 0] },

  { name: 'leftUpperLeg', parent: 'hips', position: [-0.067, -0.031, 0] },
  { name: 'leftLowerLeg', parent: 'leftUpperLeg', position: [-0.005, -0.1, 0] },
  { name: 'leftFoot', parent: 'leftLowerLeg', position: [0, -0.1, 0.02] },

  { name: 'rightUpperLeg', parent: 'hips', position: [0.067, -0.031, 0] },
  { name: 'rightLowerLeg', parent: 'rightUpperLeg', position: [0.005, -0.1, 0] },
  { name: 'rightFoot', parent: 'rightLowerLeg', position: [0, -0.1, 0.02] },
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
