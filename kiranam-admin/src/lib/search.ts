/** Makes user search text safe to embed in a PostgREST `or=(…)` / `ilike`
 * filter: commas and parens are filter delimiters there, and `*`/`%` are
 * wildcards — strip them so a search can't break out of its pattern. */
export function searchTerm(q: string | null | undefined): string {
  return (q ?? '').replace(/[,()*%\\"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True when the search text looks like a KK / KKG number ("kk12", "KKG", "kkg 7"). */
export function isKkSearch(term: string): boolean {
  return /^kkg?\s*\d*$/i.test(term.trim());
}

/** PostgREST `or=(…)` filter for finding a person (profiles) by name, phone or
 * KK / KKG number. A KK-looking term searches the KK number only — its digits
 * would otherwise match every phone number that happens to contain them. `term`
 * must already have been through searchTerm(). */
export function personSearchFilter(term: string): string {
  if (isKkSearch(term)) return `kk_number.ilike.*${term.replace(/\s/g, '')}*`;
  const digits = term.replace(/\D/g, '') || term;
  return `full_name.ilike.*${term}*,phone.ilike.*${digits}*,kk_number.ilike.*${term}*`;
}
