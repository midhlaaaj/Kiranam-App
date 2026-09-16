'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ImageUp } from 'lucide-react';
import { getCroppedImageFile } from '@/lib/cropImage';
import { buttonPrimary, buttonSecondary, fileInputClass } from '@/lib/ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Crop targets matching the fixed placements images actually render at in
 * kiranam-app (see campaign-detail.tsx / event-detail.tsx hero, and the
 * galleryCard boxes) — cropping to these here means `object-cover` in the
 * app never has to guess which part of an arbitrary photo to keep. */
export const COVER_CROP = { aspect: 16 / 9, outputWidth: 1600, outputHeight: 900 };
export const GALLERY_CROP = { aspect: 4 / 3, outputWidth: 800, outputHeight: 600 };

/** A file input that forces every selected image through a fixed-aspect-
 * ratio crop (not freeform) before it's attached to the form. Renders two
 * inputs: a visible one the user actually picks files from (no `name`, so
 * it's never itself submitted), and a hidden one carrying `name` whose
 * FileList is set programmatically to the cropped result — so this slots
 * into an existing native `<form action={serverAction}>` with no other
 * changes needed at the call site. */
export function ImageCropField({
  name,
  crop: cropTarget,
  multiple = false,
  required = false,
}: {
  name: string;
  crop: { aspect: number; outputWidth: number; outputHeight: number };
  multiple?: boolean;
  required?: boolean;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<File[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);
  const doneFilesRef = useRef<File[]>([]);
  const [readyCount, setReadyCount] = useState(0);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function startQueue(files: File[]) {
    doneFilesRef.current = [];
    setQueue(files);
    setQueuePos(0);
    openCropperFor(files[0]);
  }

  function openCropperFor(file: File) {
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    startQueue(files);
  }

  function closeAndReset() {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setQueue([]);
    setQueuePos(0);
    if (pickerRef.current) pickerRef.current.value = '';
  }

  async function handleConfirmCrop() {
    if (!imageSrc || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const file = queue[queuePos];
      const cropped = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        cropTarget.outputWidth,
        cropTarget.outputHeight,
        file.name,
      );
      doneFilesRef.current = [...doneFilesRef.current, cropped];
      URL.revokeObjectURL(imageSrc);

      const nextPos = queuePos + 1;
      if (nextPos < queue.length) {
        setQueuePos(nextPos);
        openCropperFor(queue[nextPos]);
      } else {
        // All queued images cropped — hand the finished File[] to the
        // hidden, form-submitted input via a DataTransfer (the only way to
        // programmatically set an <input type="file">'s FileList).
        const dt = new DataTransfer();
        doneFilesRef.current.forEach((f) => dt.items.add(f));
        if (hiddenRef.current) hiddenRef.current.files = dt.files;
        setReadyCount(doneFilesRef.current.length);
        closeAndReset();
      }
    } finally {
      setCropping(false);
    }
  }

  function handleCancelCrop() {
    // Drop the whole in-progress batch rather than partially applying it —
    // less surprising than silently keeping earlier crops from this pick.
    closeAndReset();
  }

  return (
    <div>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handlePick}
        className={fileInputClass}
      />
      <input ref={hiddenRef} type="file" name={name} multiple={multiple} required={required} className="hidden" />
      {readyCount > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-kiranam-success">
          <ImageUp size={13} strokeWidth={2.5} />
          {readyCount} image{readyCount === 1 ? '' : 's'} cropped and ready to upload.
        </p>
      )}

      <Dialog open={imageSrc !== null} onOpenChange={(open) => !open && handleCancelCrop()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Crop image{queue.length > 1 ? ` (${queuePos + 1} of ${queue.length})` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="relative h-80 w-full overflow-hidden rounded-lg bg-kiranam-surface-alt">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropTarget.aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-kiranam-primary"
          />

          <DialogFooter>
            <button type="button" onClick={handleCancelCrop} className={buttonSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleConfirmCrop} disabled={cropping} className={buttonPrimary}>
              {cropping ? 'Cropping…' : queuePos + 1 < queue.length ? 'Next image' : 'Use this crop'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
