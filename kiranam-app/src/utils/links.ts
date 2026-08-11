// Placeholder until the app is live on the stores — swap this for the real
// App Store / Play Store listing (or a smart-redirect page) once published.
// Everything that shares this URL (campaign/event/referral share text) only
// needs to change in this one place.
export const APP_JOIN_URL = 'https://kiranam.online/join';

export function referralJoinUrl(code: string): string {
  return `${APP_JOIN_URL}?ref=${encodeURIComponent(code)}`;
}
