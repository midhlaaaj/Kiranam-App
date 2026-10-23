// Every share (campaigns, events, a coordinator's referral) points at the
// kiranam.online landing page, which has the store buttons. Change the link
// or the wording here and every share picks it up.
export const APP_LANDING_URL = 'https://kiranam.online';

// The landing page carries ?ref= through the install (Play install referrer on
// Android, clipboard on iPhone), so the code reaches sign-up even when the
// person installs the app first.
export function referralLink(code: string): string {
  return `${APP_LANDING_URL}/?ref=${encodeURIComponent(code)}`;
}

export function campaignShareMessage(title: string): string {
  return `Support "${title}" with Karunya Kiranam, a Health Care Foundation initiative. Download the app and start contributing to Karunya Kiranam: ${APP_LANDING_URL}`;
}

export function eventShareMessage(title: string): string {
  return `You're invited to "${title}", a Karunya Kiranam event. Download the app to see the details and start contributing to Karunya Kiranam: ${APP_LANDING_URL}`;
}

export function referralShareMessage(code: string): string {
  return (
    `Join me on Karunya Kiranam, a Health Care Foundation initiative that brings care and support to people in need. ` +
    `Download the app and start contributing to Karunya Kiranam: ${referralLink(code)}\n\n` +
    `My referral code is ${code}. It's filled in for you when you sign up from this link, or you can enter it under "Have a referral code?".`
  );
}

/** Notifications sent before the Volunteer → Coordinator rename link to the
 * old screen names (e.g. "/(volunteer-tabs)/dashboard"); map them onto the
 * renamed routes so tapping an old push still opens the right screen. */
export function upgradeLegacyDeepLink(link: string): string {
  return link.replace(/volunteer/g, 'coordinator');
}
