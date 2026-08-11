# WhatsApp Communication Center

Kiranam's WhatsApp inbox, broadcasts, templates, and automations were originally built as **wacrm** (forked from [ArnasDon/wacrm](https://github.com/ArnasDon/wacrm)), a separate Next.js app sharing this app's Supabase project. That standalone app has since been **merged directly into kiranam-admin** as normal internal routes (`src/app/whatsapp/**`, `src/lib/whatsapp/**`) — it now shares this app's session natively instead of running as its own deployment. The standalone `wacrm/` folder has been removed; the rest of this doc (migrations, auto-provisioning, contact sync) still describes real, current behavior — only the "separate deployment + bridge" parts below are historical.

wacrm was chosen over building a native module because it already solved shared inbox, broadcast delivery tracking, template creation + Meta approval, and team access control. The work on this side was wiring Kiranam's contributors/volunteers into it, not building the CRM itself.

## How the merge works

wacrm's own migrations assumed it owned `profiles` outright (a surrogate-UUID identity table keyed by `profiles.user_id`). Kiranam's `profiles.id` **is** `auth.users.id` directly, with dozens of existing foreign keys depending on that. Rather than rewrite either side:

- `profiles.user_id` was added as a column that always mirrors `id` — every wacrm RLS policy/RPC that reads `profiles.user_id` keeps working unmodified, because that value now always equals the real auth id.
- `profiles.account_id` / `profiles.account_role` (wacrm's multi-tenant fields) are **nullable** and only populated for admins — contributors/volunteers never get comm-center login access, only a synced contact record (see below).
- wacrm's own `notifications` table (CRM-internal "you were assigned a conversation" alerts) was renamed to `wacrm_notifications` at creation time — Kiranam already has an unrelated `notifications` table (donor-facing announcements) and the two would otherwise collide under the same name.
- All ~30 other wacrm tables (`contacts`, `conversations`, `messages`, `tags`, `broadcasts`, `message_templates`, `flows`, `automations`, `ai_configs`, etc.) were created as-is — brand new tables, no collision.

The merge migrations live in `kiranam-admin/supabase/migrations/001` through `005` and were applied directly against the shared project.

## Auto-provisioning: admins get comm-center access automatically

A trigger on `profiles` (`provision_wacrm_access_for_admin`, in migration `002`) fires whenever a profile's `role` becomes (or already is) `'admin'`: it creates — or finds — a single shared wacrm `accounts` row named "Kiranam", and sets that profile's `account_id`/`account_role = 'admin'`. Every Kiranam admin lands in the *same* comm-center workspace, sharing one inbox/templates/broadcasts, rather than getting an isolated personal account each.

**No bridge needed anymore.** Historically kiranam-admin and wacrm were separate deployments, so a magic-link SSO bridge (`/api/wacrm-bridge`) carried the session across domains. Now that the comm center is just internal routes under `/whatsapp`, the sidebar link is a normal in-app route and the existing kiranam-admin session applies directly — no second login, no bridge route.

## Contributor/volunteer sync: trigger, not webhook

The originally-planned cross-project webhook (`wacrm-sync`) is gone — now that it's one database, a Postgres trigger does the same job synchronously and can't drift out of sync the way a webhook can (no retries to configure, nothing to backfill via CSV export).

`sync_profile_to_wacrm_contact` (migration `004`) fires `AFTER INSERT OR UPDATE OF full_name, phone, role ON profiles`:

- Skips admins (they get *login* access via the trigger above, not a contact record — they're staff, not people to broadcast WhatsApp messages to).
- For `contributor`/`volunteer` profiles with a phone number, upserts a `contacts` row under the shared "Kiranam" account (linked back via `contacts.kiranam_profile_id`, unique).
- Ensures a `Contributor` or `Volunteer` tag exists on that account and assigns it via `contact_tags` — so a broadcast can target "all contributors" or "all volunteers" immediately using wacrm's existing tag-based audience selector. No new UI was needed for this; it's exactly what wacrm's broadcast composer already supports.

A one-time backfill (also in migration `004`) force-fires the trigger for every contributor/volunteer that existed before the merge.

## Comm-center features already built (verify, don't rebuild)

The merged-in code ships template creation + Meta approval submission (Settings → Templates) and tag/custom-field/CSV-based broadcast audience targeting out of the box. Once contacts are synced and tagged as above, both "create a template and send it for approval" and "create a message group" are already fully working — this was the point of forking a mature CRM instead of building one.

## New kiranam-admin features (Phase 6)

- **Manually register a contributor** (`/contributors`, "Register contributor" panel): for someone who committed offline and hasn't opened the app yet. Creates a real `auth.users` row via the service-role client with **no password** (`auth.admin.createUser({ phone, phone_confirm: true })`) — `handle_new_user` fires as normal, creating the profile; the action then fills in `full_name` (the trigger only sets `id`/`user_id`/`phone`/`email`) and inserts a `commitments` row. The person later "claims" this login just by signing in with the same phone number via OTP — no separate claim flow exists or is needed.
- **Manual/offline payment entry** (contributor detail page): records a `contributions` row with `is_offline = true`, `collected_by` (the admin who logged it), and an optional `note` — for a volunteer-collected cash payment that never touched Razorpay. Shows an "Offline" badge in contribution history, distinct from real payments. The existing `bump_campaign_raised` trigger only reads `amount`/`campaign_id`/`status`, so campaign totals update correctly regardless of how the payment was collected.

## Env vars

| Variable | Notes |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (server-only) | Bypasses RLS. Used by `lib/supabase/admin.ts` for manual contributor registration's `createUser` call and by the comm-center routes. Never expose to the client. |
| `SEND_SMS_HOOK_SECRET` | Verifies the Standard Webhooks signature Supabase signs Send-SMS-Hook requests with. |
| `KIRANAM_WACRM_ACCOUNT_ID` | The shared "Kiranam" comm-center account id (`ae88b2b2-cc40-47f2-b154-6e35f49c56dd`) — used by the send-sms hook and elsewhere to scope queries to the one shared workspace. |

## kiranam-app login OTP delivery: WhatsApp, not SMS

kiranam-app's contributor/volunteer login (`login.tsx` → `otp.tsx`) still uses Supabase Auth's phone-OTP flow (`signInWithOtp({ phone })` / `verifyOtp({ phone, token, type: 'sms' })`) — phone stays the auth identity, and Supabase Auth still generates the code, matches it, and issues the session exactly as it always did. What changed is **delivery**: instead of a paid SMS provider (Twilio, ~$0.10/verification, plus India's DLT template-registration requirement for transactional SMS), the code is sent as a WhatsApp message through Kiranam's own WhatsApp Business number — the same one the comm center uses.

This works via Supabase Auth's **Send SMS Hook**: instead of Supabase calling a built-in provider, it calls an HTTP endpoint we control with the phone number + OTP, and that endpoint decides how to deliver it.

- **Hook endpoint**: `kiranam-admin/src/app/api/whatsapp/auth-hooks/send-sms/route.ts` — verifies the Standard Webhooks signature Supabase signs the request with (`src/lib/whatsapp/supabase-hooks/verify-signature.ts`), looks up the Kiranam account's `whatsapp_config` row, decrypts the access token, and sends the code as a WhatsApp template message via the existing `sendTemplateMessage()` helper (`src/lib/whatsapp/whatsapp/meta-api.ts`).
- **kiranam-app side**: `AppContext.tsx`'s `signInWithPhone` needed no special option — the hook receives every phone-OTP send once configured, regardless of channel.

### Setup required (not code — do these once)

1. **Connect a WhatsApp Business number** in kiranam-admin's own comm-center Settings (`/whatsapp/settings`), for the Kiranam account (this populates `whatsapp_config` — currently empty; the hook route will 500 with `whatsapp_not_connected` until this is done).
2. **Create an AUTHENTICATION-category template directly in Meta WhatsApp Manager.** The comm center's own template-creation UI deliberately rejects this category (`Authentication templates are not yet supported here` — see `api/whatsapp/templates/submit/route.ts`) because Meta enforces a fixed structure (no custom body copy, `{{1}}` for the code, an optional built-in Copy-Code button) that's different enough from Marketing/Utility templates to not be worth building UI for yet. Create it in Meta's own console, wait for approval, optionally pull it into `message_templates` via the "Sync from Meta" action for visibility.
3. **Configure the Send SMS Hook** in Supabase Dashboard → Auth → Hooks: URL = `https://<kiranam-admin-deployment>/api/whatsapp/auth-hooks/send-sms`, then copy the secret Supabase generates into this app's `SEND_SMS_HOOK_SECRET`.
4. **Set the remaining env vars**: `KIRANAM_WACRM_ACCOUNT_ID` (already set — the live "Kiranam" account's id), `OTP_TEMPLATE_NAME` / `OTP_TEMPLATE_LANGUAGE` (from step 2, once approved).

Until all four are done, phone login in kiranam-app will fail at the OTP-send step — Supabase calls the hook, the hook 500s, and `signInWithOtp` surfaces an error to the app.

## What's not wired yet

- `payment_confirmation` / `receipt_delivery` automations inside the comm center aren't connected to Kiranam's actual Razorpay payment flow — a follow-up, not blocking.
- The now-unused standalone wacrm Supabase project (from an earlier two-project design) can be archived once you've confirmed everything above is working against the shared project.
- The WhatsApp OTP setup above (Send SMS Hook, Meta Authentication template, `whatsapp_config` connection) — code is in place, but the manual Meta/Supabase dashboard steps haven't been done yet.
