// Supabase/RN surface raw, technical strings (`TypeError: Network request
// failed`, `AuthRetryableFetchError: ...`) straight from the fetch layer —
// fine for logs, meaningless to a donor. Anything else (e.g. "Invalid
// login credentials") already comes from Supabase in human language, so
// it's passed through unchanged.
export function friendlyError(message: string): string {
  if (/network request failed|failed to fetch|fetch error/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  // When Supabase's Auth server 500s without a usable JSON error body,
  // supabase-js falls back to stringifying the raw fetch Response object
  // (`{"type":"default","status":500,...}`) as the error message — a
  // technical dump, not something a donor should ever see. Log it for
  // debugging and show a generic message instead.
  if (/^\s*\{"type":"default"/.test(message)) {
    console.error('[friendlyError] Raw Response leaked as error message:', message);
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return message;
}
