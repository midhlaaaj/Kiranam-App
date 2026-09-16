// Shared label + section wrapper for server-rendered edit forms (campaigns,
// events, ...) so labeled fields don't have to be hand-rolled in every page —
// same visual language as RegisterContributorForm's client-side version, but
// plain enough to drop into an async server component with no client state.

export function FieldGroup({
  label,
  last = false,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-3 ${last ? '' : 'mb-5 border-b border-kiranam-border pb-5'}`}>
      <h2 className="text-xs font-semibold tracking-wide text-kiranam-muted uppercase">{label}</h2>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  optional = false,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-kiranam-ink">
        {label} {optional && <span className="font-normal text-kiranam-muted">— optional</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-kiranam-muted">{hint}</p>}
    </div>
  );
}
