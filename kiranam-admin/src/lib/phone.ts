import { isValidPhoneNumber, getExampleNumber } from 'libphonenumber-js/min';
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

/** National-format example digit length for a country, used to cap free typing
 * (e.g. maxLength on the input) before the field is even validated. */
export function exampleNationalLength(iso2: CountryCode): number | null {
  const example = getExampleNumber(iso2, examples);
  return example ? example.nationalNumber.length : null;
}
