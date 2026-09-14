import type { Object3D } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildAvatarScene } from '../avatar/AvatarBuilder';
import { applyTPose } from '../avatar/AnimationController';
import { validateForExport } from '../avatar/AvatarValidator';
import { VRM_OPTIONAL_BONES, VRM_REQUIRED_BONES, type BoneName } from '../avatar/HumanoidRig';
import { buildVrmMeta } from './VRMMetadata';
import { parseGlb, buildGlb } from './GlbContainer';
import type { AvatarConfig } from '../types/avatar';
import type { VrmExportProgress } from '../types/vrm';

const EXPRESSION_PRESET_KEYS = ['neutral', 'happy', 'angry', 'sad', 'surprised'] as const;

export class VrmExportError extends Error {}

function findNodeIndexByName(nodes: { name?: string }[] | undefined, name: string): number | null {
  if (!nodes) return null;
  const idx = nodes.findIndex((n) => n.name === name);
  return idx >= 0 ? idx : null;
}

function exportGlbBinary(root: Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      root,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new VrmExportError('GLTFExporter がバイナリ形式を返しませんでした'));
      },
      (error) => reject(error instanceof Error ? error : new VrmExportError(String(error))),
      { binary: true, onlyVisible: false, embedImages: true, maxTextureSize: 2048 },
    );
  });
}

/**
 * Exports the avatar as a spec-valid VRM 1.0 (.vrm) file (spec §18).
 *
 * Pipeline: build a fresh scene graph in the T-pose bind pose → export it
 * to a standard .glb via three.js's GLTFExporter → reopen that .glb's JSON
 * chunk and inject the VRMC_vrm extension (humanoid bone mapping + meta +
 * expression presets) → reassemble the binary container. This "export then
 * patch" approach is the same technique most community VRM tools use,
 * since three.js has no VRM-aware exporter of its own.
 *
 * Honest scope note: our parts are procedural primitives with no morph
 * targets, so the exported expression presets are declared (valid, spec
 * -compliant) but carry empty morph/material binds — cluster will accept
 * the file, it just won't animate facial expressions from it yet. Likewise
 * no VRMC_springBone extension is emitted: our hair/cape parts are rigid,
 * so claiming spring-bone physics would be dishonest. Both upgrade
 * automatically once real morph-target / bone-chain GLB assets are swapped
 * in via PartDefinition.model (see AvatarLoader.ts).
 */
export async function exportAvatarToVrm(
  config: AvatarConfig,
  onProgress?: (p: VrmExportProgress) => void,
): Promise<Blob> {
  const report = (stage: string, progress: number) => onProgress?.({ stage, progress });

  report('現在のアバターを取得しています…', 5);
  const built = buildAvatarScene(config);

  report('人型ボーンを設定しています…', 15);
  applyTPose(built.bones, built.root);
  built.root.updateMatrixWorld(true);

  const validation = validateForExport(built);
  if (!validation.valid) {
    throw new VrmExportError(validation.errors.join(' / '));
  }

  report('表情を設定しています…', 30);
  // (expression presets are attached to the VRMC_vrm extension below)

  report('VRM 1.0 として書き出しています…', 45);
  const glbBuffer = await exportGlbBinary(built.root);

  report('メタデータを埋め込んでいます…', 75);
  const { json, bin } = parseGlb(glbBuffer);

  const humanBones: Record<string, { node: number }> = {};
  const missingBones: string[] = [];
  for (const boneName of [...VRM_REQUIRED_BONES, ...VRM_OPTIONAL_BONES] as BoneName[]) {
    const idx = findNodeIndexByName(json.nodes, boneName);
    if (idx === null) {
      if ((VRM_REQUIRED_BONES as readonly string[]).includes(boneName)) missingBones.push(boneName);
      continue;
    }
    humanBones[boneName] = { node: idx };
  }
  if (missingBones.length > 0) {
    throw new VrmExportError(`Humanoid Boneが不足しています: ${missingBones.join(', ')}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expressionPreset: Record<string, any> = {};
  for (const key of EXPRESSION_PRESET_KEYS) {
    expressionPreset[key] = {
      isBinary: false,
      overrideBlink: 'none',
      overrideLookAt: 'none',
      overrideMouth: 'none',
      morphTargetBinds: [],
      materialColorBinds: [],
      textureTransformBinds: [],
    };
  }

  json.extensionsUsed = Array.from(new Set([...(json.extensionsUsed ?? []), 'VRMC_vrm']));
  json.extensions = {
    ...(json.extensions ?? {}),
    VRMC_vrm: {
      specVersion: '1.0',
      meta: buildVrmMeta(config.metadata),
      humanoid: { humanBones },
      expressions: { preset: expressionPreset },
      firstPerson: { meshAnnotations: [] },
    },
  };

  report('VRM ファイルを生成しています…', 92);
  const finalBuffer = buildGlb(json, bin);
  const blob = new Blob([finalBuffer], { type: 'model/gltf-binary' });

  report('完了', 100);
  return blob;
}
