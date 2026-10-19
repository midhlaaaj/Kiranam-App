import { SendLimitsCard } from '@/components/whatsapp/settings/send-limits-card';

export default function SendingLimitsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sending limits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How many different people your broadcasts may message in 24 hours, and how much is kept free for login codes and
          reminders.
        </p>
      </div>
      <SendLimitsCard />
    </div>
  );
}
