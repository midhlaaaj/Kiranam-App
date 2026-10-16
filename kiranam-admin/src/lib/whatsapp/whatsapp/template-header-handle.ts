import { uploadResumableMedia } from '@/lib/whatsapp/whatsapp/meta-api'
import type { TemplatePayload } from '@/lib/whatsapp/whatsapp/template-validators'

/**
 * Meta requires an `example.header_handle` (from the Resumable Upload
 * API) to create/edit a template with a media header — a plain public
 * URL is not accepted at creation time. This helper turns the template's
 * `header_media_url` (whether the user uploaded a file or pasted a link)
 * into a handle and writes it onto the payload, so both the upload path
 * and the legacy URL path actually succeed.
 *
 * No-op unless the header is an image/video/document that has a URL but
 * no handle yet.
 */

type MediaHeaderType = 'image' | 'video' | 'document'

// Meta's header-sample limits, capped at our chat-media bucket's 16 MB.
const MEDIA_RULES: Record<MediaHeaderType, { maxBytes: number; types: string[]; typeLabel: string }> = {
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png'], typeLabel: 'JPEG or PNG' },
  video: { maxBytes: 16 * 1024 * 1024, types: ['video/mp4', 'video/3gpp'], typeLabel: 'MP4 or 3GPP' },
  document: { maxBytes: 16 * 1024 * 1024, types: ['application/pdf'], typeLabel: 'PDF' },
}

const FILE_NAMES: Record<string, string> = {
  'image/jpeg': 'header.jpg',
  'image/png': 'header.png',
  'video/mp4': 'header.mp4',
  'video/3gpp': 'header.3gp',
  'application/pdf': 'header.pdf',
}

const GENERIC_TYPES = ['application/octet-stream', 'binary/octet-stream', 'application/x-download', 'application/force-download']

/** Identify a file from its leading "magic" bytes. */
function sniffMimeType(b: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.subarray(start, end))
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(4, 8) === 'ftyp') return ascii(8, 11) === '3gp' ? 'video/3gpp' : 'video/mp4'
  return null
}

function isMediaHeader(t: TemplatePayload['header_type']): t is MediaHeaderType {
  return t === 'image' || t === 'video' || t === 'document'
}

export async function ensureMediaHeaderHandle(
  payload: TemplatePayload,
  accessToken: string,
): Promise<void> {
  const kind = payload.header_type
  if (!isMediaHeader(kind)) return
  if (payload.header_handle) return // already have one
  if (!payload.header_media_url) return // validator already requires url-or-handle
  const rules = MEDIA_RULES[kind]

  const appId = process.env.META_APP_ID
  if (!appId) {
    throw new Error(
      `${kind[0].toUpperCase()}${kind.slice(1)}-header templates need META_APP_ID set (used for Meta’s Resumable Upload). Add it to your environment, or remove the ${kind} header.`,
    )
  }

  // Fetch the sample bytes (works for our uploaded chat-media URL
  // and for a manually-pasted public link).
  let res: Response
  try {
    res = await fetch(payload.header_media_url)
  } catch {
    throw new Error(`Could not fetch the header ${kind} URL. Make sure it is publicly reachable.`)
  }
  if (!res.ok) {
    throw new Error(`Header ${kind} URL returned ${res.status}. It must be publicly reachable.`)
  }

  const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  // File hosts like Google Drive serve downloads as a generic binary type —
  // for those, identify the file from its first bytes instead.
  const isGenericType = !contentType || GENERIC_TYPES.includes(contentType)
  if (!isGenericType && !rules.types.includes(contentType)) {
    throw new Error(`Header ${kind} must be ${rules.typeLabel} (got ${contentType}).`)
  }

  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength === 0) {
    throw new Error(`Header ${kind} is empty.`)
  }
  if (bytes.byteLength > rules.maxBytes) {
    throw new Error(
      `Header ${kind} is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB — the limit is ${rules.maxBytes / 1024 / 1024} MB.`,
    )
  }

  let mimeType: string
  if (isGenericType) {
    const sniffed = sniffMimeType(bytes)
    if (!sniffed || !rules.types.includes(sniffed)) {
      throw new Error(`Header ${kind} must be ${rules.typeLabel} — the link didn't return a ${rules.typeLabel} file.`)
    }
    mimeType = sniffed
  } else {
    mimeType = contentType
  }
  const fileName = FILE_NAMES[mimeType]

  const { handle } = await uploadResumableMedia({
    appId,
    accessToken,
    fileName,
    mimeType,
    bytes,
  })
  payload.header_handle = handle
}
