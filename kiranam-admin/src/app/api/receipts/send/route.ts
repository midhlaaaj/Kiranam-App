import { after, NextResponse, type NextRequest } from 'next/server';
import { sendPaymentReceipt } from '@/lib/receipts/send';

// Called by the contributions_request_receipt database trigger (via pg_net)
// whenever a contribution becomes successful — app payments, autopay
// charges and admin-entered offline payments alike. pg_net only waits a
// few seconds, so acknowledge straight away and do the work in after().
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const secret = process.env.RECEIPT_WEBHOOK_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let contributionId: unknown;
  try {
    ({ contribution_id: contributionId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (typeof contributionId !== 'string' || !contributionId) {
    return NextResponse.json({ error: 'contribution_id required' }, { status: 400 });
  }

  after(async () => {
    try {
      const result = await sendPaymentReceipt(contributionId);
      console.log('[receipts/send]', contributionId, result);
    } catch (err) {
      console.error('[receipts/send] failed', contributionId, err);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
