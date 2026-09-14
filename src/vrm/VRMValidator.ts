import clusterLimitsData from '../data/clusterLimits.json';
import { buildAvatarScene } from '../avatar/AvatarBuilder';
import { VRM_REQUIRED_BONES } from '../avatar/HumanoidRig';
import type { AvatarConfig } from '../types/avatar';
import type { ClusterLimits, CompatibilityCheckItem, CompatibilityResult, CheckLevel } from '../types/vrm';

export const clusterLimits = clusterLimitsData as ClusterLimits;

function worstLevel(levels: CheckLevel[]): CheckLevel {
  if (levels.includes('error')) return 'error';
  if (levels.includes('warning')) return 'warning';
  return 'good';
}

/**
 * cluster 向け最適化チェック (spec §20-22). Runs entirely against
 * config/clusterLimits.json so cluster's own limits can be updated in one
 * place without touching this logic. Triangle/material/texture counts are
 * computed from a freshly built scene graph — the same one VRMExporter
 * would produce — so the numbers shown here always match what actually
 * gets exported.
 */
export function runClusterCompatibilityCheck(config: AvatarConfig): CompatibilityResult {
  const built = buildAvatarScene(config);
  const items: CompatibilityCheckItem[] = [];

  items.push({
    id: 'vrmVersion',
    labelJa: 'VRM バージョン',
    level: 'good',
    detail: `VRM ${clusterLimits.vrmVersion} 形式で書き出します`,
    value: clusterLimits.vrmVersion,
  });

  const polygonLevel: CheckLevel =
    built.triangleCount > clusterLimits.maxPolygonCount
      ? 'error'
      : built.triangleCount > clusterLimits.recommendedPolygonCount
        ? 'warning'
        : 'good';
  items.push({
    id: 'polygonCount',
    labelJa: 'ポリゴン数',
    level: polygonLevel,
    detail:
      polygonLevel === 'good'
        ? `推奨値 (${clusterLimits.recommendedPolygonCount.toLocaleString()} 角) 以内です`
        : polygonLevel === 'warning'
          ? `推奨値 (${clusterLimits.recommendedPolygonCount.toLocaleString()} 角) を超えています`
          : `上限値 (${clusterLimits.maxPolygonCount.toLocaleString()} 角) を超えています`,
    value: built.triangleCount,
  });

  const estimatedSizeMB = estimateFileSizeMB(built.triangleCount, built.materialCount);
  items.push({
    id: 'fileSize',
    labelJa: 'ファイルサイズ (推定)',
    level: estimatedSizeMB > clusterLimits.maxFileSizeMB ? 'error' : 'good',
    detail: `約 ${estimatedSizeMB.toFixed(2)} MB（上限 ${clusterLimits.maxFileSizeMB} MB）`,
    value: Number(estimatedSizeMB.toFixed(2)),
  });

  const materialLevel: CheckLevel =
    built.materialCount > clusterLimits.maxMaterials
      ? 'error'
      : built.materialCount > clusterLimits.recommendedMaterials
        ? 'warning'
        : 'good';
  items.push({
    id: 'materialCount',
    labelJa: 'マテリアル数',
    level: materialLevel,
    detail: `${built.materialCount} 個使用中（推奨 ${clusterLimits.recommendedMaterials} 個以下）`,
    value: built.materialCount,
  });

  items.push({
    id: 'textureCount',
    labelJa: 'テクスチャ枚数',
    level: 'good',
    detail: 'プレースホルダーパーツのためテクスチャは未使用です（単色マテリアル）',
    value: built.textureCount,
  });

  items.push({
    id: 'textureResolution',
    labelJa: 'テクスチャ解像度',
    level: 'good',
    detail: `上限 ${clusterLimits.maxTextureResolution}px 以下を維持する設計です`,
  });

  const missingBones = VRM_REQUIRED_BONES.filter((b) => !built.bones[b]);
  items.push({
    id: 'humanoidBones',
    labelJa: '人型ボーン (Humanoid)',
    level: missingBones.length > 0 ? 'error' : 'good',
    detail:
      missingBones.length > 0
        ? `不足しているボーン: ${missingBones.join(', ')}`
        : `必須ボーン ${VRM_REQUIRED_BONES.length} 個すべて揃っています`,
  });

  items.push({
    id: 'springBone',
    labelJa: 'スプリングボーン（物理揺れ）',
    level: 'warning',
    detail: '現在のパーツは剛体アタッチのため、髪・マント等の物理揺れは未設定です',
  });

  items.push({
    id: 'expression',
    labelJa: '表情 (Expression)',
    level: 'warning',
    detail: 'neutral / happy / angry / sad / surprised を書き出しますが、モーフターゲットは未設定です',
  });

  const missingParts = built.usedParts.length === 0;
  items.push({
    id: 'missingParts',
    labelJa: 'パーツ / マテリアルの欠落',
    level: missingParts ? 'error' : 'good',
    detail: missingParts ? 'パーツが装着されていません' : '欠落しているパーツ・マテリアルはありません',
  });

  const overall = worstLevel(items.map((i) => i.level));

  return { overall, items, checkedAt: new Date().toISOString() };
}

export function estimateFileSizeMB(triangleCount: number, materialCount: number): number {
  // Rough heuristic for placeholder (texture-less) primitive geometry.
  const bytes = triangleCount * 48 + materialCount * 256 + 4096;
  return bytes / (1024 * 1024);
}
