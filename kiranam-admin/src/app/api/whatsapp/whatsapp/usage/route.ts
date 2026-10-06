import { NextResponse } from 'next/server'
import { createClient } from '@/lib/whatsapp/supabase/server'
import { getConversationAnalytics } from '@/lib/whatsapp/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/whatsapp/encryption'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

/**
 * GET /api/whatsapp/whatsapp/usage?days=7
 *
 * WABA-level conversation volume + spend for the trailing N days
 * (default 7, matching WhatsApp Manager's own default window). This
 * is the closest the Cloud API offers to a "message balance" — see
 * the comment on getConversationAnalytics() in meta-api.ts. Returns
 * 200 with `available: false` + a `reason` on every non-auth failure
 * (same convention as GET /config) so the widget can render a useful
 * empty state instead of a raw error.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        {
          available: false,
          reason: 'no_account',
          message: 'Your profile is not linked to an account.',
        },
        { status: 200 },
      )
    }

    const { searchParams } = new URL(request.url)
    const daysParam = Number(searchParams.get('days') ?? '7')
    const days =
      Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90 ? daysParam : 7

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('waba_id, access_token, status')
      .eq('account_id', accountId)
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json(
        {
          available: false,
          reason: 'not_connected',
          message: 'Connect a WhatsApp number in Settings first.',
        },
        { status: 200 },
      )
    }

    if (!config.waba_id) {
      return NextResponse.json(
        {
          available: false,
          reason: 'no_waba_id',
          message:
            'No WhatsApp Business Account ID saved for this connection — re-save it in Settings with the WABA ID filled in.',
        },
        { status: 200 },
      )
    }

    let accessToken: string
    try {
      accessToken = decrypt(config.access_token)
    } catch (err) {
      console.error('[whatsapp/usage GET] Token decryption failed:', err)
      return NextResponse.json(
        {
          available: false,
          reason: 'token_corrupted',
          message: 'The stored access token cannot be decrypted. Reset and re-save your connection in Settings.',
        },
        { status: 200 },
      )
    }

    const end = Math.floor(Date.now() / 1000)
    const start = end - days * 24 * 60 * 60

    try {
      const summary = await getConversationAnalytics({
        wabaId: config.waba_id,
        accessToken,
        start,
        end,
      })
      return NextResponse.json({ available: true, days, ...summary })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[whatsapp/usage GET] Meta API error:', message)
      return NextResponse.json(
        { available: false, reason: 'meta_api_error', message },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error('Error in WhatsApp usage GET:', error)
    return NextResponse.json(
      { available: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 },
    )
  }
}
