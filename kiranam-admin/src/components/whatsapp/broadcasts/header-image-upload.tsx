'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/whatsapp/ui/button';
import { MEDIA_MAX_BYTES_BY_KIND, uploadAccountMedia } from '@/lib/whatsapp/storage/upload-media';

// WhatsApp only accepts JPEG and PNG for an image header.
const ACCEPTED = ['image/jpeg', 'image/png'];

/** Picks an image from the device, uploads it, and hands back its public URL. */
export function HeaderImageUpload({
  onUploaded,
  label = 'Upload image',
  disabled,
}: {
  onUploaded: (url: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Please choose a JPG or PNG image. WhatsApp doesn’t accept other formats.');
      return;
    }
    if (file.size > MEDIA_MAX_BYTES_BY_KIND.image) {
      toast.error('That image is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const { publicUrl } = await uploadAccountMedia('chat-media', file);
      onUploaded(publicUrl);
      toast.success('Image uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? `Couldn’t upload the image: ${err.message}` : 'Couldn’t upload the image. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {uploading ? 'Uploading…' : label}
      </Button>
    </>
  );
}
