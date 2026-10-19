'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { Label } from '@/components/whatsapp/ui/label';
import { Switch } from '@/components/whatsapp/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/whatsapp/ui/card';

interface LimitsStatus {
  cap: number | null;
  reserve: number;
  autoResume: boolean;
  metaTier: string | null;
  metaCheckedAt: string | null;
  metaLimit: number | null;
  messagedLast24h: number;
  remaining: number | null;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

function tierLabel(tier: string | null, limit: number | null) {
  if (!tier) return null;
  if (/UNLIMITED/i.test(tier)) return 'Unlimited';
  return limit !== null ? `${fmt(limit)} people / 24 h (${tier})` : tier;
}

/**
 * Settings → WhatsApp → "Sending limits". The daily cap, the reserve kept
 * free for login codes and reminders, and whether a broadcast that hits the
 * cap carries on by itself the next day. Meta's own tier can be read with one
 * click, but Meta only reports the tier — not how much is left — so the "sent
 * in the last 24 hours" figure comes from our own broadcast records.
 */
export function SendLimitsCard() {
  const [status, setStatus] = useState<LimitsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cap, setCap] = useState('');
  const [reserve, setReserve] = useState('');
  const [autoResume, setAutoResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const apply = useCallback((s: LimitsStatus) => {
    setStatus(s);
    setCap(s.cap === null ? '' : String(s.cap));
    setReserve(String(s.reserve));
    setAutoResume(s.autoResume);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/whatsapp/whatsapp/limits', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok) apply(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/whatsapp/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_send_cap: cap.trim() === '' ? null : Number(cap), daily_reserve: Number(reserve || 0), auto_resume: autoResume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      apply(json);
      toast.success('Sending limits saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function checkMeta() {
    setChecking(true);
    try {
      const res = await fetch('/api/whatsapp/whatsapp/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_meta' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not reach Meta.');
      setStatus(json);
      toast.success(`Meta reports ${tierLabel(json.metaTier, json.metaLimit) ?? 'a limit'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach Meta.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) return null;
  if (!status) return null; // not connected yet

  const metaText = tierLabel(status.metaTier, status.metaLimit);
  const capNumber = cap.trim() === '' ? null : Number(cap);
  const overMeta = status.metaLimit !== null && capNumber !== null && capNumber > status.metaLimit;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Sending limits</CardTitle>
        <CardDescription className="text-muted-foreground">
          WhatsApp lets you message a limited number of different people in any 24 hours. Broadcasts stop at the daily limit
          below, so the rest of the allowance stays free for login codes and reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="daily-cap">Daily limit (people per 24 h)</Label>
            <Input id="daily-cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} placeholder="No limit" />
            <p className="text-xs text-muted-foreground">Leave empty for no limit. Keep it at or below what Meta allows.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-reserve">Reserved for login codes &amp; reminders</Label>
            <Input id="daily-reserve" inputMode="numeric" value={reserve} onChange={(e) => setReserve(e.target.value.replace(/\D/g, ''))} />
            <p className="text-xs text-muted-foreground">
              Broadcasts can use the daily limit minus this reserve. Login codes and automatic reminders aren’t counted here, so
              the reserve covers them.
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Continue automatically the next day</p>
            <p className="text-xs text-muted-foreground">
              When a broadcast reaches the limit, send the rest on its own (checked once a day) as allowance frees up. When off,
              open the broadcast and press “Send remaining”.
            </p>
          </div>
          <Switch checked={autoResume} onCheckedChange={setAutoResume} aria-label="Continue automatically the next day" />
        </div>

        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-foreground">
              <span className="font-medium">Meta’s limit: </span>
              {metaText ?? 'not checked yet'}
              {status.metaCheckedAt && (
                <span className="text-muted-foreground"> · checked {new Date(status.metaCheckedAt).toLocaleString('en-IN')}</span>
              )}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={checkMeta} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Check with Meta
            </Button>
          </div>
          {status.metaLimit !== null && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCap(String(status.metaLimit))}>
                Use Meta’s limit ({fmt(status.metaLimit)})
              </Button>
            </div>
          )}
          {overMeta && (
            <p className="mt-2 text-xs text-warning">
              Your daily limit is higher than Meta’s current limit — messages above Meta’s limit will fail.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            In the last 24 hours, broadcasts reached {fmt(status.messagedLast24h)} {status.messagedLast24h === 1 ? 'person' : 'people'}
            {status.remaining !== null && <> — {fmt(status.remaining)} more can go out now.</>}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save limits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
