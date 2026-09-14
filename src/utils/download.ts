// Minimal shape of the claude.ai Artifact "downloads" capability, used only
// when this app happens to be running inside an Artifact preview (see
// saveFile below). Not present in a normal browser deployment.
interface ClaudeDownloadsApi {
  save(request: { filename: string; data: Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}
interface ClaudeGlobal {
  use(name: 'downloads'): Promise<ClaudeDownloadsApi | null>;
}

function downloadViaAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface SaveFileResult {
  status: 'saved' | 'unsupported';
  /** Set when status is 'unsupported' — show this to the user instead of silently failing. */
  message?: string;
}

/**
 * Saves a generated file for the user. In a normal browser deployment this
 * is a plain `<a download>` click. When this app is opened as a claude.ai
 * Artifact preview, browser-triggered downloads are sandboxed/inert, so we
 * detect that environment (`window.claude`) and use its "downloads"
 * capability instead — which only accepts a fixed extension allowlist, so
 * some formats (like .vrm) can't be saved from inside a preview.
 */
export async function saveFile(blob: Blob, filename: string): Promise<SaveFileResult> {
  const claudeApi = (window as unknown as { claude?: ClaudeGlobal }).claude;
  if (!claudeApi?.use) {
    downloadViaAnchor(blob, filename);
    return { status: 'saved' };
  }

  const downloads = await claudeApi.use('downloads');
  if (!downloads) {
    return {
      status: 'unsupported',
      message: 'このプレビュー環境ではファイルの保存に対応していません。',
    };
  }

  try {
    await downloads.save({ filename, data: blob });
    return { status: 'saved' };
  } catch (error) {
    const code = (error as { code?: string } | undefined)?.code;
    if (code === 'declined') {
      return { status: 'unsupported', message: '保存がキャンセルされました。' };
    }
    if (code === 'rejected_extension' || code === 'extension_not_enabled') {
      const ext = filename.split('.').pop();
      return {
        status: 'unsupported',
        message: `このプレビュー環境では「.${ext}」形式の保存に対応していません。お手数ですがローカル環境（npm run dev）でお試しください。`,
      };
    }
    return { status: 'unsupported', message: `保存に失敗しました (${code ?? 'unknown error'})` };
  }
}

export function timestampedFilename(prefix: string, extension: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${prefix}_${stamp}.${extension}`;
}
