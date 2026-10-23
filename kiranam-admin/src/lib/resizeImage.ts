// Browser-side downscale for photos picked in a file input (the account
// avatar). Large camera photos are several MB and only ever display at ~64px,
// so shrink them before they're uploaded. The server action still validates
// type and size, so this is purely an optimisation: on any failure the caller
// keeps the original file.

import { encodeCanvas } from './cropImage';

/** Dimensions that fit inside `max` x `max`, preserving aspect ratio, never upscaling. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: scale < 1,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

/**
 * Returns a WebP (smaller than JPEG at the same quality, and it keeps
 * transparency) no larger than `maxSide` on either edge, or a JPEG on a browser
 * that can't encode WebP — transparent areas are then filled white, since JPEG
 * has no alpha. Returns the original file untouched when resizing can't help:
 * animated GIFs (a canvas would flatten them), and images that are already
 * small and not larger than the result.
 */
export async function downscaleImageFile(file: File, maxSide = 512): Promise<File> {
  if (file.type === 'image/gif') return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height, scaled } = fitWithin(img.naturalWidth, img.naturalHeight, maxSide);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await encodeCanvas(canvas, 'webp');
    if (blob.type !== 'image/webp') {
      // JPEG fallback: paint white behind the photo, then re-encode.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      blob = await encodeCanvas(canvas, 'jpeg');
    }
    // Already within bounds and re-encoding didn't shrink it: keep the original.
    if (!scaled && blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'avatar';
    return new File([blob], `${baseName}.${ext}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
