import { NextResponse, type NextRequest } from 'next/server';
import { sendKiranamReminders } from '@/lib/kiranam-notify/reminders';

// Daily monthly-Kiranam reminders, triggered by Vercel Cron (vercel.json),
// which sends `Authorization: Bearer $CRON_SECRET`. For a manual test run,
// call it with the same header and an optional ?date=YYYY-MM-DD to act as
// if it were that day (IST).
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  try {
    const results = await sendKiranamReminders(date ?? undefined);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[cron/kiranam-reminders]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
