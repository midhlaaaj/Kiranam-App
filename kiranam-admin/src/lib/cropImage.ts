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

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Failed to export cropped image.');

  const baseName = fileName.replace(/\.[^./\\]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}
