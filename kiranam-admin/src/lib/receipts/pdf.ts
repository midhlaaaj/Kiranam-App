import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Server-side copy of the app's receipt (kiranam-app/src/app/receipt.tsx),
// so every payment — app, autopay or admin-entered — gets the same PDF.
// Inter (not a standard PDF font) because it has the ₹ glyph.

export interface ReceiptData {
  name: string;
  email: string | null;
  phone: string | null;
  /** What it was for, e.g. "Monthly Contribution" or "Campaign: …". */
  label: string;
  amount: number;
  transactionId: string;
  date: Date;
}

const ASSETS = path.join(process.cwd(), 'src/lib/receipts/assets');

const INK = rgb(0x0c / 255, 0x0c / 255, 0x0d / 255);
const MUTED = rgb(0x7a / 255, 0x75 / 255, 0x6e / 255);
const RED = rgb(0xec / 255, 0x20 / 255, 0x28 / 255);
const RULE = rgb(0xee / 255, 0xeb / 255, 0xe7 / 255);
const FAINT = rgb(0xb0 / 255, 0xad / 255, 0xa8 / 255);

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;

let assetsPromise: Promise<Record<string, Uint8Array>> | null = null;
function loadAssets() {
  assetsPromise ??= (async () => {
    const names = ['Inter-Regular.ttf', 'Inter-SemiBold.ttf', 'kiranam-logo.png', 'hcf-logo.png', 'hcf-seal.png'];
    const files = await Promise.all(names.map((n) => readFile(path.join(ASSETS, n))));
    return Object.fromEntries(names.map((n, i) => [n, new Uint8Array(files[i])]));
  })();
  return assetsPromise;
}

export function formatReceiptAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatReceiptDate(date: Date) {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

/** Shrinks `text` with an ellipsis until it fits `maxWidth`. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Characters Inter can't draw (emoji etc.) would throw — drop them. */
function safe(text: string, font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  return [...text].filter((c) => supported.has(c.codePointAt(0)!)).join('').replace(/\s+/g, ' ').trim();
}

export async function buildReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const assets = await loadAssets();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Kiranam Payment Receipt');
  doc.setAuthor('Karunya Kiranam · Health Care Foundation');

  const regular = await doc.embedFont(assets['Inter-Regular.ttf']);
  const semibold = await doc.embedFont(assets['Inter-SemiBold.ttf']);
  const kiranamLogo = await doc.embedPng(assets['kiranam-logo.png']);
  const hcfLogo = await doc.embedPng(assets['hcf-logo.png']);
  const seal = await doc.embedPng(assets['hcf-seal.png']);

  const page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  const contentW = PAGE_W - MARGIN * 2;
  const text = (s: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(safe(s, font), { x, y, size, font, color });

  // ── Header: Kiranam logo, title and address (left); HCF logo (right).
  let y = PAGE_H - MARGIN;
  const kLogo = kiranamLogo.scaleToFit(240, 48);
  page.drawImage(kiranamLogo, { x: MARGIN, y: y - kLogo.height, width: kLogo.width, height: kLogo.height });
  let leftY = y - kLogo.height - 22;
  text('Payment Receipt', MARGIN, leftY, 16, semibold, MUTED);
  leftY -= 22;
  for (const line of [
    'P.O.Kattippara, Poonoor',
    '673573, Kerala, India',
    'Ph: +91 8592892020',
    'Email: support@kiranam.online',
    'www.healthcarefoundation.in',
  ]) {
    text(line, MARGIN, leftY, 10, regular, MUTED);
    leftY -= 15;
  }

  const hLogo = hcfLogo.scaleToFit(200, 60);
  const rightW = Math.max(hLogo.width, semibold.widthOfTextAtSize('Government of Kerala', 9));
  const rightX = PAGE_W - MARGIN - rightW;
  page.drawImage(hcfLogo, { x: rightX, y: y - hLogo.height, width: hLogo.width, height: hLogo.height });
  text('Government of Kerala', rightX, y - hLogo.height - 14, 9, regular, MUTED);
  text('SRA No. 423/2010', rightX, y - hLogo.height - 27, 9, regular, MUTED);

  // ── Details table.
  y = leftY - 24;
  const rows: { label: string; value: string; amount?: boolean }[] = [
    { label: 'Name', value: data.name || '-' },
    { label: 'Email', value: data.email || '-' },
    { label: 'Mobile Number', value: data.phone || '-' },
    { label: 'For', value: data.label || 'Monthly Contribution' },
    { label: 'Amount', value: formatReceiptAmount(data.amount), amount: true },
    { label: 'Transaction ID', value: data.transactionId },
    { label: 'Date', value: formatReceiptDate(data.date) },
  ];
  for (const row of rows) {
    const size = row.amount ? 18 : 13;
    const rowH = row.amount ? 46 : 40;
    const baseline = y - rowH / 2 - size * 0.35;
    text(row.label, MARGIN, baseline, size, regular, MUTED);
    const value = fit(safe(row.value, semibold), semibold, size, contentW - 160);
    const w = semibold.widthOfTextAtSize(value, size);
    text(value, PAGE_W - MARGIN - w, baseline, size, semibold, row.amount ? RED : INK);
    y -= rowH;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: RULE });
  }

  // ── Sign-off: seal over a thank-you line, right-aligned.
  const thanks = 'Thank you for your contribution.';
  const thanksW = semibold.widthOfTextAtSize(thanks, 12);
  const sealDims = seal.scaleToFit(90, 90);
  const blockCenter = PAGE_W - MARGIN - thanksW / 2;
  y -= 44;
  page.drawImage(seal, { x: blockCenter - sealDims.width / 2, y: y - sealDims.height, width: sealDims.width, height: sealDims.height });
  y -= sealDims.height + 18;
  text(thanks, PAGE_W - MARGIN - thanksW, y, 12, semibold, INK);

  // ── Footer.
  const footer = 'This is a computer-generated receipt for your contribution to Kiranam.';
  const footerW = regular.widthOfTextAtSize(footer, 9);
  text(footer, (PAGE_W - footerW) / 2, y - 48, 9, regular, FAINT);
  const org = 'Karunya Kiranam · An initiative of Health Care Foundation';
  text(org, (PAGE_W - regular.widthOfTextAtSize(org, 9)) / 2, y - 62, 9, regular, FAINT);

  // 80G approval line, wrapped to the content width.
  const approval =
    'Health Care Foundation is approved under Section 80G of the Income Tax Act, 1961 (Approval No. AAATH8790C28KC02, valid for assessment years 2027-28 to 2031-32). Contributions may be eligible for deduction subject to the provisions of the Act.';
  let lineY = y - 82;
  let current = '';
  for (const word of approval.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (regular.widthOfTextAtSize(next, 8) > contentW && current) {
      text(current, (PAGE_W - regular.widthOfTextAtSize(current, 8)) / 2, lineY, 8, regular, FAINT);
      lineY -= 12;
      current = word;
    } else {
      current = next;
    }
  }
  if (current) text(current, (PAGE_W - regular.widthOfTextAtSize(current, 8)) / 2, lineY, 8, regular, FAINT);

  return doc.save();
}
