import type { AvatarConfig, SavedAvatar } from '../types/avatar';

const STORAGE_KEY = 'chibi-avatar-maker:saved-avatars:v1';

function readAll(): SavedAvatar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAvatar[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(avatars: SavedAvatar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(avatars));
}

export function listSavedAvatars(): SavedAvatar[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveAvatar(name: string, config: AvatarConfig, thumbnailDataUrl?: string): SavedAvatar {
  const avatars = readAll();
  const entry: SavedAvatar = {
    id: `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    savedAt: new Date().toISOString(),
    config,
    thumbnailDataUrl,
  };
  avatars.push(entry);
  writeAll(avatars);
  return entry;
}

export function deleteSavedAvatar(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}

export function loadSavedAvatar(id: string): SavedAvatar | null {
  return readAll().find((a) => a.id === id) ?? null;
}

export function exportConfigAsJson(config: AvatarConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseConfigFromJson(json: string): AvatarConfig {
  const parsed = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JSONの形式が正しくありません');
  }
  if (!('parts' in parsed) || !('colors' in parsed)) {
    throw new Error('アバター設定JSONとして認識できませんでした');
  }
  return parsed as AvatarConfig;
}
