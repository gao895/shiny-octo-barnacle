import type { ExportFormat } from '../types/vrm';

const ASPECT_RATIOS: Record<ExportFormat, number> = {
  square: 1,
  landscape: 16 / 9,
  portrait: 9 / 16,
};

/**
 * Crops the given canvas (the live R3F <canvas>) to the requested social
 * aspect ratio and returns a PNG blob, for the "画像保存" / SNS export flow
 * (spec §31-32). We crop rather than resize the WebGL canvas itself so the
 * live preview's own size/DPR is never disturbed.
 */
export async function captureCanvasScreenshot(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
): Promise<Blob> {
  const targetRatio = ASPECT_RATIOS[format];
  const sourceRatio = canvas.width / canvas.height;

  let sx = 0;
  let sy = 0;
  let sw = canvas.width;
  let sh = canvas.height;

  if (sourceRatio > targetRatio) {
    sw = canvas.height * targetRatio;
    sx = (canvas.width - sw) / 2;
  } else {
    sh = canvas.width / targetRatio;
    sy = (canvas.height - sh) / 2;
  }

  const output = document.createElement('canvas');
  output.width = Math.round(sw);
  output.height = Math.round(sh);
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context を取得できませんでした');
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, output.width, output.height);

  return new Promise((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('スクリーンショットの生成に失敗しました'));
    }, 'image/png');
  });
}
