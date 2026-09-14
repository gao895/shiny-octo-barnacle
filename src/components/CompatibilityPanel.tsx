import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { useAvatarStore } from '../store/avatarStore';
import { runClusterCompatibilityCheck } from '../vrm/VRMValidator';
import type { CheckLevel } from '../types/vrm';

const LEVEL_STYLE: Record<CheckLevel, { icon: typeof CheckCircle2; color: string; labelJa: string }> = {
  good: { icon: CheckCircle2, color: 'text-emerald-600', labelJa: 'GOOD' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', labelJa: 'WARNING' },
  error: { icon: XCircle, color: 'text-rose-600', labelJa: 'ERROR' },
};

export default function CompatibilityPanel() {
  const config = useAvatarStore((s) => s.config);
  const [open, setOpen] = useState(false);
  const result = useMemo(() => runClusterCompatibilityCheck(config), [config]);
  const overall = LEVEL_STYLE[result.overall];
  const OverallIcon = overall.icon;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/60 p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between text-left">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
          <ShieldCheck size={16} /> cluster 対応チェック
        </span>
        <span className={`flex items-center gap-1 text-xs font-bold ${overall.color}`}>
          <OverallIcon size={14} /> {overall.labelJa}
        </span>
      </button>

      {open && (
        <ul className="flex flex-col gap-1.5 pt-1">
          {result.items.map((item) => {
            const style = LEVEL_STYLE[item.level];
            const Icon = style.icon;
            return (
              <li key={item.id} className="flex items-start gap-2 text-[11px] leading-snug text-ink-900">
                <Icon size={14} className={`mt-0.5 shrink-0 ${style.color}`} />
                <span>
                  <span className="font-semibold">{item.labelJa}: </span>
                  {item.detail}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
