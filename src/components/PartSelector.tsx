import { useState } from 'react';
import { useAvatarStore } from '../store/avatarStore';
import { getPartsForCategory } from '../avatar/PartManager';
import type { PartCategory, PartDefinition } from '../types/parts';
import type { AvatarPartSelection } from '../types/avatar';

const CATEGORIES: { key: PartCategory; emoji: string; labelJa: string }[] = [
  { key: 'body', emoji: '👤', labelJa: 'からだ' },
  { key: 'face', emoji: '😀', labelJa: '顔' },
  { key: 'eyes', emoji: '👀', labelJa: '目' },
  { key: 'mouth', emoji: '👄', labelJa: '口' },
  { key: 'hair', emoji: '💇', labelJa: '髪' },
  { key: 'clothes', emoji: '👕', labelJa: '服' },
  { key: 'shoes', emoji: '👟', labelJa: '靴' },
  { key: 'accessories', emoji: '🎩', labelJa: 'アクセサリー' },
  { key: 'back', emoji: '🎒', labelJa: '背中' },
];

function isPartSelected(category: PartCategory, part: PartDefinition, selection: AvatarPartSelection): boolean {
  if (category === 'accessories') return selection.accessories.includes(part.id);
  if (category === 'back') return selection.back === part.id;
  return selection[category] === part.id;
}

function PartSwatch({ part }: { part: PartDefinition }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white/90 shadow-inner"
      style={{ background: part.defaultColor, backgroundImage: `linear-gradient(160deg, ${part.defaultColor}, #00000022)` }}
    >
      {part.nameJa.slice(0, 1)}
    </div>
  );
}

export default function PartSelector() {
  const [activeCategory, setActiveCategory] = useState<PartCategory>('hair');
  const selection = useAvatarStore((s) => s.config.parts);
  const setPart = useAvatarStore((s) => s.setPart);
  const setBack = useAvatarStore((s) => s.setBack);
  const toggleAccessory = useAvatarStore((s) => s.toggleAccessory);

  const parts = getPartsForCategory(activeCategory);

  const handleSelect = (part: PartDefinition) => {
    if (activeCategory === 'accessories') {
      toggleAccessory(part.id);
    } else if (activeCategory === 'back') {
      setBack(selection.back === part.id ? null : part.id);
    } else {
      setPart(activeCategory as Exclude<PartCategory, 'accessories'>, part.id);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible panel-scroll">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeCategory === cat.key
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-white/70 text-ink-900 hover:bg-brand-100'
            }`}
          >
            <span className="text-lg leading-none">{cat.emoji}</span>
            <span>{cat.labelJa}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto panel-scroll">
        <div className="flex flex-wrap gap-2 pb-4 lg:grid lg:grid-cols-3">
          {activeCategory === 'back' && (
            <button
              onClick={() => setBack(null)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-[11px] transition ${
                selection.back === null ? 'border-brand-500 bg-brand-50' : 'border-transparent bg-white/60'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
                なし
              </div>
              <span>装備なし</span>
            </button>
          )}
          {parts.map((part) => {
            const selected = isPartSelected(activeCategory, part, selection);
            return (
              <button
                key={part.id}
                onClick={() => handleSelect(part)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-[11px] transition ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-transparent bg-white/60 hover:bg-white'
                }`}
                title={part.nameJa}
              >
                <PartSwatch part={part} />
                <span className="max-w-[4.5rem] truncate">{part.nameJa}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
