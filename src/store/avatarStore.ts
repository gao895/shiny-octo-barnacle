import { create } from 'zustand';
import type {
  AvatarConfig,
  AvatarMetadata,
  AvatarPartSelection,
  ColorableSlot,
  ExpressionPreset,
  AnimationClipName,
} from '../types/avatar';
import { AVATAR_CONFIG_VERSION } from '../types/avatar';
import type { PartCategory } from '../types/parts';
import presetsData from '../data/presets.json';
import type { PresetDefinition } from '../types/avatar';
import { getDefaultSelection, generateRandomSelection } from '../avatar/PartManager';
import { saveAvatar, deleteSavedAvatar, listSavedAvatars } from '../utils/storage';

export const presets = presetsData as unknown as PresetDefinition[];

export type CameraPresetName = 'front' | 'back' | 'left' | 'right' | 'full' | 'face';
export type BackgroundId = 'studio_gray' | 'starry_sky' | 'candy_land' | 'castle_town' | 'festival' | 'halloween';

export const BACKGROUND_OPTIONS: { id: BackgroundId; nameJa: string; top: string; bottom: string }[] = [
  { id: 'studio_gray', nameJa: '明るいグレー', top: '#eef0f4', bottom: '#cfd4de' },
  { id: 'starry_sky', nameJa: '星空', top: '#0b1030', bottom: '#2a2a5c' },
  { id: 'candy_land', nameJa: 'お菓子の国', top: '#ffd6ec', bottom: '#ffb6d5' },
  { id: 'castle_town', nameJa: '城下町', top: '#cdeaf5', bottom: '#e8d9b8' },
  { id: 'festival', nameJa: 'お祭り', top: '#3a1c3f', bottom: '#a8355a' },
  { id: 'halloween', nameJa: 'ハロウィン', top: '#1a0f2b', bottom: '#5a3a1a' },
];

function defaultMetadata(): AvatarMetadata {
  return {
    name: 'My Chibi Avatar',
    author: 'User',
    contactInformation: '',
    license: 'CC0',
    version: '1.0',
  };
}

export function createDefaultConfig(): AvatarConfig {
  return {
    version: AVATAR_CONFIG_VERSION,
    parts: getDefaultSelection(),
    colors: {
      hair: '#4a3028',
      eyes: '#3b2a1a',
      clothes: '#5a7fb5',
      shoes: '#ffffff',
      accessories: '#d4af37',
    },
    expression: { neutral: 1, happy: 0, angry: 0, sad: 0, surprised: 0 },
    metadata: defaultMetadata(),
  };
}

interface HistoryState {
  past: AvatarConfig[];
  future: AvatarConfig[];
}

interface AvatarStoreState {
  config: AvatarConfig;
  history: HistoryState;
  animation: AnimationClipName | null;
  tPose: boolean;
  cameraRequest: CameraPresetName | null;
  backgroundId: BackgroundId;
  debugOverlay: boolean;
  savedAvatars: ReturnType<typeof listSavedAvatars>;

  setPart: (category: Exclude<PartCategory, 'accessories'>, id: string) => void;
  toggleAccessory: (id: string) => void;
  setBack: (id: string | null) => void;
  setColor: (slot: ColorableSlot, hex: string) => void;
  setExpressionWeight: (preset: ExpressionPreset, value: number) => void;
  setExpressionPreset: (preset: ExpressionPreset) => void;
  setMetadata: (partial: Partial<AvatarMetadata>) => void;
  applyPreset: (presetId: string) => void;
  randomize: () => void;
  resetAvatar: () => void;
  undo: () => void;
  redo: () => void;
  setAnimation: (clip: AnimationClipName | null) => void;
  setTPose: (active: boolean) => void;
  requestCameraPreset: (name: CameraPresetName) => void;
  clearCameraRequest: () => void;
  setBackgroundId: (id: BackgroundId) => void;
  toggleDebugOverlay: () => void;
  loadConfig: (config: AvatarConfig) => void;
  persistCurrentAvatar: (name?: string, thumbnailDataUrl?: string) => void;
  removeSavedAvatar: (id: string) => void;
  refreshSavedAvatars: () => void;
}

const HISTORY_LIMIT = 50;

function cloneConfig(config: AvatarConfig): AvatarConfig {
  return JSON.parse(JSON.stringify(config)) as AvatarConfig;
}

