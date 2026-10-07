/** "en_US" → "English (US)", "ml" → "Malayalam". Meta template language
 * codes are BCP-47-ish with underscores; Intl.DisplayNames does the rest. */
export function languageName(code: string | null | undefined): string {
  if (!code) return 'English (US)';
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' });
    return names.of(code.replace('_', '-')) ?? code;
  } catch {
    return code;
  }
}
