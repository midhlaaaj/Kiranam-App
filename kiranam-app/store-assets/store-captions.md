# Store captions, graphics and video — Karunya Kiranam

Everything here is generated from `_build/` (HTML templates) — edit the text in `_build/frame.html`
and re-render. The app is iPhone-only (`supportsTablet` is off), so no iPad screenshots are needed.

## Screenshot captions (same on both stores)

| # | File | Headline | Subtext |
|---|---|---|---|
| 1 | `01-hero` | Karunya Kiranam | Empowering lives, inspiring smiles |
| 2 | `02-login` | Sign in with just your phone number | A one-time code arrives on WhatsApp. Works with mobile numbers from India and abroad. |
| 3 | `03-home` | Your monthly giving, at a glance | Set an amount, change it any time and keep every contribution in one place. |
| 4 | `04-campaigns` | Back the causes you care about | Follow each campaign's progress and give in a few taps. |

## Files

- `play/` — Google Play: 4 phone screenshots 1080×1920, feature graphic `feature-graphic-1024x500.png`.
  App icon 512×512: `../../kiranam-admin/brand/logo/play-store-icon-512.png`.
- `ios/` — App Store: 4 screenshots at 1290×2796 (6.9"/6.7" slot) and 1284×2778 (6.5" slot).
- `video/karunya-kiranam-intro-1080x1920.mp4` — 22 s portrait intro (H.264, no audio). Upload to YouTube
  and paste the link in Play Console → Store listing → Video; for the App Store use it as the
  app preview only after trimming to 15–30 s at the exact preview size Apple asks for.

## Google Play

- **App name (30):** Karunya Kiranam
- **Short description (80):** Give monthly to causes you care about. Track every contribution.
- **Full description:** see `play-store-listing.md`.

## Apple App Store

- **Name (30):** Karunya Kiranam
- **Subtitle (30):** Monthly giving & campaigns
- **Promotional text (170):** Set a monthly contribution, back active campaigns, join events and keep a receipt for every contribution — sign in with your phone number, from India or abroad.
- **Keywords (100):** donate,charity,giving,donation,kerala,campaigns,receipts,volunteer,foundation,monthly,events,80G
- **Category:** Lifestyle (secondary: Social Networking is not recommended; Finance only if asked)
- **Support URL:** https://kiranam.online  ·  **Privacy policy URL:** https://kiranam.online/legal/privacy
- **Description (4000):**

  Karunya Kiranam is the giving app of Health Care Foundation, a registered charitable organisation in Kerala.

  Choose a monthly amount, give to active campaigns, and keep a clear record of everything you have contributed — all in one place.

  WHAT YOU CAN DO
  • Set a monthly contribution and change it any time
  • Give to a specific campaign and watch its progress
  • See upcoming events and how to take part
  • Keep a full history of your contributions and download a receipt for each one
  • Get reminders and updates on WhatsApp or in the app — you choose
  • Apply to become a coordinator and support contributors in your community

  SIMPLE AND SAFE
  • Sign in with your phone number — we send a one-time code on WhatsApp. Mobile numbers from India and other countries are supported.
  • Payments are handled by Razorpay; we never see or store your card or UPI details
  • You can delete your account and data from Profile → Delete Account

  Health Care Foundation is approved under Section 80G of the Income Tax Act, 1961, so contributions may be eligible for a tax deduction, subject to the conditions of the Act.

  Questions? support@kiranam.online

- **What's New (1.2.0):** Sign in now works with mobile numbers from outside India. Smaller, faster profile photo uploads. Referral invitations now remind people to enter the code when they sign up.
- **App Review notes:** Sign in with the demo number from `play-store-listing.md` → "App access" (fixed OTP, no WhatsApp message is sent). Payments use Razorpay; please do not complete a real payment.

## Before you submit — read this

1. **The Home and Campaigns screenshots show demo data** (stock photos, sample campaigns, "Not set yet"). Both stores
   can reject screenshots that don't match the real app. Retake those two from a build connected to your real campaigns
   with a test contributor that has a monthly amount set, then drop the PNGs into `source/` (same names) and re-render.
2. Screenshots 2 and 3 of a typical listing would normally include Contributions/receipt and Events screens. They need a
   signed-in session, so they are not included — add `source/contributions.png` etc. and a matching entry in `_build/frame.html`.
3. The video has no audio and uses the same demo screens.
