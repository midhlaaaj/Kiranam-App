// Date/time formatting pinned to India time. Server Components render in the
// host's zone (UTC on Vercel), so every helper passes `timeZone` explicitly —
// never call toLocaleString() without it.

export const APP_TIME_ZONE = 'Asia/Kolkata';
const LOCALE = 'en-IN';

type DateInput = string | number | Date;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

const dateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const dateNoYearFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TIME_ZONE, day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
const isoDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "6 Oct 2026" */
export function formatDate(d: DateInput) {
  return dateFmt.format(toDate(d));
}

/** "3:42 pm" */
export function formatTime(d: DateInput) {
  return timeFmt.format(toDate(d)).toLowerCase();
}

/** "6 Oct, 3:42 pm" — year added only when it isn't the current one. */
export function formatDateTime(d: DateInput) {
  const date = toDate(d);
  const sameYear = isoDay(date).slice(0, 4) === isoDay(new Date()).slice(0, 4);
  return `${(sameYear ? dateNoYearFmt : dateFmt).format(date)}, ${formatTime(date)}`;
}

/** Full, unambiguous timestamp for tooltips: "6 Oct 2026, 3:42 pm IST" */
export function formatDateTimeFull(d: DateInput) {
  const date = toDate(d);
  return `${dateFmt.format(date)}, ${formatTime(date)} IST`;
}

/** "just now" · "5m ago" · "3h ago" — falls back to formatDateTime past 24h. */
export function formatRelative(d: DateInput, now: Date = new Date()) {
  const date = toDate(d);
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h ago`;
  return formatDateTime(date);
}

/** YYYY-MM-DD of the given instant, in India time. */
export function isoDay(d: DateInput = new Date()) {
  return isoDayFmt.format(toDate(d));
}

/** "Today" · "Yesterday" · "Mon, 5 Oct" — for grouping lists by day. */
export function formatDayHeading(d: DateInput, now: Date = new Date()) {
  const day = isoDay(d);
  if (day === isoDay(now)) return 'Today';
  if (day === isoDay(new Date(now.getTime() - 86400000))) return 'Yesterday';
  return weekdayFmt.format(toDate(d));
}

/** YYYY-MM-DD `days` before today (India time). 0 = today. */
export function isoDayOffset(days: number, now: Date = new Date()) {
  return isoDay(new Date(now.getTime() - days * 86400000));
}

/** Inclusive IST day range → timestamptz bounds for a Postgres filter. */
export function istRangeBounds(from: string, to: string) {
  return { gte: `${from}T00:00:00+05:30`, lte: `${to}T23:59:59.999+05:30` };
}

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDay(s: string | undefined | null): s is string {
  return !!s && ISO_DAY_RE.test(s) && !Number.isNaN(Date.parse(s));
}

/** Standard period presets for filter bars, computed in India time. */
export function periodPresets(now: Date = new Date()) {
  const today = isoDay(now);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: isoDayOffset(6, now), to: today },
    { label: 'Last 30 days', from: isoDayOffset(29, now), to: today },
    { label: 'Last 90 days', from: isoDayOffset(89, now), to: today },
  ];
}

/** Human label for a from/to pair: a preset's name, else "1 Oct – 6 Oct". */
export function describePeriod(from?: string, to?: string, now: Date = new Date()) {
  if (!from || !to) return null;
  const preset = periodPresets(now).find((p) => p.from === from && p.to === to);
  if (preset) return preset.label;
  const f = new Date(`${from}T12:00:00+05:30`);
  const t = new Date(`${to}T12:00:00+05:30`);
  return from === to ? formatDate(f) : `${dateNoYearFmt.format(f)} – ${dateFmt.format(t)}`;
}
