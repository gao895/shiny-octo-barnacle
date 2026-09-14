import { Dices, RotateCcw } from 'lucide-react';
import { useAvatarStore, presets } from '../store/avatarStore';

const PRESET_EMOJI: Record<string, string> = {
  preset_cute: '💖',
  preset_fantasy: '🪄',
  preset_ninja: '🥷',
  preset_samurai: '⚔️',
  preset_halloween: '🎃',
  preset_animal: '🐱',
  preset_japanese: '🌸',
};

export default function PresetPanel() {
  const applyPreset = useAvatarStore((s) => s.applyPreset);
  const randomize = useAvatarStore((s) => s.randomize);
  const resetAvatar = useAvatarStore((s) => s.resetAvatar);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-ink-900">✨ プリセット</h3>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:bg-brand-100"
          >
            <span>{PRESET_EMOJI[preset.id] ?? '✨'}</span>
            {preset.nameJa}
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={randomize}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-brand-600"
        >
          <Dices size={15} /> ランダム
        </button>
        <button
          onClick={resetAvatar}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-gray-200"
        >
          <RotateCcw size={15} /> リセット
        </button>
      </div>
    </div>
  );
}
