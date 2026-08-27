# Rollback: phone-OTP login → email+password login

## When to use this

kiranam-app's login currently uses phone number + OTP delivered via WhatsApp (Supabase's Send SMS Hook → `kiranam-admin`'s `/api/whatsapp/auth-hooks/send-sms`, which sends a WhatsApp AUTHENTICATION-category template message). That template needs Meta's approval to actually deliver. If that approval is delayed and phone-OTP login needs to come out of production, this app already has a complete, previously-shipped email+password flow to fall back to — no need to design anything new.

The email+password flow was the production login from 2026-08-10 to whenever the phone-OTP revert landed. Its exact, complete implementation lives at git commit **`806ae3d`** ("Switch app login to email+password and add push/in-app notifications") — every file below can be restored straight from that commit.

## What to restore

Run these from the repo root (`Kiranam app/`). Each pulls one file's content exactly as it was at `806ae3d`, overwriting today's phone-OTP version:

```bash
git show 806ae3d:kiranam-app/src/app/login.tsx > kiranam-app/src/app/login.tsx
git show 806ae3d:kiranam-app/src/app/register.tsx > kiranam-app/src/app/register.tsx
git show 806ae3d:kiranam-app/src/context/AppContext.tsx > kiranam-app/src/context/AppContext.tsx
```

Then bring back the five archived email-auth screens (currently sitting in `kiranam-app/_archived/` unused) and archive `otp.tsx` in their place:

```bash
git mv kiranam-app/_archived/password.tsx.bak kiranam-app/src/app/password.tsx
git mv kiranam-app/_archived/forgot-password.tsx.bak kiranam-app/src/app/forgot-password.tsx
git mv kiranam-app/_archived/reset-password.tsx.bak kiranam-app/src/app/reset-password.tsx
git mv kiranam-app/_archived/verify-email.tsx.bak kiranam-app/src/app/verify-email.tsx
git mv kiranam-app/_archived/email-verified.tsx.bak kiranam-app/src/app/email-verified.tsx
git mv kiranam-app/src/app/otp.tsx kiranam-app/_archived/otp.tsx.bak
```

**Note on `AppContext.tsx`:** restoring the whole file from `806ae3d` will also revert any *unrelated* changes made to that file between `806ae3d` and now (check `git log 806ae3d..HEAD -- kiranam-app/src/context/AppContext.tsx` before doing this, and re-apply anything unrelated to auth by hand). If the file has picked up meaningful unrelated changes since, it's safer to manually re-add just the four auth functions (`signUpWithEmail`, `resendSignupVerification`, `signInWithEmail`, `requestPasswordReset` — copy their bodies straight from `git show 806ae3d:kiranam-app/src/context/AppContext.tsx`) and remove `signInWithPhone`/`verifyOtpCode`, rather than overwriting the whole file.

**If this phone-OTP revert was committed as a single commit**, the simplest option is just:
```bash
git revert <that-commit-hash>
```
which undoes exactly these file moves/edits in one step — check `git log --oneline` for the commit that introduced this revert to get its hash.

## What does NOT need touching either way

These are shared between both login methods and don't change:
- `choose-amount.tsx` (contribution selector)
- `(tabs)/home.tsx`'s "Getting Started" checklist and its "Add your email" step
- `updateEmail()` / `isEmailVerified` in `AppContext.tsx` — the deferred-email mechanism is independent of login method
- `saveProfile()`'s referral-code redemption and consent-checkbox handling in `register.tsx`

## kiranam-admin's "Register contributor" panel

This was also reverted to match — `kiranam-admin/src/app/(admin)/contributors/actions.ts`'s `registerContributor()` now creates contributors by **phone** (`auth.admin.createUser({ phone, phone_confirm: true })`, no password, no claim email), and `RegisterContributorForm.tsx` no longer has an email field. If rolling kiranam-app back to email login, this panel needs to come back too — otherwise admin-registered contributors would get a phone-only account with no way to log in (no phone-OTP login left in the app).

Restore both files from git history the same way as above (find the commit that introduced the phone-based version — the one right before this note was added — and `git show <hash>:<path> > <path>` each of `contributors/actions.ts` and `RegisterContributorForm.tsx`). That version creates the account by email with a random password and sends a "set your password" claim-link email (via `claimAccountEmail()` in `kiranam-admin/src/lib/email/templates.ts`, which was deleted in this revert — restore that function too, same way).

## Dashboard side of a rollback

**Nothing needs to change in the Supabase Dashboard.** The Phone auth provider can stay enabled (it's not mutually exclusive with email+password), and email+password was never disabled at the provider level during the phone-OTP revert — so this is a pure code-level rollback.

## Verification after rolling back

- Typecheck/lint kiranam-app.
- New signup: email → password (or confirm-password) → register (name, mobile number, referral) → choose-amount.
- Existing email+password login: email → password → straight into the app.
- Forgot-password round trip: email → reset link → deep link → new password.
- Confirm `(tabs)/home.tsx`'s "Add your email" checklist step no longer shows for accounts that signed up with email (already have one) but still shows for anyone previously registered via phone-OTP with no email set.
