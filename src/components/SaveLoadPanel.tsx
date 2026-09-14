import { useState } from 'react';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import { useAvatarStore } from '../store/avatarStore';
import { exportedFrameCanvas } from './AvatarViewer';

export default function SaveLoadPanel() {
  const config = useAvatarStore((s) => s.config);
  const savedAvatars = useAvatarStore((s) => s.savedAvatars);
  const persistCurrentAvatar = useAvatarStore((s) => s.persistCurrentAvatar);
  const removeSavedAvatar = useAvatarStore((s) => s.removeSavedAvatar);
  const loadConfig = useAvatarStore((s) => s.loadConfig);

  const [browserOpen, setBrowserOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    const thumbnail = exportedFrameCanvas?.toDataURL('image/png', 0.6);
    persistCurrentAvatar(config.metadata.name, thumbnail);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-ink-900">💾 保存・読み込み</h3>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-brand-100"
        >
          <Save size={15} /> {savedFlash ? '保存しました！' : '保存する'}
        </button>
        <button
          onClick={() => setBrowserOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-brand-100"
        >
          <FolderOpen size={15} /> 読み込む ({savedAvatars.length})
        </button>
      </div>

      {browserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBrowserOpen(false)}>
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-ink-900">保存したアバター</h4>
              <button onClick={() => setBrowserOpen(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            {savedAvatars.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">まだ保存されたアバターはありません</p>
            ) : (
              <ul className="flex flex-col gap-2 overflow-y-auto panel-scroll">
                {savedAvatars.map((avatar) => (
                  <li key={avatar.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-2">
                    {avatar.thumbnailDataUrl ? (
                      <img src={avatar.thumbnailDataUrl} alt={avatar.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-brand-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-900">{avatar.name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(avatar.savedAt).toLocaleString('ja-JP')}</p>
                    </div>
                    <button
                      onClick={() => {
                        loadConfig(avatar.config);
                        setBrowserOpen(false);
                      }}
                      className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-brand-600"
                    >
                      読み込む
                    </button>
                    <button
                      onClick={() => removeSavedAvatar(avatar.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      aria-label="削除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
