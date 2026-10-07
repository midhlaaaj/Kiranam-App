'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LightboxImage {
  src: string;
  alt?: string;
}

/**
 * Full-screen image viewer. Esc or a click outside the photo closes it; with
 * more than one image, ← / → (or the side buttons) step through them.
 */
export function ImageLightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}) {
  const count = images.length;
  const step = useCallback(
    (dir: 1 | -1) => count > 1 && onIndexChange((index + dir + count) % count),
    [count, index, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  const current = images[index];
  const navButton = 'absolute top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm" />
        <Dialog.Popup
          className="fixed inset-0 z-[91] flex items-center justify-center p-4 outline-none sm:p-10"
          // Click on the empty area around the photo closes the viewer.
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
          aria-label="Image preview"
        >
          <Dialog.Title className="sr-only">Image preview</Dialog.Title>
          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.src}
              alt={current.alt ?? ''}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          )}

          <Dialog.Close
            aria-label="Close preview"
            className="absolute right-4 top-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
          >
            <X size={20} aria-hidden />
          </Dialog.Close>

          {count > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={() => step(-1)} className={cn(navButton, 'left-4')}>
                <ChevronLeft size={22} aria-hidden />
              </button>
              <button type="button" aria-label="Next image" onClick={() => step(1)} className={cn(navButton, 'right-4')}>
                <ChevronRight size={22} aria-hidden />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm tabular-nums text-white">
                {index + 1} / {count}
              </p>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A single image that opens in the viewer when clicked. Drop-in for <img>. */
export function PreviewImage({
  src,
  alt = '',
  className,
  buttonClassName,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Extra classes for the clickable wrapper (e.g. to keep it from shrinking). */
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `Preview: ${alt}` : 'Preview image'}
        className={cn('block cursor-zoom-in', buttonClassName)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      <ImageLightbox images={[{ src, alt }]} index={0} open={open} onOpenChange={setOpen} onIndexChange={() => {}} />
    </>
  );
}
