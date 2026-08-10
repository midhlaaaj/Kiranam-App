import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// auth.kiranam.online exists specifically so that password-reset,
// signup-confirmation, and account-claim email links never expose the
// admin app (login, contributors, etc.) to the contributors/volunteers
// who make up most of the people clicking them. Vercel serves this same
// deployment under any domain pointed at it, so without this check,
// anything on this host would fall through to the normal admin app —
// including its "redirect unauthenticated visitors to /login" behavior,
// exactly the thing this subdomain was built to avoid. Checked first,
// before touching session cookies, since a redirect away doesn't need them.
const AUTH_SUBDOMAIN = 'auth.kiranam.online';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isAuthSubdomain = host === AUTH_SUBDOMAIN || host.startsWith(`${AUTH_SUBDOMAIN}:`);
  if (isAuthSubdomain && !request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/error', request.url));
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
  const { pathname } = request.nextUrl;
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
