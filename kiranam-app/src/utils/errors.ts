// Supabase/RN surface raw, technical strings (`TypeError: Network request
// failed`, `AuthRetryableFetchError: ...`, or a raw Postgres constraint
// violation like `duplicate key value violates unique constraint
// "profiles_phone_key"`) straight from the fetch/DB layer — fine for logs,
// meaningless (or alarming) to a donor. Anything else (e.g. "Invalid login
// credentials") already comes from Supabase in human language, so it's
// passed through unchanged. Every call site that surfaces an error string
// from a Supabase call to the UI (Alert.alert, inline field errors, toasts)
// should route it through this first — see errors.test.ts-adjacent call
// sites across the app.
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
  // A phone/email already claimed by another account — specific and
  // genuinely actionable, worth its own message rather than the generic
  // fallback below.
  if (/duplicate key value violates unique constraint "profiles_phone_key"/i.test(message)) {
    console.error('[friendlyError] Raw Postgres error leaked:', message);
    return 'This phone number is already registered to an account. Try logging in instead.';
  }
  if (/duplicate key value violates unique constraint "profiles_email_key"/i.test(message)) {
    console.error('[friendlyError] Raw Postgres error leaked:', message);
    return 'This email is already in use on another account.';
  }
  // Catch-all for any other raw Postgres/PostgREST error — these are
  // identifiable by their distinctive vocabulary (constraint names,
  // relation/column identifiers, SQLSTATE-style phrasing) that never
  // appears in genuinely human-authored Supabase Auth messages. Log the
  // real reason for debugging; show something a non-technical donor can
  // actually act on instead of a raw database error.
  if (/violates .* constraint|duplicate key value|relation ".*" does not exist|column ".*" does not exist|permission denied for|row-level security policy/i.test(message)) {
    console.error('[friendlyError] Raw Postgres error leaked:', message);
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return message;
}
