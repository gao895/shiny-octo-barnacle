import { useEffect, useRef, useState } from 'react';
import { useAvatarStore } from '../store/avatarStore';
import { PRESET_COLOR_SWATCHES } from '../avatar/PartManager';
import type { ColorableSlot } from '../types/avatar';

const SLOTS: { key: ColorableSlot; emoji: string; labelJa: string }[] = [
  { key: 'hair', emoji: '💇', labelJa: '髪' },
  { key: 'eyes', emoji: '👀', labelJa: '目' },
  { key: 'clothes', emoji: '👕', labelJa: '服' },
  { key: 'shoes', emoji: '👟', labelJa: '靴' },
  { key: 'accessories', emoji: '🎩', labelJa: 'アクセサリー' },
];

export default function ColorPicker() {
  const [activeSlot, setActiveSlot] = useState<ColorableSlot>('hair');
  const colors = useAvatarStore((s) => s.config.colors);
  const setColor = useAvatarStore((s) => s.setColor);

  const currentColor = colors[activeSlot];
  const [hexInput, setHexInput] = useState(currentColor);
  const hexInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // keep the text field in sync when the color changes from elsewhere
    // (slot switch, preset swatch click, native picker) unless the user is
    // actively typing in it
    if (document.activeElement !== hexInputRef.current) {
      setHexInput(currentColor);
    }
  }, [currentColor]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">🎨 カラー</h3>

      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map((slot) => (
          <button
            key={slot.key}
            onClick={() => setActiveSlot(slot.key)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              activeSlot === slot.key ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-900 hover:bg-brand-100'
            }`}
          >
            <span
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ background: colors[slot.key] }}
            />
            {slot.emoji} {slot.labelJa}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setColor(activeSlot, e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-lg border border-black/10 bg-transparent"
          aria-label={`${activeSlot} の色`}
        />
        <input
          id="hex-input"
          ref={hexInputRef}
          type="text"
          value={hexInput}
          onChange={(e) => {
            const v = e.target.value;
            setHexInput(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(activeSlot, v);
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) setHexInput(currentColor);
          }}
          className="w-24 rounded-lg border border-black/10 bg-white/80 px-2 py-2 font-mono text-xs"
          maxLength={7}
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            title={swatch.nameJa}
            onClick={() => setColor(activeSlot, swatch.hex)}
            className="h-7 w-full rounded-md border border-black/10 transition hover:scale-105"
            style={{ background: swatch.hex }}
          />
        ))}
      </div>
    </div>
  );
}
