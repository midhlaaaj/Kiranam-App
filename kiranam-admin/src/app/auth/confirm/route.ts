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
// `next` is how each caller says where to land afterward. This route only
// ever runs on auth.kiranam.online, so any `next` on a *different* host
// (the mobile app's kiranamapp:// scheme, or kiranam-admin's own main
// domain — a sibling subdomain, not the same host) can't read the session
// just established in cookies here: those are host-only. Forward the
// resulting access/refresh tokens as query params instead, since the
// token_hash itself is single-use and would already be spent by the time
// the destination tried to verify it again.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Falling back to '/' would land non-admin users (contributors,
  // volunteers) on the admin dashboard root, which verifyAdmin() then
  // bounces to /login — looking exactly like a broken "redirects to admin
  // login" bug. /auth/success is the neutral, unbranded-to-admin landing.
  const next = searchParams.get('next') || '/auth/success';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const isMobileDeepLink = next.startsWith('kiranamapp://');
      if (isMobileDeepLink && data.session) {
        const appUrl = new URL(next);
        appUrl.searchParams.set('access_token', data.session.access_token);
        appUrl.searchParams.set('refresh_token', data.session.refresh_token);
        // Route through /auth/verifying instead of redirecting straight to
        // the app: the token is already spent at this point (verifyOtp just
        // consumed it above), so this hop is purely cosmetic/UX — a visible
        // "Authenticating → Verified" moment plus a manual "Open the app"
        // button, since some in-app browsers (Mail's built-in Safari view,
        // Gmail's webview) block a JS-triggered kiranamapp:// navigation.
        const verifyingUrl = new URL('/auth/verifying', request.url);
        verifyingUrl.searchParams.set('next', appUrl.toString());
        return NextResponse.redirect(verifyingUrl);
      }

      const targetUrl = new URL(next, request.url);
      const isCrossHost = targetUrl.host !== request.nextUrl.host;
      if (isCrossHost && data.session) {
        targetUrl.searchParams.set('access_token', data.session.access_token);
        targetUrl.searchParams.set('refresh_token', data.session.refresh_token);
      }
      return NextResponse.redirect(targetUrl);
    }
  }

  // A neutral, unbranded-to-admin page — not /login. A contributor or
  // volunteer whose link expired should never land on the admin sign-in
  // screen; this route is shared across all three Kiranam apps, and most
  // of the people clicking these links aren't admins at all.
  return NextResponse.redirect(new URL('/auth/error', request.url));
}
