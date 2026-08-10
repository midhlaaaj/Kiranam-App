# Login revamp + email system — plan

> **STATUS: implemented in code as of 2026-08-10**, against the new (post-migration) Supabase project. What's left is a handful of manual steps only doable from the Supabase/Resend dashboards (listed at the bottom) — no tool available here can do those. Read "What's left — manual steps" before considering this done.

Read this whole file before starting. The "Open questions" section near the bottom has a few things that still need a decision — don't guess past those, ask.

---

## 1. What's changing, in plain terms

Today, `kiranam-app` login is: enter phone number → get a 6-digit code via WhatsApp → type the code in. The WhatsApp delivery isn't live yet (Meta template approval pending), so login is currently broken.

New flow: **email + password**, no OTP, no WhatsApp dependency. Google/Apple sign-in was considered but is explicitly **out of scope for this pass** — plain email/password only, for now.

Decisions already made (confirmed in conversation, don't re-litigate these):
- **Auth method:** email + password only. No Google/Apple sign-in this round.
- **Existing users:** hard cutover is fine. No migration path needed for anyone currently registered via phone-OTP — not a real concern right now.
- **Registration page:** keep both existing checkboxes (Terms & Privacy, WhatsApp-reminders consent) exactly as they are today, and add a mobile number field alongside name and promo code.
- **Monthly-amount picker:** no change at all. Leave the existing full-screen "choose monthly contribution" page exactly as is — not part of this plan.

---

## 2. New login flow (kiranam-app)

**Screen 1 — Email**
- Single field: email address.
- "Continue" button.

**Screen 2 — Password**
- Branches depending on whether that email already has an account:
  - **New email (no account yet):** show *Password* + *Confirm Password* fields, both with an eye icon to toggle visibility. On submit → Supabase `signUp({ email, password })` → go to Screen 3 (registration details).
  - **Existing email:** show a single *Password* field (with eye icon) + a "Forgot password?" link. On submit → Supabase `signInWithPassword({ email, password })` → go straight into the app (skip Screen 3).
- **Needs a decision** on *how* we know which case we're in before rendering this screen — see Open Questions §1.

**Screen 3 — Registration details** *(new signups only)*
- Fields: **Full Name** (required, unchanged), **Mobile Number** (new — **compulsory**, country-code aware, no OTP/no verification step), **Promo/Referral Code** (optional, contributors only, unchanged from today, shown de-emphasized — see §10).
- Keep both existing checkboxes unchanged: "I'd like to receive contribution reminders over WhatsApp" and "I agree to the Terms & Conditions and Privacy Policy."
- Email field is **removed** from this screen — it's already captured on Screen 1, don't ask twice.
- "Create Account" button → same downstream routing as today (contributor → choose-amount; volunteer → volunteer-application).

**Mobile number field — validation (nothing new to build here)**
- Reuse the existing `CountryCodePicker` component and `validatePhoneNumber()` (`kiranam-app/src/utils/validators.ts:20`) exactly as `login.tsx` used them today — they already enforce the correct digit count per country via `libphonenumber-js` (e.g. 10 digits for India's `+91`, and correct rules for every other supported country too). This is a straight reuse, not new validation logic.
- Compulsory: block "Create Account" until it passes, same pattern as the existing Full Name check.
- **Important wiring detail:** today `profiles.phone` gets filled in automatically by a trigger when someone logs in via phone-OTP (Supabase copies `auth.users.phone` → `profiles.phone` on signup). Under email+password auth, `auth.users.phone` is always empty, so **the mobile number typed here must be explicitly written to `profiles.phone`** as part of the account-creation write (extend `saveProfile()`'s upsert to accept `phone`, rather than a separate follow-up call) — otherwise the WhatsApp comm-center sync trigger (`sync_profile_to_wacrm_contact`, fires on `profiles.phone` changing) never fires and new contributors/volunteers silently never show up in wacrm.
- No change needed to `sync_profile_to_wacrm_contact` itself — it already fires on any write to `profiles.phone` regardless of whether the number was OTP-verified, so once the write above happens, the auto-sync "just works" the same as it does today.

**Forgot password** *(new screen)*
- Single email field → Supabase `resetPasswordForEmail()` → same "if that email has an account, a reset link is on its way" non-revealing message pattern already used in `kiranam-admin/src/app/forgot-password/actions.ts`.
- The reset link needs to land back in the app — see Open Questions §2 for the deep-link wrinkle.

**No change:** the "choose monthly contribution" screen after registration stays exactly as it is today.

---

## 3. What gets removed / retired

- `kiranam-app/src/app/login.tsx` — phone number entry UI, replaced by the email screen above.
- `kiranam-app/src/app/otp.tsx` — 6-digit code entry UI. **Don't delete outright** — keep the file around or archive it; it's legitimate future work once WhatsApp OTP delivery is actually live, as an *optional* "verify your number" step layered on top of the new email/password login (not as the login gate). No urgency to rebuild that now.
- `AppContext.tsx`'s `signInWithPhone` / `verifyOtpCode` — replaced by `signUpWithEmail`, `signInWithEmail`, `requestPasswordReset`.

## 4. What's added

- `AppContext.tsx`: `signUpWithEmail(email, password)`, `signInWithEmail(email, password)`, `requestPasswordReset(email)`. `saveProfile()`'s signature grows a required `phone` field (see §2's "Important wiring detail" above) instead of adding a separate `updatePhone` call — keeps account creation to one write and one trigger firing.
- `register.tsx`: mobile number field (with `CountryCodePicker`) added, wired to the same validation already used in the old `login.tsx`; email field removed (already captured earlier in the flow); referral code moved behind a collapsed "Have a referral code?" toggle (see §10).
- No `profiles` schema change needed — `phone` is already nullable and already not tied to Supabase's own `auth.users.phone` column; it just stops being treated as an authenticated identity and becomes a plain contact field, same as it already effectively is for wacrm's WhatsApp broadcast sync (that trigger doesn't care whether the number was OTP-verified — see `WHATSAPP.md`).

## 5. Fallout: admin's "manually register a contributor" flow

`kiranam-admin`'s existing "Register contributor" panel (`WHATSAPP.md` §"New kiranam-admin features") creates an account via `auth.admin.createUser({ phone, phone_confirm: true })` with no password, and the person "claims" it later by logging in with phone-OTP. **That claim mechanism breaks under a hard cutover to email+password** — there's no more phone-OTP login to claim it with.

This needs a replacement as part of this same effort: most likely, the admin panel should create the account with an **email** instead (or additionally) and either send a password-setup invite link, or the admin sets a temporary password directly. Flag this to whoever picks up the implementation — it's real scope, not optional cleanup.

---

## 6. Admin invite emails — currently not sending

Per your note: **no invitation email currently goes out to admins.** `kiranam-admin` already has the mechanics in place —`admin_invites` table, `promote_if_invited()` trigger logic (`kiranam-admin/supabase/migrations/015_fix_admin_promotion_on_confirm.sql`) that auto-promotes a user to `role = 'admin'` the moment their email is confirmed and matches a pending invite — but the actual **email delivery** isn't wired up. This is the same "real email service" gap flagged in `kiranam-admin/LAUNCH_CHECKLIST.md` §3.

Needs:
- Pick and configure the SMTP/transactional provider (per earlier conversation: Google Workspace, sending as `no-reply@kiranam.org` with `reply-to: support@kiranam.org`, or a dedicated transactional provider if volume grows).
- Wire Supabase Auth's SMTP settings (or a custom send step) to actually fire the invite email when an `admin_invites` row is created.
- **Don't confuse this with wacrm's separate "invite member" dialog** (`kiranam-admin/src/components/whatsapp/settings/invite-member-dialog.tsx`) — that's a different invite system, for wacrm/comm-center team access, not `kiranam-admin`'s own admin role. Confirm which one (or both) needs fixing — see Open Questions §3.

---

## 7. Email templates needed

All four templates should share the same visual language as the app: brand red `#EC2028`, Inter font, "Kiranam" wordmark. Sender identity per earlier decision: `no-reply@kiranam.org`, reply-to `support@kiranam.org`.

1. **Admin invite** — "You've been invited to manage Kiranam" — link to set a password and log into `kiranam-admin`.
2. **Forgot password** — used by both `kiranam-admin` (already exists, may just need re-branding) and the new `kiranam-app` flow (new) — reset link, expiry notice.
3. **Payment confirmation / receipt** — sent after every successful Razorpay payment (`makeRazorpayPayment` in `AppContext.tsx` already calls a `send-receipt-email` Supabase Edge Function via `emailReceipt()` — **note: that function's source isn't present anywhere in this repo**, so confirm whether it already exists server-side/deployed, or still needs to be written — see Open Questions §4). Content: amount, date, campaign/label, transaction ref, and the **PDF receipt attached** (should match the in-app receipt design already generated via `expo-print`, referenced from `receipt.tsx`).
4. *(Implied by "forgot password for app too")* — email-confirmation template for new `kiranam-app` signups, if email verification ends up required (see Open Questions §7).

---

## 8. Open questions — confirm before implementation starts

1. **Existing-vs-new email detection for Screen 2.** Supabase doesn't expose a plain "does this email exist" client API (avoids account enumeration). Recommended approach: a small server-side check (edge function or RPC) that returns only new-vs-existing (not any other account detail), mirroring the non-revealing pattern already used in `forgot-password/actions.ts`. Confirm this approach, or suggest another.
2. **Password-reset deep-linking.** Clicking a reset link in an email needs to land back inside the mobile app. Custom URL schemes (`kiranamapp://...`) from email clients are unreliable (Gmail's in-app browser sometimes blocks them). Likely need a small web landing page (e.g. on the `kiranam.org` domain) that the email link points to, which then hands off into the app. Confirm whether that landing page already exists somewhere or needs building.
3. **Which invite system is "not sending" today** — `kiranam-admin`'s own `admin_invites` (admin role), wacrm's team invite, or both? Confirm scope.
4. **`send-receipt-email` Edge Function** — not found anywhere in this repo. Confirm: does it already exist and work in the deployed Supabase project (just needs verifying post-migration), or does it need to be written from scratch as part of this effort?
5. **Final SMTP/transactional provider decision** — Google Workspace SMTP relay vs. a dedicated provider (Resend/Postmark/SES) — pick one before templates get wired up.
6. **Password rules** — minimum length / complexity requirement for the password field. Not yet specified.
7. **Email verification on signup** — should a new `kiranam-app` account require clicking a confirmation link before it's usable (like the admin flow already does), or is immediate access after signup acceptable? Given the "hard cutover, don't worry about it" tone elsewhere, immediate access seems likely preferred, but worth confirming since it affects whether template #4 above is needed at all.

---

## 9. Suggested execution order (once unblocked)

1. Confirm Supabase migration to the new account is fully done and both `kiranam-app` and `kiranam-admin` are pointed at it.
2. Resolve Open Questions §1–7 above.
3. Build the email/password screens + `AppContext` changes in `kiranam-app`.
4. Rework the admin's "manually register a contributor" flow (§5) — don't ship the new login without this, or admin-registered contributors have no way to claim their account.
5. Wire the SMTP provider and get the admin-invite email actually sending (§6).
6. Write and wire the four email templates (§7), with the receipt email last since it depends on confirming whether `send-receipt-email` already exists.
7. End-to-end test: signup, login, forgot-password (including the deep-link hop), admin invite, and one real payment → receipt email with PDF attached.

---

## 11. What's left — manual steps (nothing here is code)

Confirmed via investigation while implementing (not guesses):

- `send-receipt-email` already existed and works, deployed on the new project — uses **Resend**, sender read from `RECEIPT_FROM_EMAIL` env var. Standardized everything else on Resend too (`kiranam-admin/src/lib/email/resend.ts`, using `RESEND_API_KEY` + `EMAIL_FROM`).
- The admin-invite gap was exactly as described: `createInvite()` never sent anything. Now it does, via Resend, right after the `admin_invites` row is created (`kiranam-admin/src/app/(admin)/settings/actions.ts`).
- The password-reset deep-link problem is solved by extending `kiranam-admin/src/app/auth/confirm/route.ts` (already existed, shared across all three apps) to detect a `kiranamapp://` `next` and forward the resulting session's access/refresh tokens as query params instead of a bare redirect — since the token itself is single-use. `kiranam-app`'s new `reset-password.tsx` consumes those.
- The admin's "manually register a contributor" flow now collects an email, creates the account with a throwaway random password, and emails a "set your password" link using the same `/auth/confirm` mechanism (`kiranam-admin/src/app/(admin)/contributors/actions.ts`).
- `otp.tsx` was moved to `kiranam-app/_archived/otp.tsx.bak` (out of the routed `app/` directory, so it doesn't break the build) rather than deleted, per the original plan.

**Still needs a human, in a dashboard, before this works end-to-end:**

1. **Resend account + domain.** Set `RESEND_API_KEY` and `RECEIPT_FROM_EMAIL` (Supabase Edge Function secrets, already expected by `send-receipt-email`) and `RESEND_API_KEY` + `EMAIL_FROM` (kiranam-admin's own env vars) — same Resend account/domain for both, sending as `no-reply@kiranam.org` per earlier decision.
2. **Supabase Dashboard → Auth → Email Templates → "Reset Password"** must link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}` (kiranam-admin's own domain as `SiteURL`). If this was already customized for kiranam-admin's existing forgot-password feature, no change needed — just confirm it's still correct on the new project post-migration. If it's still Supabase's default template, this is a hard blocker for both apps' password reset.
3. **Supabase Dashboard → Auth → SMTP settings** — needs a real provider configured (Supabase's default sender is heavily rate-limited, fine for testing, not for production). Same Resend account works here too.
4. **`kiranam-admin`'s `NEXT_PUBLIC_SITE_URL`** env var must point at its real deployed domain — used to build both the admin-invite signup link and the contributor claim link.
5. **End-to-end test**, once 1–4 are done: new signup (email → password/confirm → name/mobile/promo) on a real device build, existing-email login branch, forgot-password round trip (app → email → deep link → new password), admin invite (create invite → email arrives → recipient signs up), and manually registering a contributor (email arrives → claim link → set password → log in on mobile). None of this was testable from here — no deployed app/dashboard access.

---

## 10. Onboarding UX — keeping Screen 3 from feeling cluttered

Adding a compulsory mobile number to Screen 3 makes it: Name + Mobile Number + Referral Code + 2 checkboxes + button — that's a lot on one screen if presented flat. Ways to keep it feeling light without dropping anything you've asked for:

- **De-emphasize the referral code.** It's optional and most people won't have one. Show it collapsed behind a small "Have a referral code?" text link that expands into the field on tap, instead of an always-visible third input box. Cuts the *visible* field count from 3 to 2 for most people, with zero loss of functionality for those who do have a code.
- **Default the country code to the device's region**, not a hardcoded `IN`. `expo-localization` is already a dependency (used elsewhere for `getDeviceLocale()`), so this is a small addition, not new infrastructure — most users then never have to touch the country picker at all, one less decision to make.
- **Validate inline as they type/on-blur, not only on submit.** The phone validator (`libphonenumber-js`) is fast enough to run live, so someone sees "looks good" or a specific error immediately instead of hitting "Create Account" and getting bounced back with multiple errors at once, which is what tends to make a form feel like a wall of clutter.
- **One line of "why we're asking" under the mobile field** — something like "We'll use this to send you updates over WhatsApp." A bare mandatory phone field with no explanation reads as pure data collection and increases hesitation/drop-off; a one-line reason (which is also just true here, given the wacrm sync) tends to reduce it.
- **Visually group the two checkboxes tightly** (single card/block with consistent small spacing) rather than as two separate loose rows — same two checkboxes, same two values saved, just reads as one "consent" unit instead of two more form rows stacked with the inputs above.
- **Optional, bigger idea worth a second look:** you specifically asked for two separate screens (email, then password) — that's what's planned above. An alternative that reduces total screen transitions for *returning* users: show the password field directly under the email field on one screen (no forced "Continue" tap in between) for login, and only branch into a second screen when it's a brand-new signup that needs the confirm-password field. Flagging this as an option, not changing the plan unless you want to revisit it — the two-screen version you described works fine either way.
