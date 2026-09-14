import partsData from '../data/parts.json';
import type { PartCategory, PartDefinition, PartsDatabase } from '../types/parts';
import type { AvatarPartSelection } from '../types/avatar';

export const partsDatabase = partsData as unknown as PartsDatabase;

export function getPartsForCategory(category: PartCategory): PartDefinition[] {
  return partsDatabase[category];
}

export function getPartById(category: PartCategory, id: string | null): PartDefinition | null {
  if (!id) return null;
  return partsDatabase[category].find((p) => p.id === id) ?? null;
}

export function getDefaultSelection(): AvatarPartSelection {
  return {
    body: partsDatabase.body[0].id,
    face: partsDatabase.face[0].id,
    eyes: partsDatabase.eyes[0].id,
    mouth: partsDatabase.mouth[0].id,
    hair: partsDatabase.hair[0].id,
    clothes: partsDatabase.clothes[0].id,
    shoes: partsDatabase.shoes[0].id,
    accessories: [],
    back: null,
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random Avatar generator (spec §13). We bias part choices toward a shared
 * "tag" family when possible so we don't end up mixing e.g. a samurai
 * topknot with a maid outfit — a lightweight compatibility heuristic
 * without needing a full constraint solver.
 */
export function generateRandomSelection(): AvatarPartSelection {
  const hair = pickRandom(partsDatabase.hair);
  const themeTags = new Set(hair.tags ?? []);

  const pickThemed = (category: PartCategory): PartDefinition => {
    const list = partsDatabase[category];
    const themed = list.filter((p) => p.tags?.some((t) => themeTags.has(t)));
    return themed.length > 0 && Math.random() < 0.6 ? pickRandom(themed) : pickRandom(list);
  };

  const clothes = pickThemed('clothes');
  const shoes = pickThemed('shoes');
  const accessoryPool = partsDatabase.accessories;
  const accessories: string[] = [];
  if (Math.random() < 0.5) accessories.push(pickRandom(accessoryPool).id);

  const back = Math.random() < 0.35 ? pickRandom(partsDatabase.back).id : null;

  return {
    body: pickRandom(partsDatabase.body).id,
    face: pickRandom(partsDatabase.face).id,
    eyes: pickRandom(partsDatabase.eyes).id,
    mouth: pickRandom(partsDatabase.mouth).id,
    hair: hair.id,
    clothes: clothes.id,
    shoes: shoes.id,
    accessories,
    back,
  };
}

export const PRESET_COLOR_SWATCHES: { name: string; nameJa: string; hex: string }[] = [
  { name: 'Black', nameJa: 'ブラック', hex: '#1c1c1c' },
  { name: 'White', nameJa: 'ホワイト', hex: '#f5f5f5' },
  { name: 'Red', nameJa: 'レッド', hex: '#d63a3a' },
  { name: 'Blue', nameJa: 'ブルー', hex: '#3a6fd6' },
  { name: 'Green', nameJa: 'グリーン', hex: '#3ad67a' },
  { name: 'Pink', nameJa: 'ピンク', hex: '#ff8ac1' },
  { name: 'Purple', nameJa: 'パープル', hex: '#9b5fd6' },
  { name: 'Gold', nameJa: 'ゴールド', hex: '#d4af37' },
  { name: 'Brown', nameJa: 'ブラウン', hex: '#6f4a2a' },
  { name: 'Gray', nameJa: 'グレー', hex: '#8a8a8a' },
];
