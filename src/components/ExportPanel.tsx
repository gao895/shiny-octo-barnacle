import { useRef, useState } from 'react';
import { Package, Camera, FileJson, Upload, Loader2 } from 'lucide-react';
import { useAvatarStore } from '../store/avatarStore';
import { exportAvatarToVrm, VrmExportError } from '../vrm/VRMExporter';
import { validateAvatar } from '../avatar/AvatarValidator';
import { saveFile, timestampedFilename } from '../utils/download';
import { captureCanvasScreenshot } from '../utils/screenshot';
import { exportConfigAsJson, parseConfigFromJson } from '../utils/storage';
import { exportedFrameCanvas } from './AvatarViewer';
import type { ExportFormat } from '../types/vrm';

const SCREENSHOT_FORMATS: { key: ExportFormat; labelJa: string }[] = [
  { key: 'square', labelJa: '正方形' },
  { key: 'landscape', labelJa: '16:9' },
  { key: 'portrait', labelJa: '9:16' },
];

export default function ExportPanel() {
  const config = useAvatarStore((s) => s.config);
  const setMetadata = useAvatarStore((s) => s.setMetadata);
  const loadConfig = useAvatarStore((s) => s.loadConfig);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [screenshotFormat, setScreenshotFormat] = useState<ExportFormat>('square');
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportVrm = async () => {
    setError(null);
    const validation = validateAvatar(config);
    if (!validation.valid) {
      setError(validation.errors.join(' / '));
      return;
    }

    setExporting(true);
    setProgress(0);
    setStage('準備しています…');
    try {
      const blob = await exportAvatarToVrm(config, (p) => {
        setStage(p.stage);
        setProgress(p.progress);
      });
      const result = await saveFile(blob, timestampedFilename('ChibiAvatar', 'vrm'));
      if (result.status === 'unsupported') setError(result.message ?? '保存に失敗しました');
    } catch (e) {
      if (e instanceof VrmExportError) {
        setError(`VRMの生成に失敗しました: ${e.message}`);
      } else {
        setError(`VRMの生成に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleScreenshot = async () => {
    if (!exportedFrameCanvas) {
      setError('3Dビューの準備ができていません');
      return;
    }
    try {
      const blob = await captureCanvasScreenshot(exportedFrameCanvas, screenshotFormat);
      const result = await saveFile(blob, timestampedFilename('ChibiAvatar', 'png'));
      if (result.status === 'unsupported') setError(result.message ?? '保存に失敗しました');
    } catch (e) {
      setError(`画像の保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExportJson = async () => {
    const json = exportConfigAsJson(config);
    const result = await saveFile(
      new Blob([json], { type: 'application/json' }),
      timestampedFilename('ChibiAvatarConfig', 'json'),
    );
    if (result.status === 'unsupported') setError(result.message ?? '保存に失敗しました');
  };

  const handleImportJsonClick = () => jsonFileInputRef.current?.click();

  const handleImportJsonFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseConfigFromJson(text);
      const validation = validateAvatar(parsed);
      if (!validation.valid) {
        setError(`JSONの読み込みに失敗しました: ${validation.errors.join(' / ')}`);
        return;
      }
      loadConfig(parsed);
    } catch (e) {
      setError(`JSONの読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-ink-900">📦 VRM出力・書き出し</h3>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-ink-900/70">アバター名</span>
          <input
            value={config.metadata.name}
            onChange={(e) => setMetadata({ name: e.target.value })}
            className="rounded-lg border border-black/10 bg-white/80 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-900/70">作者</span>
          <input
            value={config.metadata.author}
            onChange={(e) => setMetadata({ author: e.target.value })}
            className="rounded-lg border border-black/10 bg-white/80 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-900/70">連絡先</span>
          <input
            value={config.metadata.contactInformation}
            onChange={(e) => setMetadata({ contactInformation: e.target.value })}
            className="rounded-lg border border-black/10 bg-white/80 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-900/70">ライセンス</span>
          <input
            value={config.metadata.license}
            onChange={(e) => setMetadata({ license: e.target.value })}
            className="rounded-lg border border-black/10 bg-white/80 px-2 py-1.5"
          />
        </label>
      </div>

      <button
        onClick={handleExportVrm}
        disabled={exporting}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-60"
      >
        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
        {exporting ? stage || 'VRMを生成しています…' : 'VRMを書き出す'}
      </button>
      {exporting && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="flex flex-col gap-1.5 border-t border-black/5 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-900">📸 スクリーンショット</span>
          <div className="flex gap-1">
            {SCREENSHOT_FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setScreenshotFormat(f.key)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                  screenshotFormat === f.key ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-900'
                }`}
              >
                {f.labelJa}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleScreenshot}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-ink-900 hover:bg-brand-100"
        >
          <Camera size={15} /> 画像を保存 (PNG)
        </button>
      </div>

      <div className="flex gap-2 border-t border-black/5 pt-3">
        <button
          onClick={handleExportJson}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-ink-900 hover:bg-brand-100"
        >
          <FileJson size={15} /> JSON書き出し
        </button>
        <button
          onClick={handleImportJsonClick}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-ink-900 hover:bg-brand-100"
        >
          <Upload size={15} /> JSON読み込み
        </button>
        <input
          ref={jsonFileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportJsonFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
