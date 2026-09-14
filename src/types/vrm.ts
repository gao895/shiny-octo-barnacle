export interface ClusterLimits {
  vrmVersion: string;
  maxFileSizeMB: number;
  recommendedPolygonCount: number;
  maxPolygonCount: number;
  maxMaterials: number;
  recommendedMaterials: number;
  maxTextures: number;
  maxTextureResolution: number;
  requiredHumanoidBones: string[];
  notes: string;
}

export type CheckLevel = 'good' | 'warning' | 'error';

export interface CompatibilityCheckItem {
  id: string;
  labelJa: string;
  level: CheckLevel;
  detail: string;
  value?: string | number;
}

export interface CompatibilityResult {
  overall: CheckLevel;
  items: CompatibilityCheckItem[];
  checkedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export type ExportFormat = 'square' | 'landscape' | 'portrait';

export interface ExportSettings {
  format: ExportFormat;
  transparentBackground: boolean;
}

export interface VrmExportProgress {
  stage: string;
  progress: number; // 0-100
}
