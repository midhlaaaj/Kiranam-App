export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

// Crops `imageSrc` to the pixel area react-easy-crop reports, then rescales
// that crop onto a fixed-size canvas — so every upload for a given field
// (cover vs gallery) ends up at the exact same output resolution regardless
// of the source photo's size, matching the fixed aspect ratio those images
// are displayed at in kiranam-app.
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: PixelCrop,
  outputWidth: number,
  outputHeight: number,
  fileName: string,
  format: UploadImageFormat = 'jpeg',
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await encodeCanvas(canvas, format);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = fileName.replace(/\.[^./\\]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, { type: blob.type });
}

/**
 * Upload format for a cropped photo.
 * - 'webp': ~25–35% smaller than JPEG at the same visual quality; shown by every
 *   current browser, iOS 14+ and Android. Use it wherever the photo is only
 *   displayed in the app and admin.
 * - 'jpeg': for photos that also leave the app — campaign photos can become
 *   the cover, which goes out as the WhatsApp announcement's header image
 *   (Meta accepts only JPEG/PNG there) and in emails (Outlook can't show WebP).
 */
export type UploadImageFormat = 'webp' | 'jpeg';

// 0.82 is visually indistinguishable from 0.9 at these sizes and noticeably
// smaller for both formats.
const QUALITY = 0.82;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Encodes as `format`, falling back to JPEG when the browser can't produce
 * WebP (it then silently returns a PNG, which would be larger, not smaller). */
export async function encodeCanvas(canvas: HTMLCanvasElement, format: UploadImageFormat): Promise<Blob> {
  if (format === 'webp') {
    const webp = await toBlob(canvas, 'image/webp');
    if (webp && webp.type === 'image/webp') return webp;
  }
  const jpeg = await toBlob(canvas, 'image/jpeg');
  if (!jpeg) throw new Error('Failed to export image.');
  return jpeg;
}
