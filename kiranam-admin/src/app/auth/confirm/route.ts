import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Receiving end of Supabase's password-reset (and other OTP-based) email
// links. Requires the "Reset Password" email template in the Supabase
// Dashboard (Auth → Email Templates) to link here with `token_hash`/`type`,
// e.g. {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
// — Supabase's default template instead points at its own hosted verify
// endpoint, which doesn't hand this route anything to verify.
//
// One Supabase project, three apps sharing this same template (kiranam-app,
// kiranam-admin, and admin-registered contributors claiming their account) —
// `next` is how each caller says where to land afterward. A `kiranamapp://`
// next means the destination is the *mobile app*, which can't read the
// session this route just established in kiranam-admin's own cookies — so
// instead of a bare redirect, forward the resulting access/refresh tokens as
// query params, since the token_hash itself is single-use and would already
// be spent by the time the app tried to verify it again.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const isMobileDeepLink = next.startsWith('kiranamapp://');
      if (isMobileDeepLink && data.session) {
        const appUrl = new URL(next);
        appUrl.searchParams.set('access_token', data.session.access_token);
        appUrl.searchParams.set('refresh_token', data.session.refresh_token);
        return NextResponse.redirect(appUrl);
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=reset_link_invalid', request.url));
}
