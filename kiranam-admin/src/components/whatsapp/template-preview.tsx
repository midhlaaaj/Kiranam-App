'use client';

import { ExternalLink, FileText, Image as ImageIcon, Phone, Copy, Reply, Video } from 'lucide-react';
import type { TemplateButton } from '@/types/whatsapp';
import { cn } from '@/lib/whatsapp/utils';

/**
 * How a template message looks on the recipient's phone: WhatsApp's chat
 * wallpaper with an incoming white bubble — header, body, footer and the
 * button rows Meta renders under it. One component for the broadcast
 * wizard (personalize + review) and the template editor, so admins see the
 * same thing everywhere before anything is sent.
 *
 * Fixed WhatsApp-like colors on purpose (not theme tokens): it's a picture
 * of the recipient's screen, which doesn't follow this app's theme.
 */
export function TemplatePreview({
  headerType,
  headerText,
  headerMediaUrl,
  body,
  footer,
  buttons,
  className,
}: {
  headerType?: 'text' | 'image' | 'video' | 'document' | null;
  headerText?: string | null;
  headerMediaUrl?: string | null;
  body: string;
  footer?: string | null;
  buttons?: TemplateButton[] | null;
  className?: string;
}) {
  const MediaIcon = headerType === 'video' ? Video : headerType === 'document' ? FileText : ImageIcon;

  return (
    <div className={cn('rounded-xl bg-[#efeae2] p-3 sm:p-4', className)} aria-label="Message preview">
      <div className="max-w-[300px]">
        <div className="overflow-hidden rounded-lg rounded-tl-none bg-white text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
          {headerType && headerType !== 'text' && (
            <div className="p-1 pb-0">
              {headerType === 'image' && headerMediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerMediaUrl} alt="" className="max-h-40 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-md bg-[#d1d7db] text-[#54656f]">
                  <MediaIcon className="h-8 w-8" aria-hidden />
                </div>
              )}
            </div>
          )}
          <div className="px-2.5 pb-1.5 pt-2">
            {headerType === 'text' && headerText && <p className="mb-1 text-[15px] font-semibold">{headerText}</p>}
            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px]">
              {body || <span className="text-[#667781]">Your message…</span>}
            </p>
            {footer && <p className="mt-1 text-[13px] text-[#667781]">{footer}</p>}
            <p className="mt-0.5 text-right text-[11px] text-[#667781]">9:41 am</p>
          </div>
          {buttons && buttons.length > 0 && (
            <div className="border-t border-[#e9edef]">
              {buttons.map((b, i) => {
                const Icon =
                  b.type === 'URL' ? ExternalLink : b.type === 'PHONE_NUMBER' ? Phone : b.type === 'COPY_CODE' ? Copy : Reply;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center gap-1.5 border-t border-[#e9edef] py-2 text-[14px] font-medium text-[#027eb5] first:border-t-0"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="truncate">{b.text || 'Button'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Replaces {{n}} with values (or leaves the placeholder visible). */
export function fillPlaceholders(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key: string) => (values[key]?.trim() ? values[key] : m));
}
