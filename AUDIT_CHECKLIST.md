# Security & store-readiness audit — what's left

Findings from the 2026-09-22 audit of the phone app, the admin website, and the WhatsApp comm center. Items already fixed in this pass are checked off; everything unchecked needs a decision or action from you.

## 1. Before you submit to the App Store / Play Store

- [ ] **Set up a demo phone number for app reviewers.** Login only works by sending a one-time code over WhatsApp — if a reviewer's test number isn't on WhatsApp, or the message doesn't arrive in time, they get stuck at sign-in and the app can be rejected for "not working." Configure a test phone number with a fixed OTP in Supabase Auth, and put those credentials in App Store Connect's review notes and Play Console's app-access instructions.
- [ ] **Fill in the grievance officer's real name** in the privacy policy and terms (currently a `[grievance officer name]` placeholder, in both the in-app screens and the public web pages). Legally required under the IT Act, and reviewers/DPDP complaints will need a real contact.
- [ ] **Decide on 80G/12A tax-deduction wording.** The terms page has a bracketed placeholder noting this should be added if Kiranam holds that registration — confirm status and fill in or remove.
- [ ] **Re-check Apple's privacy-manifest "required reason" API categories** against the final SDK versions in the build (Expo/EAS auto-merges third-party manifests at build time) — the audit didn't find an obvious gap but recommended a fresh check right before archiving the submission build.

## 2. Security fixes already made in this pass

- [x] **Open redirect / session-token leak fixed** — `kiranam-admin/src/app/auth/confirm/route.ts` now only forwards session tokens to an allow-listed host, closing a path where a modified reset-link email could exfiltrate a victim's session.
- [x] **Critical Next.js RCE patched** — bumped Next.js 16.2.10 → 16.3.5 in `kiranam-admin`. `npm audit` is clean, typecheck and build both verified.
- [x] **WhatsApp consent now enforced on broadcasts** — added `contacts.whatsapp_consent`, synced from the app's opt-in checkbox (migration `027`, already applied to the live database). Contributors/volunteers who didn't opt in are now excluded from broadcast sends.
- [x] **Privacy policy & terms corrected** — both now disclose that login OTPs are always delivered over WhatsApp (not covered by the reminder opt-in), matching what the code actually does.
- [x] **Removed the unused `RECORD_AUDIO` Android permission** from `kiranam-app/app.json` — nothing in the app used it, and an unjustified permission is a common Play Store rejection reason.

## 3. Still open — needs a closer look

- [ ] **No rate limiting on the admin password-reset request.** Unlike login, `forgot-password/actions.ts` relies only on Supabase's own default throttling — add an app-level rate limit like the one already used for login.
- [ ] **WhatsApp media uploads accept any file type with no allow-list.** If the storage bucket serves files publicly with their original content-type (not forced to download), someone with agent access could upload an HTML/SVG file and get a same-origin XSS link. Needs a direct check of the storage bucket's `allowed_mime_types` policy, then an allow-list added to `src/lib/whatsapp/storage/upload-media.ts` if missing.
- [ ] **No local guard for WhatsApp's 24-hour messaging window.** Sending a free-form message outside an active conversation window only fails when Meta itself rejects it — fine functionally, but agents get no warning until the send fails. Low priority, quality-of-life only.

## 4. From the team's own existing checklist (`kiranam-admin/LAUNCH_CHECKLIST.md`)

Still relevant, not superseded by this audit:

- [ ] Sign up for Apple Developer and Google Play Console accounts.
- [ ] Set up live website hosting and a clean production database.
- [ ] Build a real (non-test) version of the app and test one real payment end to end.
- [ ] Prepare the app store listing (icon, screenshots, description, support contact, privacy policy link).
- [ ] Write down and enter all 19 secret settings into the hosting service.
- [ ] Confirm the payment database functions are switched on in the **real** database, not just staging.
- [ ] Confirm outgoing email uses the real email service, not a test placeholder.
- [ ] Have someone do a final manual review of the database's access rules (RLS).
