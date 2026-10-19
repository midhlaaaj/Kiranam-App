import Link from 'next/link';
import { findValidInvite } from '@/lib/adminInvite';
import { SignupForm } from './SignupForm';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = await findValidInvite(token);

  if (!invite || !token) {
    return (
      <div
        className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
        style={{ background: 'linear-gradient(160deg, #FF3B3B 0%, #EC2028 32%, #7A0D12 68%, #3D0709 100%)' }}
      >
        <div className="animate-count-in relative w-full max-w-sm rounded-lg bg-kiranam-surface p-8 shadow-elevation-lg">
          <p className="text-4xl font-extrabold tracking-tight text-kiranam-brand">Kiranam</p>
          <p className="mt-5 text-sm font-semibold text-kiranam-ink">This invite link isn&apos;t valid</p>
          <p className="mt-2 text-sm text-kiranam-muted">
            It may have expired, already been used, or been replaced by a newer invite. Ask an admin to send you a new
            invite — and use the link from the latest email.
          </p>
          <p className="mt-5 text-sm text-kiranam-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-kiranam-ink hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <SignupForm token={token} email={invite.email} />;
}
