import { NextResponse, type NextRequest } from 'next/server';

// auth.kiranam.online exists specifically so that password-reset,
// signup-confirmation, and account-claim email links never expose the
// admin app (login, contributors, etc.) to the contributors/volunteers
// who make up most of the people clicking them. Vercel serves this same
// deployment under any domain pointed at it, so without this check,
// anything on this host would fall through to the normal admin app —
// including its "redirect unauthenticated visitors to /login" behavior,
// exactly the thing this subdomain was built to avoid.
const AUTH_SUBDOMAIN = 'auth.kiranam.online';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isAuthSubdomain = host === AUTH_SUBDOMAIN || host.startsWith(`${AUTH_SUBDOMAIN}:`);
  if (!isAuthSubdomain) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/auth/')) return NextResponse.next();

  return NextResponse.redirect(new URL('/auth/error', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
