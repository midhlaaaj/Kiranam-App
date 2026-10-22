// Browser-side downscale for photos picked in a file input (the account
// avatar). Large camera photos are several MB and only ever display at ~64px,
// so shrink them before they're uploaded. The server action still validates
// type and size, so this is purely an optimisation: on any failure the caller
// keeps the original file.

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
 * Returns a JPEG no larger than `maxSide` on either edge. Returns the original
 * file untouched when resizing can't help: animated GIFs (a canvas would flatten
 * them), and images that are already small and not larger than the result.
 * Transparent areas are filled white, since JPEG has no alpha.
 */
export async function downscaleImageFile(file: File, maxSide = 512, quality = 0.85): Promise<File> {
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
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    // Already within bounds and re-encoding didn't shrink it: keep the original.
    if (!scaled && blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'avatar';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
