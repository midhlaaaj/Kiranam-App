/** Makes user search text safe to embed in a PostgREST `or=(…)` / `ilike`
 * filter: commas and parens are filter delimiters there, and `*`/`%` are
 * wildcards — strip them so a search can't break out of its pattern. */
export function searchTerm(q: string | null | undefined): string {
  return (q ?? '').replace(/[,()*%\\"]/g, ' ').replace(/\s+/g, ' ').trim();
}
