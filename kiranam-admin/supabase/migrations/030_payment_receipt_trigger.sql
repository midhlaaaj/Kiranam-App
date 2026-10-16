-- Automatic payment receipts (PDF over WhatsApp + email) for every
-- successful contribution — app payments, autopay charges and
-- admin-entered offline payments alike. The database is the one place all
-- three paths meet (one of them, verify-razorpay-payment, is an Edge
-- Function outside this repo), so the trigger lives here and hands off to
-- kiranam-admin's POST /api/receipts/send, which builds and sends the PDF.
--
-- The shared secret lives in Vault, like notify()'s push_trigger_secret:
--   select vault.create_secret('<RECEIPT_WEBHOOK_SECRET from Vercel>', 'receipt_webhook_secret');
-- Until it's set the trigger does nothing.

-- Set once the receipt has gone out; existing rows stay null but are never
-- re-sent, because the trigger only fires on new successes.
alter table public.contributions
  add column if not exists receipt_sent_at timestamptz;

create or replace function public.request_payment_receipt()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  if new.status <> 'success' or new.receipt_sent_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'success' then
    return new;
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'receipt_webhook_secret';
  if v_secret is null then
    return new;
  end if;

  -- pg_net queues the request and sends it after this transaction commits,
  -- so a payment insert never waits on (or fails because of) the receipt.
  perform net.http_post(
    url := 'https://kiranam.online/api/receipts/send',
    body := jsonb_build_object('contribution_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  -- A receipt problem must never roll back a recorded payment.
  raise warning 'request_payment_receipt(%): %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists contributions_request_receipt on public.contributions;
create trigger contributions_request_receipt
  after insert or update of status on public.contributions
  for each row execute function public.request_payment_receipt();
