'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { Label } from '@/components/whatsapp/ui/label';
import { Switch } from '@/components/whatsapp/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/whatsapp/ui/card';
import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton';

interface LimitsStatus {
  cap: number | null;
  reserve: number;
  autoResume: boolean;
  metaTier: string | null;
  metaCheckedAt: string | null;
  metaLimit: number | null;
  messagedLast24h: number;
  otpsLast24h: number;
  effectiveReserve: number;
  remaining: number | null;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

function tierLabel(tier: string | null, limit: number | null) {
  if (!tier) return null;
  if (/UNLIMITED/i.test(tier)) return 'Unlimited';
  return limit !== null ? `${fmt(limit)} people / 24 h (${tier})` : tier;
}

/** One read-only row: label on the left, value on the right. */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{children}</div>
    </div>
  );
}

/**
 * The Sending limits page. Shows the daily cap, the reserve kept free for
 * login codes and reminders, and whether a broadcast that hits the cap carries
 * on by itself the next day. Read-only until "Edit" is pressed. Meta's own tier
 * can be read with one click, but Meta only reports the tier — not how much is
 * left — so the "last 24 hours" figures come from our own records.
 */
export function SendLimitsCard() {
  const [status, setStatus] = useState<LimitsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cap, setCap] = useState('');
  const [reserve, setReserve] = useState('');
  const [autoResume, setAutoResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const fillForm = useCallback((s: LimitsStatus) => {
    setCap(s.cap === null ? '' : String(s.cap));
    setReserve(String(s.reserve));
    setAutoResume(s.autoResume);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/whatsapp/whatsapp/limits', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setStatus(json);
        fillForm(json);
      } else setLoadError(json.error || 'Could not load sending limits.');
    } catch {
      setLoadError('Could not load sending limits.');
    } finally {
      setLoading(false);
    }
  }, [fillForm]);

  useEffect(() => {
    void load();
  }, [load]);

  function cancelEdit() {
    if (status) fillForm(status);
    setEditing(false);
  }

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
      setStatus(json);
      fillForm(json);
      setEditing(false);
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

  if (loading) {
    // Same shape as the loaded page: the allowance card, then the usage card.
    return (
      <SkeletonRegion label="Loading sending limits" className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-elevation-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-36 max-w-full" />
              <Skeleton className="h-3 w-96 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
          </div>
          <div className="mt-4 divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-6 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-elevation-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
            <Skeleton className="h-8 w-36 shrink-0 rounded-lg" />
          </div>
          <div className="mt-4 divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-6 py-3">
                <Skeleton className="h-4 w-44 min-w-0 max-w-[60%]" />
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </SkeletonRegion>
    );
  }
  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Daily allowance</CardTitle>
          <CardDescription className="text-muted-foreground">
            {loadError ?? 'Connect a WhatsApp number first — limits apply to the connected number.'}
          </CardDescription>
          {loadError && (
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setLoading(true); void load(); }}>
                Try again
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>
    );
  }

  const metaText = tierLabel(status.metaTier, status.metaLimit);
  const capNumber = cap.trim() === '' ? null : Number(cap);
  const overMeta = status.metaLimit !== null && capNumber !== null && capNumber > status.metaLimit;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-foreground">Daily allowance</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                WhatsApp lets you message a limited number of different people in any 24 hours. Broadcasts stop at the daily
                limit, so the rest of the allowance stays free for login codes and reminders.
              </CardDescription>
            </div>
            {!editing && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {editing ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="daily-cap">Daily limit (people per 24 h)</Label>
                  <Input id="daily-cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} placeholder="No limit" />
                  <p className="text-xs text-muted-foreground">Leave empty for no limit. Keep it at or below what Meta allows.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="daily-reserve">Reserved for login codes &amp; reminders</Label>
                  <Input id="daily-reserve" inputMode="numeric" value={reserve} onChange={(e) => setReserve(e.target.value.replace(/\D/g, ''))} />
                  <p className="text-xs text-muted-foreground">Kept free for login codes and automatic reminders, which aren’t counted as broadcasts.</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Continue automatically the next day</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    When a broadcast reaches the limit, send the rest on its own (checked once a day). When off, open the
                    broadcast and press “Send remaining”.
                  </p>
                </div>
                <Switch checked={autoResume} onCheckedChange={setAutoResume} aria-label="Continue automatically the next day" />
              </div>

              {status.metaLimit !== null && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCap(String(status.metaLimit))}>
                  Use Meta’s limit ({fmt(status.metaLimit)})
                </Button>
              )}
              {overMeta && (
                <p className="text-xs text-warning">
                  This is higher than Meta’s current limit — messages above Meta’s limit will fail.
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Save limits
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <Row label="Daily limit" hint="Different people broadcasts may message per 24 hours">
                {status.cap === null ? 'No limit' : `${fmt(status.cap)} people`}
              </Row>
              <Row label="Reserved for login codes & reminders" hint="Kept free so logins keep working during a broadcast">
                {fmt(status.reserve)}
              </Row>
              <Row label="Continue automatically the next day" hint="Send the rest of a capped broadcast on its own">
                {status.autoResume ? 'On' : 'Off'}
              </Row>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">Usage</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">Based on the last 24 hours.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={checkMeta} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Check with Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            <Row
              label="Meta’s limit"
              hint={status.metaCheckedAt ? `Checked ${new Date(status.metaCheckedAt).toLocaleString('en-IN')}` : 'Press “Check with Meta” to read it'}
            >
              {metaText ?? 'Not checked'}
            </Row>
            <Row label="Reached by broadcasts">{fmt(status.messagedLast24h)}</Row>
            <Row
              label="Login codes sent"
              hint={
                status.otpsLast24h > status.reserve
                  ? `More than the reserve — broadcasts are holding back ${fmt(status.effectiveReserve)} for now. Consider raising the reserve.`
                  : undefined
              }
            >
              {fmt(status.otpsLast24h)}
            </Row>
            <Row label="Can still be messaged now">{status.remaining === null ? 'No limit' : fmt(status.remaining)}</Row>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
