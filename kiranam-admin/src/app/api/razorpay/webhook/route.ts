import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay/webhook-signature';
import { formatMoney } from '@/lib/ui';

// Configure in the Razorpay Dashboard → Settings → Webhooks:
//   URL: https://<this-deployment>/api/razorpay/webhook
//   Secret: paste into this app's RAZORPAY_WEBHOOK_SECRET env var.
//   Active events: subscription.charged, subscription.pending,
//     subscription.halted, subscription.cancelled.
//
// Recurring charges themselves happen entirely on Razorpay's schedule —
// this route only records what already happened and keeps our own
// `commitments`/`contributions` state truthful to it. Idempotent by
// construction: contributions.razorpay_payment_id has a unique index
// (see migration 020), so a Razorpay webhook retry (they retry on any
// non-2xx response) can't double-insert a charge.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: {
      subscription?: { entity?: { id: string; charge_at?: number } };
      payment?: { entity?: { id: string; amount: number } };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const event = payload.event;
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!event || !subscriptionId) {
    return NextResponse.json({ error: 'missing event or subscription id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: commitment } = await supabase
    .from('commitments')
    .select('contributor_id, monthly_amount')
    .eq('razorpay_subscription_id', subscriptionId)
    .maybeSingle();

  if (!commitment) {
    // A subscription we have no record of (e.g. cancelled+re-created
    // elsewhere, or a stale test event) — nothing to reconcile, but a
    // real error would just have Razorpay retry forever, so 200 it.
    console.warn('[razorpay-webhook] no commitment found for subscription', subscriptionId);
    return NextResponse.json({ ok: true });
  }

  const { contributor_id: contributorId } = commitment;

  if (event === 'subscription.charged') {
    const payment = payload.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: 'missing payment entity' }, { status: 400 });
    }
    const amount = payment.amount / 100;
    const chargeAt = payload.payload?.subscription?.entity?.charge_at;
    const nextDueIso = chargeAt ? new Date(chargeAt * 1000).toISOString().slice(0, 10) : null;

    const { error: insertError } = await supabase.from('contributions').insert({
      contributor_id: contributorId,
      amount,
      label: 'Monthly Contribution',
      status: 'success',
      razorpay_payment_id: payment.id,
    });
    // Postgres unique_violation — this event was already processed by an
    // earlier delivery attempt. Treat as success, not an error.
    if (insertError && insertError.code !== '23505') {
      console.error('[razorpay-webhook] failed to record charge:', insertError.message);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    if (insertError?.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await supabase
      .from('commitments')
      .update({ mandate_status: 'active', ...(nextDueIso ? { next_due_date: nextDueIso } : {}) })
      .eq('contributor_id', contributorId);

    const dateStr = new Date().toLocaleDateString('en-IN');
    const receiptLink = `/receipt?id=${encodeURIComponent(payment.id)}&amount=${amount}&date=${encodeURIComponent(dateStr)}&label=${encodeURIComponent('Monthly Contribution')}`;
    await supabase.rpc('notify', {
      p_profile_id: contributorId,
      p_title: 'Payment Successful',
      p_body: `Your ${formatMoney(amount)} autopay payment for "Monthly Contribution" was successful.`,
      p_category: 'contribution',
      p_deep_link: receiptLink,
    });
  } else if (event === 'subscription.pending') {
    await supabase.rpc('notify', {
      p_profile_id: contributorId,
      p_title: 'Autopay payment issue',
      p_body: `Your ${formatMoney(Number(commitment.monthly_amount))} autopay charge didn't go through. We'll retry automatically — update your payment method if this continues.`,
      p_category: 'system',
      p_deep_link: '/(tabs)/profile',
    });
  } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
    await supabase
      .from('commitments')
      .update({ autopay_enabled: false, mandate_status: event === 'subscription.halted' ? 'halted' : 'cancelled' })
      .eq('contributor_id', contributorId);

    await supabase.rpc('notify', {
      p_profile_id: contributorId,
      p_title: 'Autopay stopped',
      p_body: 'Your monthly autopay has stopped working. Re-enable it from your profile to keep contributing automatically.',
      p_category: 'system',
      p_deep_link: '/(tabs)/profile',
    });
  }

  return NextResponse.json({ ok: true });
}
