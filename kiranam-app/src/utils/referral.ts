// Referral codes that arrive via a /join deep link (or an iOS clipboard
// fallback, since Apple gives no install-referrer signal for a fresh
// install) land here before anyone's signed in. AppContext.saveProfile
// reads this stash and redeems it at signup — it must never depend on the
// person having manually typed the code, since the whole point of the
// share link is that they didn't have to.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'kiranam.pendingReferralCode';

// Mirrors the normalization in the redeem_referral_code() Postgres function
// so a stashed code matches what actually gets looked up at redemption time.
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function stashPendingReferralCode(rawCode: string): Promise<void> {
  const code = normalizeReferralCode(rawCode);
  if (code.length < 4) return;
  await AsyncStorage.setItem(PENDING_KEY, code);
}

export async function peekPendingReferralCode(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_KEY);
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

// Apple gives apps no install-referrer signal, so a referral code shared
// before someone had the app installed can't reach them via a deep link —
// it has to ride along on the clipboard instead. kiranam.online/join copies
// the full join URL (not a bare code) before sending people to the App
// Store, specifically so this can tell "a Kiranam referral link" apart from
// whatever else the person might happen to have copied.
const JOIN_LINK_RE = /kiranam\.online\/join\?[^"'\s]*\bref=([A-Za-z0-9]{4,20})/i;

export function extractReferralCodeFromText(text: string): string | null {
  const match = text.match(JOIN_LINK_RE);
  return match ? normalizeReferralCode(match[1]) : null;
}
