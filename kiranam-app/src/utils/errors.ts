// Supabase/RN surface raw, technical strings (`TypeError: Network request
// failed`, `AuthRetryableFetchError: ...`) straight from the fetch layer —
// fine for logs, meaningless to a donor. Anything else (e.g. "Invalid
// login credentials") already comes from Supabase in human language, so
// it's passed through unchanged.
export function friendlyError(message: string): string {
  if (/network request failed|failed to fetch|fetch error/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message;
}
