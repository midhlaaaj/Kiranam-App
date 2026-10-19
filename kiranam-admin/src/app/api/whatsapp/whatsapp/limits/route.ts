import { NextResponse } from 'next/server'
import { createClient } from '@/lib/whatsapp/supabase/server'
import { hasMinRole, isAccountRole } from '@/lib/whatsapp/auth/roles'
import { decrypt } from '@/lib/whatsapp/whatsapp/encryption'
import { META_API_BASE } from '@/lib/whatsapp/whatsapp/meta-api'
import {
  getSendLimits,
  recentlyMessagedContactIds,
  remainingAllowance,
  tierToLimit,
} from '@/lib/whatsapp/send-limits'

// Settings → WhatsApp → "Sending limits".
//   GET  → saved limits + how many people were messaged in the last 24h
//   PUT  → save cap / reserve / auto-resume (admins and owners)
//   POST → { action: 'check_meta' } read the current tier from Meta

async function context() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle()
  const accountId = profile?.account_id as string | undefined
  if (!accountId) {
    return { error: NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 }) } as const
  }
  const role = profile?.account_role
  return { supabase, accountId, isAdmin: isAccountRole(role) && hasMinRole(role, 'admin') } as const
}

async function status(supabase: Awaited<ReturnType<typeof createClient>>, accountId: string) {
  const limits = await getSendLimits(supabase, accountId)
  if (!limits) return null
  const used = await recentlyMessagedContactIds(supabase, accountId)
  return {
    ...limits,
    metaLimit: tierToLimit(limits.metaTier),
    messagedLast24h: used.size,
    remaining: remainingAllowance(limits, used),
  }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const result = await status(ctx.supabase, ctx.accountId)
  if (!result) return NextResponse.json({ error: 'WhatsApp is not connected yet.' }, { status: 404 })
  return NextResponse.json(result)
}

export async function PUT(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!ctx.isAdmin) return NextResponse.json({ error: "This action requires the 'admin' role or higher" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const cap = body.daily_send_cap === null || body.daily_send_cap === '' ? null : Number(body.daily_send_cap)
  const reserve = Number(body.daily_reserve ?? 0)
  if (cap !== null && (!Number.isInteger(cap) || cap < 0)) {
    return NextResponse.json({ error: 'The daily limit must be a whole number, or empty for no limit.' }, { status: 400 })
  }
  if (!Number.isInteger(reserve) || reserve < 0) {
    return NextResponse.json({ error: 'The OTP reserve must be a whole number.' }, { status: 400 })
  }
  if (cap !== null && reserve >= cap) {
    return NextResponse.json({ error: 'The reserve must be smaller than the daily limit.' }, { status: 400 })
  }

  const { error } = await ctx.supabase
    .from('whatsapp_config')
    .update({ daily_send_cap: cap, daily_reserve: reserve, auto_resume: !!body.auto_resume })
    .eq('account_id', ctx.accountId)
    .eq('status', 'connected')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(await status(ctx.supabase, ctx.accountId))
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!ctx.isAdmin) return NextResponse.json({ error: "This action requires the 'admin' role or higher" }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  if (body.action !== 'check_meta') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { data: config } = await ctx.supabase
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('account_id', ctx.accountId)
    .eq('status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!config) return NextResponse.json({ error: 'WhatsApp is not connected yet.' }, { status: 404 })

  // Meta only exposes the tier label (TIER_250 / TIER_2K / …), not usage.
  const res = await fetch(
    `${META_API_BASE}/${config.phone_number_id}?fields=whatsapp_business_manager_messaging_limit`,
    { headers: { Authorization: `Bearer ${decrypt(config.access_token)}` }, cache: 'no-store' }
  )
  const json = await res.json().catch(() => ({}))
  const tier = json?.whatsapp_business_manager_messaging_limit as string | undefined
  if (!res.ok || !tier) {
    return NextResponse.json(
      { error: json?.error?.message || 'Meta did not return a messaging limit for this number.' },
      { status: 502 }
    )
  }

  await ctx.supabase
    .from('whatsapp_config')
    .update({ meta_limit_tier: tier, meta_limit_checked_at: new Date().toISOString() })
    .eq('account_id', ctx.accountId)
    .eq('status', 'connected')
  return NextResponse.json(await status(ctx.supabase, ctx.accountId))
}
