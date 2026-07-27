// Server actions in this app largely `throw new Error(error.message)` on a
// failed Supabase call, passing the raw Postgres error text straight through
// (constraint names, column names, SQLSTATE codes). That's fine for us to
// read in logs, but meaningless — and a bit alarming — for an admin to see
// in a toast. This maps the common raw-Postgres shapes to plain language;
// anything unrecognized still shows (most thrown messages in this app are
// already hand-written and safe), it only replaces the ones that look like
// database internals leaking through.
export function friendlyErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'That already exists — please use a different value.';
  }
  if (lower.includes('violates foreign key constraint')) {
    return "Couldn't complete this — a related record is missing or was already removed.";
  }
  if (lower.includes('violates row-level security') || lower.includes('permission denied')) {
    return "You don't have permission to do that.";
  }
  if (lower.includes('violates not-null constraint')) {
    return 'A required field is missing.';
  }
  if (lower.includes('violates check constraint')) {
    return "That value isn't allowed here.";
  }
  if (/^[a-z0-9_]+ error:/i.test(raw) || /\bsqlstate\b/i.test(raw) || lower.includes('constraint')) {
    return 'Something went wrong saving that. Please try again.';
  }

  return raw;
}
