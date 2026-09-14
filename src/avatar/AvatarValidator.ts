import type { AvatarConfig } from '../types/avatar';
import type { ValidationResult } from '../types/vrm';
import { VRM_REQUIRED_BONES } from './HumanoidRig';
import type { BuiltAvatar } from './AvatarBuilder';
import { getPartById } from './PartManager';

const REQUIRED_CATEGORIES = ['body', 'face', 'eyes', 'mouth', 'hair', 'clothes', 'shoes'] as const;

/**
 * Validates the avatar *configuration* — used before export and whenever an
 * avatar is loaded from localStorage / imported JSON, so a corrupted or
 * hand-edited file never silently produces a broken model (spec §58).
 */
export function validateAvatar(config: AvatarConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const category of REQUIRED_CATEGORIES) {
    const id = config.parts[category];
    if (!id) {
      errors.push(`「${category}」パーツが選択されていません`);
      continue;
    }
    if (!getPartById(category, id)) {
      errors.push(`「${category}」パーツ (${id}) が見つかりません`);
    }
  }

  for (const accessoryId of config.parts.accessories) {
    if (!getPartById('accessories', accessoryId)) {
      warnings.push(`アクセサリー (${accessoryId}) が見つかりません。スキップされます`);
    }
  }

  if (config.parts.back && !getPartById('back', config.parts.back)) {
    warnings.push(`背中アクセサリー (${config.parts.back}) が見つかりません。スキップされます`);
  }

  if (!config.metadata.name.trim()) {
    warnings.push('アバター名が入力されていません');
  }

  return { valid: errors.length === 0, warnings, errors };
}

/**
 * Validates the *built* scene graph right before VRM export: this is where
 * we confirm every required VRM 1.0 humanoid bone actually made it into the
 * skeleton (spec §17/§58 — "Humanoid Boneが不足しています" style errors).
 */
export function validateForExport(built: BuiltAvatar): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const boneName of VRM_REQUIRED_BONES) {
    if (!built.bones[boneName]) {
      errors.push(`人型ボーン「${boneName}」が不足しています`);
    }
  }

  if (built.usedParts.length === 0) {
    errors.push('パーツが1つも装着されていません');
  }

  if (built.materialCount === 0) {
    errors.push('マテリアルが見つかりません');
  }

  if (built.triangleCount > 70000) {
    warnings.push(`ポリゴン数が多すぎます (${built.triangleCount.toLocaleString()} 角)`);
  } else if (built.triangleCount > 30000) {
    warnings.push(`ポリゴン数が推奨値を超えています (${built.triangleCount.toLocaleString()} 角)`);
  }

  return { valid: errors.length === 0, warnings, errors };
}
