'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical, Star, Trash2 } from 'lucide-react';
import { ImageCropField, COVER_CROP } from '@/components/ImageCropField';
import { ImageLightbox } from '@/components/ImageLightbox';
import { cn } from '@/lib/utils';

interface Item {
  key: string;
  url: string; // saved URL, or an object URL preview for a new image
  file?: File; // present for newly added (already cropped) images
}

let counter = 0;
const nextKey = () => `m${++counter}`;

/**
 * One list for a record's photos. The FIRST image is the cover; the rest are
 * the gallery, in order. Add photos (cropped as you add), drag the six-dot
 * handle — or focus it and use the arrow keys — to reorder, "Make cover" to
 * move one to the front, and remove with the bin. Nothing is saved until the
 * surrounding form is submitted.
 *
 * Submits two fields the server reads with `readMediaFromForm`:
 *   media_order  JSON array — "u:<saved url>" or "n:<index into media_files>"
 *   media_files  the new, cropped files (in the order they appear)
 */
export function MediaManager({ initialUrls = [] }: { initialUrls?: string[] }) {
  const [items, setItems] = useState<Item[]>(() => initialUrls.map((url) => ({ key: nextKey(), url })));
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  // Which handle to re-focus after a keyboard move (a ref: no re-render needed).
  const focusKeyRef = useRef<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialUrls);

  // Keep the hidden file input in sync with the new images, in list order.
  const newFiles = items.filter((i) => i.file).map((i) => i.file as File);
  useEffect(() => {
    if (!filesRef.current) return;
    const dt = new DataTransfer();
    newFiles.forEach((f) => dt.items.add(f));
    filesRef.current.files = dt.files;
  });

  // A parent form reset (after a successful create) clears the list.
  useEffect(() => {
    const form = rootRef.current?.closest('form');
    if (!form) return;
    const onReset = () => setItems(initialRef.current.map((url) => ({ key: nextKey(), url })));
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, []);

  // Release preview URLs when an item goes away.
  const previewsRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const live = new Set(items.filter((i) => i.file).map((i) => i.key));
    for (const [key, url] of previewsRef.current) {
      if (!live.has(key)) {
        URL.revokeObjectURL(url);
        previewsRef.current.delete(key);
      }
    }
    items.forEach((i) => i.file && previewsRef.current.set(i.key, i.url));
  }, [items]);

  useEffect(() => {
    const map = previewsRef.current;
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Restore focus to a handle after it moved (keyboard reordering).
  useEffect(() => {
    const key = focusKeyRef.current;
    if (!key) return;
    focusKeyRef.current = null;
    rootRef.current?.querySelector<HTMLElement>(`[data-handle="${key}"]`)?.focus();
  }, [items]);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  const order = JSON.stringify(
    items.map((i, idx) => (i.file ? `n:${items.slice(0, idx).filter((x) => x.file).length}` : `u:${i.url}`))
  );

  return (
    <div ref={rootRef}>
      <input type="hidden" name="media_order" value={order} />
      <input ref={filesRef} type="file" name="media_files" multiple className="hidden" tabIndex={-1} aria-hidden />

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Photos — the first one is the cover">
          {items.map((item, index) => (
            <li
              key={item.key}
              draggable
              onDragStart={(e) => {
                setDragKey(item.key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overKey !== item.key) setOverKey(item.key);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = items.findIndex((i) => i.key === dragKey);
                move(from, index);
                setDragKey(null);
                setOverKey(null);
              }}
              onDragEnd={() => {
                setDragKey(null);
                setOverKey(null);
              }}
              className={cn(
                'flex flex-col overflow-hidden rounded-lg border bg-kiranam-surface transition',
                index === 0 ? 'border-kiranam-ink ring-1 ring-kiranam-ink' : 'border-kiranam-border',
                dragKey === item.key && 'opacity-40',
                overKey === item.key && dragKey !== item.key && 'ring-2 ring-kiranam-primary'
              )}
            >
              <div className="relative bg-kiranam-surface-alt">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  aria-label={`Preview photo ${index + 1}`}
                  className="block w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="aspect-video w-full object-cover" draggable={false} />
                </button>

                <button
                  type="button"
                  data-handle={item.key}
                  aria-label={`Reorder photo ${index + 1} of ${items.length}. Use the arrow keys, or drag.`}
                  title="Drag to reorder"
                  onKeyDown={(e) => {
                    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
                    if (!dir) return;
                    e.preventDefault();
                    move(index, index + dir);
                    focusKeyRef.current = item.key;
                  }}
                  className="absolute left-2 top-2 flex size-8 cursor-grab items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/75 active:cursor-grabbing"
                >
                  <GripVertical size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  aria-label={`Remove photo ${index + 1}`}
                  title="Remove"
                  className="absolute right-2 top-2 flex size-8 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition hover:bg-kiranam-danger"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>

              <div className="flex min-h-10 items-center justify-between gap-2 px-3 py-1.5 text-xs">
                {index === 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-kiranam-ink">
                    <Star size={13} className="fill-current" aria-hidden /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => move(index, 0)}
                    className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 font-medium text-kiranam-muted transition hover:text-kiranam-ink"
                  >
                    <Star size={13} aria-hidden /> Make cover
                  </button>
                )}
                {item.file && <span className="rounded-full bg-kiranam-success-soft px-2 py-0.5 font-semibold text-kiranam-success">New</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-kiranam-border-strong px-4 py-6 text-center text-sm text-kiranam-muted">
          No photos yet. The first one you add becomes the cover.
        </p>
      )}

      <ImageLightbox
        images={items.map((i, n) => ({ src: i.url, alt: `Photo ${n + 1}` }))}
        index={previewIndex ?? 0}
        open={previewIndex !== null}
        onOpenChange={(o) => !o && setPreviewIndex(null)}
        onIndexChange={setPreviewIndex}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ImageCropField
          name="media"
          crop={COVER_CROP}
          multiple
          buttonLabel={items.length ? 'Add more photos' : 'Add photos'}
          onFiles={(files) =>
            setItems((prev) => [...prev, ...files.map((file) => ({ key: nextKey(), url: URL.createObjectURL(file), file }))])
          }
        />
        <p className="text-xs text-kiranam-muted">
          {items.length > 1 ? 'Drag the ⋮⋮ handle to reorder. ' : ''}Photos are cropped to widescreen (16:9) as you add them.
        </p>
      </div>
    </div>
  );
}
