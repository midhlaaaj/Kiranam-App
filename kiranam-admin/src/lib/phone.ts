import { isValidPhoneNumber, getExampleNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import examples from 'libphonenumber-js/examples.mobile.json';
import type { CountryCode } from 'libphonenumber-js/min';

// Mirrors kiranam-app's src/utils/validators.ts (validatePhoneNumber) so a
// number rejected here would also be rejected there, and vice versa —
// both surfaces feed the same phone-OTP auth identity.
export function validatePhoneNumber(nationalDigits: string, iso2: CountryCode): string | null {
  const trimmed = nationalDigits.trim();
  if (!trimmed) return 'Phone number is required.';
  if (!isValidPhoneNumber(trimmed, iso2)) {
    const example = getExampleNumber(iso2, examples);
    return example
      ? `Enter a valid ${example.country} phone number (e.g. ${example.formatNational()}).`
      : 'Enter a valid phone number.';
  }
  return null;
}

/** Display form of a stored phone number: "919846571425" / "+919846571425"
 * → "+91 98465 71425". Returns the input unchanged if it can't be parsed. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const parsed = parsePhoneNumberFromString(raw.startsWith('+') ? raw : `+${raw}`);
  return parsed?.isValid() ? parsed.formatInternational() : raw;
}
