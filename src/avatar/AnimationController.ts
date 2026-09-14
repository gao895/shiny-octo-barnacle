import type { Rig } from './HumanoidRig';
import type * as THREE from 'three';
import type { AnimationClipName } from '../types/avatar';

function resetPoseBones(bones: Rig): void {
  for (const bone of Object.values(bones)) {
    bone.rotation.set(0, 0, 0);
  }
}

/**
 * VRM Humanoid T-pose (spec §17): arms straight out to the sides, legs
 * straight. The skeleton's bind pose (all bone rotations at 0) already *is*
 * this T-pose — its joint positions were measured directly from an
 * authored T-pose base mesh (see HumanoidRig.ts / ChibiBaseBody.ts) — so
 * this is just a reset, not an additional rotation.
 */
export function applyTPose(bones: Rig, root: THREE.Group): void {
  resetPoseBones(bones);
  root.position.y = 0;
}

/**
 * Simple procedural loop animations (spec §16). These directly rotate
 * humanoid bones each frame — no baked AnimationClip assets are needed for
 * an MVP, and the same bone rig drives both the live preview and (via
 * VRMExporter) whatever animation is later imported by cluster.
 *
 * Because the bind pose is T-pose (arms out to the sides), bringing an arm
 * down to a relaxed/hanging position is a ~+-90° rotation from 0, not from
 * a hanging rest pose — see the leftUpperArm/rightUpperArm formulas below.
 */
export function applyAnimationFrame(
  bones: Rig,
  root: THREE.Group,
  clip: AnimationClipName,
  time: number,
): void {
  resetPoseBones(bones);
  root.position.set(0, 0, 0);
  root.rotation.y = 0;

  switch (clip) {
    case 'idle': {
      const breathe = Math.sin(time * 1.8) * 0.02;
      root.position.y = Math.max(0, breathe);
      bones.chest.rotation.x = breathe * 0.5;
      bones.leftUpperArm.rotation.z = Math.PI / 2 - 0.9 + Math.sin(time * 1.8) * 0.03;
      bones.rightUpperArm.rotation.z = -(Math.PI / 2 - 0.9) - Math.sin(time * 1.8) * 0.03;
      bones.head.rotation.y = Math.sin(time * 0.6) * 0.08;
      break;
    }
    case 'wave': {
      bones.rightUpperArm.rotation.z = -Math.PI / 2 + 0.2;
      bones.rightUpperArm.rotation.x = -0.3;
      bones.rightLowerArm.rotation.z = Math.sin(time * 6) * 0.5 - 0.6;
      bones.leftUpperArm.rotation.z = Math.PI / 2 - 0.9;
      bones.head.rotation.z = Math.sin(time * 6) * 0.03;
      break;
    }
    case 'dance': {
      const swing = Math.sin(time * 5);
      bones.hips.rotation.y = swing * 0.25;
      bones.hips.position.y = Math.abs(Math.cos(time * 5)) * 0.02;
      bones.chest.rotation.z = swing * 0.08;
      bones.leftUpperArm.rotation.z = Math.PI / 2 - 0.9 + swing * 0.4;
      bones.rightUpperArm.rotation.z = -(Math.PI / 2 - 0.9) - swing * 0.4;
      bones.leftUpperLeg.rotation.z = -swing * 0.15;
      bones.rightUpperLeg.rotation.z = swing * 0.15;
      bones.head.rotation.y = swing * 0.15;
      break;
    }
    case 'jump': {
      const cycle = (time * 1.6) % (Math.PI * 2);
      const up = Math.max(0, Math.sin(cycle));
      root.position.y = up * 0.18;
      bones.leftUpperLeg.rotation.x = -up * 0.6;
      bones.rightUpperLeg.rotation.x = -up * 0.6;
      bones.leftLowerLeg.rotation.x = up * 0.8;
      bones.rightLowerLeg.rotation.x = up * 0.8;
      bones.leftUpperArm.rotation.z = Math.PI / 2 - 0.9 - up * 0.6;
      bones.rightUpperArm.rotation.z = -(Math.PI / 2 - 0.9) + up * 0.6;
      break;
    }
    case 'walk': {
      const stride = Math.sin(time * 5);
      bones.leftUpperLeg.rotation.x = stride * 0.5;
      bones.rightUpperLeg.rotation.x = -stride * 0.5;
      bones.leftLowerLeg.rotation.x = Math.max(0, -stride) * 0.4;
      bones.rightLowerLeg.rotation.x = Math.max(0, stride) * 0.4;
      bones.leftUpperArm.rotation.x = -stride * 0.4;
      bones.rightUpperArm.rotation.x = stride * 0.4;
      bones.leftUpperArm.rotation.z = Math.PI / 2 - 0.95;
      bones.rightUpperArm.rotation.z = -(Math.PI / 2 - 0.95);
      root.position.y = Math.abs(Math.sin(time * 10)) * 0.015;
      break;
    }
  }
}
