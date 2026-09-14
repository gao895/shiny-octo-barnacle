import type { PartCategory } from './parts';

export type ColorableSlot = 'hair' | 'eyes' | 'clothes' | 'shoes' | 'accessories';

export type ColorConfig = Record<ColorableSlot, string>;

export type ExpressionPreset = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';

/** 0-1 blend weight per preset, applied simultaneously (VRM ExpressionManager style) */
export type ExpressionConfig = Record<ExpressionPreset, number>;

export type AnimationClipName = 'idle' | 'wave' | 'dance' | 'jump' | 'walk';

export type AccessorySlot = string; // multiple accessories may be worn at once

export interface AvatarPartSelection {
  body: string;
  face: string;
  eyes: string;
  mouth: string;
  hair: string;
  clothes: string;
  shoes: string;
  accessories: AccessorySlot[];
  back: string | null;
}

export interface AvatarMetadata {
  name: string;
  author: string;
  contactInformation: string;
  license: string;
  version: string;
}

export const AVATAR_CONFIG_VERSION = 1;

export interface AvatarConfig {
  version: typeof AVATAR_CONFIG_VERSION;
  parts: AvatarPartSelection;
  colors: ColorConfig;
  expression: ExpressionConfig;
  metadata: AvatarMetadata;
}

export interface SavedAvatar {
  id: string;
  name: string;
  savedAt: string;
  config: AvatarConfig;
  thumbnailDataUrl?: string;
}

export type PartSlotKey = Exclude<PartCategory, 'accessories'> | 'accessories';

export interface PresetDefinition {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  parts: AvatarPartSelection;
  colors: ColorConfig;
}
