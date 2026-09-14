import * as THREE from 'three';
import type { ExpressionConfig } from '../types/avatar';
import type { ExpressionTargets } from './AvatarBuilder';

const baseScale = new THREE.Vector3(1, 1, 1);

/**
 * Drives the mouth / eye / eyebrow / blush meshes from the current
 * expression weights. Our placeholder parts have no morph targets, so the
 * "VRM Expression" system is approximated with simple transform + opacity
 * changes — see VRMExporter.ts for how this maps (or doesn't) onto the
 * exported VRMC_vrm expressions block.
 */
export function applyExpression(targets: ExpressionTargets, expression: ExpressionConfig): void {
  const { happy, angry, sad, surprised } = expression;

  for (const mesh of targets.mouth) {
    const openAmount = 1 + surprised * 1.8 + happy * 0.6 - sad * 0.3;
    mesh.scale.set(baseScale.x, Math.max(0.15, openAmount), baseScale.z);
  }

  for (const mesh of targets.eyes) {
    const closeAmount = 1 - happy * 0.55;
    const bigAmount = 1 + surprised * 0.5;
    mesh.scale.set(bigAmount, Math.max(0.08, closeAmount * bigAmount), 1);
  }

  const browTilt = angry * 0.5 - sad * 0.35;
  const browLift = surprised * 0.03;
  targets.eyebrowLeft.rotation.z = -browTilt;
  targets.eyebrowRight.rotation.z = browTilt;
  targets.eyebrowLeft.position.y = 0.045 + browLift;
  targets.eyebrowRight.position.y = 0.045 + browLift;

  const blushOpacity = Math.min(1, happy * 0.9);
  (targets.blushLeft.material as THREE.MeshBasicMaterial).opacity = blushOpacity;
  (targets.blushRight.material as THREE.MeshBasicMaterial).opacity = blushOpacity;
}
