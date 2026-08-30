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
  // supabase-js's generic wrapper whenever an Edge Function responds with a
  // non-2xx status (create/verify/cancel-razorpay-subscription, etc.) —
  // callers should prefer extracting the function's actual JSON error body
  // (see getEdgeFunctionErrorMessage below) before falling back to this
  // string, but this catch-all guarantees the raw wrapper text itself never
  // reaches a user even if that extraction wasn't done or came back empty.
  if (/edge function returned a non-2xx status code/i.test(message)) {
    console.error('[friendlyError] Raw Edge Function wrapper error leaked:', message);
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return message;
}

// supabase.functions.invoke()'s `error` is a FunctionsHttpError whose
// `.message` is always the same generic "non-2xx status code" wrapper —
// the function's own JSON body (`{ error: "..." }`, written by every
// Kiranam Edge Function on a failure response) lives on `error.context`,
// a Response object. Best-effort unwraps that for a more specific,
// already-human-written reason; falls back to the generic message
// (still cleaned up by friendlyError's catch-all above) if anything about
// that shape isn't as expected.
// react-native-razorpay rejects checkout with a plain object, not an Error
// instance — shape varies (flat `{ code, description }`, or a whole native
// failure payload one level deeper under `error`), and `description` is
// sometimes itself another JSON blob rather than human text. Never trust
// it blindly; only use a candidate that reads like real prose, and default
// to a safe generic message otherwise.
export function getRazorpayCheckoutErrorMessage(err: unknown): string {
  const e = err as Record<string, unknown> | null | undefined;
  const inner = e?.error && typeof e.error === 'object' ? (e.error as Record<string, unknown>) : e;
  const looksLikeProse = (value: unknown): value is string =>
    typeof value === 'string' && !!value.trim() && value.trim() !== 'undefined' && !value.trim().startsWith('{');

  for (const candidate of [inner?.description, inner?.reason, e?.description]) {
    if (looksLikeProse(candidate)) return candidate;
  }
  if (e?.code === 'PAYMENT_CANCELLED' || inner?.code === 'PAYMENT_CANCELLED') {
    return 'Autopay setup was cancelled.';
  }
  return 'The payment authorization could not be completed. Please try again or use a different payment method.';
}

export async function getEdgeFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Something went wrong';
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object' || !('json' in context)) return fallback;
  try {
    const body = await (context as Response).json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // Response body already consumed, not JSON, etc. — fall back below.
  }
  return fallback;
}
