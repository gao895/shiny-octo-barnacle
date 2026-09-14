import { useAvatarStore, type CameraPresetName } from '../store/avatarStore';
import type { AnimationClipName } from '../types/avatar';

const CLIPS: { key: AnimationClipName; emoji: string; labelJa: string }[] = [
  { key: 'idle', emoji: '🧍', labelJa: '待機' },
  { key: 'wave', emoji: '👋', labelJa: '手を振る' },
  { key: 'dance', emoji: '💃', labelJa: 'ダンス' },
  { key: 'jump', emoji: '🤸', labelJa: 'ジャンプ' },
  { key: 'walk', emoji: '🚶', labelJa: '歩く' },
];

const CAMERA_PRESETS: { key: CameraPresetName; labelJa: string }[] = [
  { key: 'front', labelJa: '正面' },
  { key: 'left', labelJa: '左' },
  { key: 'right', labelJa: '右' },
  { key: 'back', labelJa: '背面' },
  { key: 'full', labelJa: '全身' },
  { key: 'face', labelJa: 'アップ' },
];

export default function AnimationPanel() {
  const animation = useAvatarStore((s) => s.animation);
  const tPose = useAvatarStore((s) => s.tPose);
  const setAnimation = useAvatarStore((s) => s.setAnimation);
  const setTPose = useAvatarStore((s) => s.setTPose);
  const requestCameraPreset = useAvatarStore((s) => s.requestCameraPreset);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="mb-1.5 text-sm font-bold text-ink-900">🎬 アニメーション</h3>
        <div className="flex flex-wrap gap-1.5">
          {CLIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => setAnimation(c.key)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !tPose && animation === c.key ? 'bg-brand-500 text-white shadow' : 'bg-white/70 text-ink-900 hover:bg-brand-100'
              }`}
            >
              {c.emoji} {c.labelJa}
            </button>
          ))}
          <button
            onClick={() => setTPose(!tPose)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tPose ? 'bg-brand-500 text-white shadow' : 'bg-white/70 text-ink-900 hover:bg-brand-100'
            }`}
          >
            🧍‍♂️ T-Pose
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 text-sm font-bold text-ink-900">📷 カメラ</h3>
        <div className="flex flex-wrap gap-1.5">
          {CAMERA_PRESETS.map((c) => (
            <button
              key={c.key}
              onClick={() => requestCameraPreset(c.key)}
              className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:bg-brand-100"
            >
              {c.labelJa}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