export const useAvatarStore = create<AvatarStoreState>((set, get) => ({
  config: createDefaultConfig(),
  history: { past: [], future: [] },
  animation: 'idle',
  tPose: false,
  cameraRequest: null,
  backgroundId: 'studio_gray',
  debugOverlay: false,
  savedAvatars: listSavedAvatars(),

  setPart: (category, id) =>
    set((state) => {
      const nextParts: AvatarPartSelection = { ...state.config.parts, [category]: id };
      return commit(state, { ...state.config, parts: nextParts });
    }),

  toggleAccessory: (id) =>
    set((state) => {
      const has = state.config.parts.accessories.includes(id);
      const accessories = has
        ? state.config.parts.accessories.filter((a) => a !== id)
        : [...state.config.parts.accessories, id];
      return commit(state, { ...state.config, parts: { ...state.config.parts, accessories } });
    }),

  setBack: (id) =>
    set((state) => commit(state, { ...state.config, parts: { ...state.config.parts, back: id } })),

  setColor: (slot, hex) =>
    set((state) => commit(state, { ...state.config, colors: { ...state.config.colors, [slot]: hex } })),

  setExpressionWeight: (preset, value) =>
    set((state) => ({
      config: { ...state.config, expression: { ...state.config.expression, [preset]: value } },
    })),

  setExpressionPreset: (preset) =>
    set((state) => ({
      config: {
        ...state.config,
        expression: {
          neutral: preset === 'neutral' ? 1 : 0,
          happy: preset === 'happy' ? 1 : 0,
          angry: preset === 'angry' ? 1 : 0,
          sad: preset === 'sad' ? 1 : 0,
          surprised: preset === 'surprised' ? 1 : 0,
        },
      },
    })),

  setMetadata: (partial) =>
    set((state) => ({ config: { ...state.config, metadata: { ...state.config.metadata, ...partial } } })),

  applyPreset: (presetId) =>
    set((state) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return state;
      return commit(state, {
        ...state.config,
        parts: { ...preset.parts, accessories: [...preset.parts.accessories] },
        colors: { ...preset.colors },
      });
    }),

  randomize: () =>
    set((state) => commit(state, { ...state.config, parts: generateRandomSelection() })),

  resetAvatar: () =>
    set((state) => commit(state, createDefaultConfig())),

  undo: () =>
    set((state) => {
      const previous = state.history.past.at(-1);
      if (!previous) return state;
      const past = state.history.past.slice(0, -1);
      const future = [cloneConfig(state.config), ...state.history.future].slice(0, HISTORY_LIMIT);
      return { config: previous, history: { past, future } };
    }),

  redo: () =>
    set((state) => {
      const next = state.history.future[0];
      if (!next) return state;
      const future = state.history.future.slice(1);
      const past = [...state.history.past, cloneConfig(state.config)].slice(-HISTORY_LIMIT);
      return { config: next, history: { past, future } };
    }),

  setAnimation: (clip) => set({ animation: clip, tPose: false }),
  setTPose: (active) => set({ tPose: active, animation: active ? null : 'idle' }),

  requestCameraPreset: (name) => set({ cameraRequest: name }),
  clearCameraRequest: () => set({ cameraRequest: null }),

  setBackgroundId: (id) => set({ backgroundId: id }),
  toggleDebugOverlay: () => set((state) => ({ debugOverlay: !state.debugOverlay })),

  loadConfig: (config) => set((state) => commit(state, config)),

  persistCurrentAvatar: (name, thumbnailDataUrl) => {
    const state = get();
    const finalName = name?.trim() || state.config.metadata.name || 'My Chibi Avatar';
    saveAvatar(finalName, state.config, thumbnailDataUrl);
    set({ savedAvatars: listSavedAvatars() });
  },

  removeSavedAvatar: (id) => {
    deleteSavedAvatar(id);
    set({ savedAvatars: listSavedAvatars() });
  },

  refreshSavedAvatars: () => set({ savedAvatars: listSavedAvatars() }),
}));

function commit(
  state: AvatarStoreState,
  nextConfig: AvatarConfig,
): Pick<AvatarStoreState, 'config' | 'history'> {
  const past = [...state.history.past, cloneConfig(state.config)].slice(-HISTORY_LIMIT);
  return { config: nextConfig, history: { past, future: [] } };
}
