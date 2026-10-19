import { NextResponse, type NextRequest } from 'next/server';
import { resumeQueuedBroadcasts } from '@/lib/whatsapp/broadcast-resume';

// Continues WhatsApp broadcasts that stopped at the daily sending limit, for
// accounts with "Continue automatically" switched on (on the Sending limits
// page). Triggered by Vercel Cron (vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const results = await resumeQueuedBroadcasts();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[cron/whatsapp-broadcast-resume]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
