import * as THREE from 'three';
import type { ExpressionConfig } from '../types/avatar';
import type { ExpressionTargets } from './AvatarBuilder';

const FALLBACK_BASE_SCALE = new THREE.Vector3(1, 1, 1);

/** Every primitive mesh records its authored scale in userData.baseScale
 * (see PartMeshFactory.ts) — expressions must scale relative to that, never
 * overwrite it outright, or an eye sphere authored at (0.03, 0.03, 0.012)
 * would balloon to a literal 1-unit sphere at "neutral" and swallow the
 * camera inside it. */
function baseScaleOf(mesh: THREE.Mesh): THREE.Vector3 {
  return (mesh.userData.baseScale as THREE.Vector3 | undefined) ?? FALLBACK_BASE_SCALE;
}

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
    const base = baseScaleOf(mesh);
    const openAmount = 1 + surprised * 1.8 + happy * 0.6 - sad * 0.3;
    mesh.scale.set(base.x, base.y * Math.max(0.15, openAmount), base.z);
  }

  for (const mesh of targets.eyes) {
    const base = baseScaleOf(mesh);
    const closeAmount = 1 - happy * 0.55;
    const bigAmount = 1 + surprised * 0.5;
    mesh.scale.set(base.x * bigAmount, base.y * Math.max(0.08, closeAmount * bigAmount), base.z);
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
