import { Undo2, Redo2, Image, Bug } from 'lucide-react';
import { useAvatarStore, BACKGROUND_OPTIONS } from '../store/avatarStore';

export default function TopBar() {
  const undo = useAvatarStore((s) => s.undo);
  const redo = useAvatarStore((s) => s.redo);
  const canUndo = useAvatarStore((s) => s.history.past.length > 0);
  const canRedo = useAvatarStore((s) => s.history.future.length > 0);
  const backgroundId = useAvatarStore((s) => s.backgroundId);
  const setBackgroundId = useAvatarStore((s) => s.setBackgroundId);
  const debugOverlay = useAvatarStore((s) => s.debugOverlay);
  const toggleDebugOverlay = useAvatarStore((s) => s.toggleDebugOverlay);

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-white/70 px-4 py-2.5 backdrop-blur">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-brand-700">🧸 Chibi Avatar Maker</h1>
        <p className="text-[11px] text-ink-900/60">自分だけの2頭身アバターを作ろう</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="元に戻す (Ctrl+Z)"
          className="rounded-lg bg-white/80 p-2 text-ink-900 shadow-sm transition disabled:opacity-30"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="やり直す (Ctrl+Y)"
          className="rounded-lg bg-white/80 p-2 text-ink-900 shadow-sm transition disabled:opacity-30"
        >
          <Redo2 size={16} />
        </button>

        <label className="ml-1 flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1.5 text-xs shadow-sm">
          <Image size={14} />
          <select
            value={backgroundId}
            onChange={(e) => setBackgroundId(e.target.value as typeof backgroundId)}
            className="bg-transparent text-xs outline-none"
          >
            {BACKGROUND_OPTIONS.map((bg) => (
              <option key={bg.id} value={bg.id}>
                {bg.nameJa}
              </option>
            ))}
          </select>
        </label>

        {import.meta.env.DEV && (
          <button
            onClick={toggleDebugOverlay}
            title="デバッグ表示"
            className={`rounded-lg p-2 shadow-sm transition ${debugOverlay ? 'bg-brand-500 text-white' : 'bg-white/80 text-ink-900'}`}
          >
            <Bug size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
