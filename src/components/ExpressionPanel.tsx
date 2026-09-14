import { useAvatarStore } from '../store/avatarStore';
import type { ExpressionPreset } from '../types/avatar';

const PRESETS: { key: ExpressionPreset; emoji: string; labelJa: string }[] = [
  { key: 'neutral', emoji: '😐', labelJa: 'ふつう' },
  { key: 'happy', emoji: '😊', labelJa: 'うれしい' },
  { key: 'angry', emoji: '😠', labelJa: 'おこり' },
  { key: 'sad', emoji: '😢', labelJa: 'かなしい' },
  { key: 'surprised', emoji: '😲', labelJa: 'びっくり' },
];

const SLIDERS = PRESETS.filter((p) => p.key !== 'neutral');

export default function ExpressionPanel() {
  const expression = useAvatarStore((s) => s.config.expression);
  const setExpressionPreset = useAvatarStore((s) => s.setExpressionPreset);
  const setExpressionWeight = useAvatarStore((s) => s.setExpressionWeight);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">😊 表情</h3>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setExpressionPreset(p.key)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              expression[p.key] >= 0.99 && Object.entries(expression).every(([k, v]) => (k === p.key ? v >= 0.99 : v <= 0.01))
                ? 'bg-brand-500 text-white shadow'
                : 'bg-white/70 text-ink-900 hover:bg-brand-100'
            }`}
          >
            <span>{p.emoji}</span>
            {p.labelJa}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-white/60 p-3">
        {SLIDERS.map((p) => (
          <label key={p.key} className="flex flex-col gap-1 text-xs text-ink-900">
            <span className="flex justify-between">
              <span>
                {p.emoji} {p.labelJa}
              </span>
              <span className="font-mono">{Math.round(expression[p.key] * 100)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(expression[p.key] * 100)}
              onChange={(e) => setExpressionWeight(p.key, Number(e.target.value) / 100)}
              className="accent-brand-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
