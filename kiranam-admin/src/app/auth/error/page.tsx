// Landed on when a /auth/confirm link (password reset, signup confirmation,
// contributor account claim) is invalid or expired. Deliberately NOT the
// admin login page — most people clicking these links are contributors or
// volunteers using kiranam-app, not admins, and dumping them on an admin
// sign-in screen would be both confusing and wrong.
export default function AuthErrorPage() {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(160deg, #FF3B3B 0%, #EC2028 32%, #7A0D12 68%, #3D0709 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[65%]"
        style={{ background: 'radial-gradient(120% 90% at 30% -10%, rgba(255,140,140,0.5), transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm rounded-lg bg-kiranam-surface p-8 text-center shadow-elevation-lg">
        <p className="text-4xl font-extrabold tracking-tight text-kiranam-primary">Kiranam</p>
        <p className="mt-5 text-base font-semibold text-kiranam-ink">Link expired or invalid</p>
        <p className="mt-2 text-sm text-kiranam-muted">
          This link may have already been used, or it&apos;s past its expiry time. Please request a new one from
          wherever you started — the app, or the page you came from.
        </p>
      </div>
    </div>
  );
}
