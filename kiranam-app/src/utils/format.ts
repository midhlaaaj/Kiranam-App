import * as Localization from 'expo-localization';

export function getDeviceLocale(): string {
  return Localization.getLocales()[0]?.languageTag || 'en-US';
}

// Kiranam charges everyone in INR (payments run through Razorpay) — only the
// *display* grouping/digits adapt to the viewer's locale, not the currency.
export function formatMoney(amount: number): string {
  return '₹' + amount.toLocaleString(getDeviceLocale());
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(
  dateInput: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString(getDeviceLocale(), opts);
}
