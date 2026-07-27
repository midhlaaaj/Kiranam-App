import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Receiving end of kiranam-admin's one-click bridge
// (kiranam-admin/src/app/api/wacrm-bridge/route.ts). Both apps share the
// same Supabase project but live on separate domains, so a Kiranam session
// cookie can't carry over on its own — kiranam-admin mints a one-time magic
// link token for the already-verified admin, and this route exchanges it
// for a real wacrm session.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')

  if (!tokenHash || type !== 'magiclink') {
    return NextResponse.redirect(new URL('/login?error=invalid_bridge_link', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })

  if (error) {
    console.error('auth/bridge: verifyOtp failed', error)
    return NextResponse.redirect(new URL('/login?error=bridge_expired', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
