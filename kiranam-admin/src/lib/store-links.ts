// App store listings, shared by the kiranam.online landing page and the
// /join share-link redirect so there's one place to update them.

export const ANDROID_PACKAGE = "com.kiranam.app";
export const ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

// Builds the Play Store URL with the referrer query param the Play Install
// Referrer API hands back to the app after a fresh install — this is a
// free, first-party mechanism (no Branch/AppsFlyer needed) for carrying a
// referral code through an Android install.
export function androidStoreUrl(ref: string | null): string {
  if (!ref) return ANDROID_STORE_URL;
  return `${ANDROID_STORE_URL}&referrer=${encodeURIComponent(`ref_${ref}`)}`;
}

// TODO: set to the real App Store listing once Kiranam is published on iOS.
// While null, the landing page's App Store button shows "Coming soon" and
// /join sends iPhone visitors to the landing page instead.
export const IOS_STORE_URL: string | null = null;
