import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// auth.kiranam.online exists specifically so that password-reset and
// signup-confirmation email links never expose the admin app (login,
// contributors, etc.) to the contributors/volunteers who make up most
// of the people clicking them. Vercel serves this same
// deployment under any domain pointed at it, so without this check,
// anything on this host would fall through to the normal admin app —
// including its "redirect unauthenticated visitors to /login" behavior,
// exactly the thing this subdomain was built to avoid. Checked first,
// before touching session cookies, since a redirect away doesn't need them.
const AUTH_SUBDOMAIN = 'auth.kiranam.online';

// kiranam.online is the public site (landing page, /join share links,
// /legal pages) and admin.kiranam.online is the admin panel — both served by
// this one deployment. /api/* stays reachable on both: the admin UI calls it
// same-origin from the admin host, while Razorpay, Meta, the Supabase
// send-SMS hook and the cron pinger were all configured against the main
// domain and keep working there untouched. Any other host (localhost,
// *.vercel.app previews) gets no host routing — the admin app at /, with
// the landing page viewable at /landing.
const ADMIN_HOST = 'admin.kiranam.online';
const ADMIN_ORIGIN = `https://${ADMIN_HOST}`;
const MAIN_HOSTS = ['kiranam.online', 'www.kiranam.online'];
const MAIN_ORIGIN = 'https://www.kiranam.online';
const LANDING_PATH = '/landing';

function isPublicSitePath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/join' ||
    pathname.startsWith('/legal/') ||
    pathname.startsWith('/auth/')
  );
}

function hostname(host: string) {
  return host.split(':')[0].toLowerCase();
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isAuthSubdomain = host === AUTH_SUBDOMAIN || host.startsWith(`${AUTH_SUBDOMAIN}:`);
  if (isAuthSubdomain && !request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (MAIN_HOSTS.includes(hostname(host)) && !isApi) {
    if (pathname === LANDING_PATH) {
      return NextResponse.redirect(new URL(`/${search}`, request.url), 308);
    }
    if (!isPublicSitePath(pathname)) {
      // Old admin bookmarks (kiranam.online/contributors etc.) land on the
      // same page on the admin host.
      return NextResponse.redirect(`${ADMIN_ORIGIN}${pathname}${search}`, 308);
    }
    if (pathname === '/') {
      return NextResponse.rewrite(new URL(`${LANDING_PATH}${search}`, request.url));
    }
    // Public pages don't read the admin session — no need to refresh it.
    return NextResponse.next();
  }

  if (hostname(host) === ADMIN_HOST && !isApi) {
    if (pathname === LANDING_PATH) {
      return NextResponse.redirect(`${MAIN_ORIGIN}/${search}`, 308);
    }
    if (pathname === '/join' || pathname.startsWith('/legal/')) {
      return NextResponse.redirect(`${MAIN_ORIGIN}${pathname}${search}`, 308);
    }
  }

  const response = await updateSession(request);

  // Ported from wacrm's own middleware.ts (now merged in under /whatsapp):
  // unauthenticated requests to its WhatsApp-messaging API routes get a
  // 401 instead of falling through to a route handler that would itself
  // fail confusingly. Excludes /webhook (Meta calls this unauthenticated,
  // verified by its own signature check) so that path is untouched.
  // Every other /api/whatsapp/* route (account, ai, automations, contacts,
  // flows, invitations, quick-replies, v1) does its own auth check
  // per-route, same as it always did in wacrm — this mirrors that file's
  // exact scope, not a broader gate.
  //
  // A fresh read-only client here (not `@/lib/supabase/server.ts`, which
  // reads cookies via `next/headers` — not valid in this Edge/middleware
  // context). `updateSession` above already refreshed the session and
  // wrote any rotated cookies onto `response`, so this only needs to read.
  if (pathname.startsWith('/api/whatsapp/whatsapp/') && !pathname.includes('/webhook')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op — updateSession() already persisted any refreshed
            // cookies onto `response`; this client only reads.
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
