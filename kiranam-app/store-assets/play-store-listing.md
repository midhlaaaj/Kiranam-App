# Google Play — listing and Data safety answers (Karunya Kiranam)

Prepared from what the app actually does (code + privacy policy). Re-check each answer
against the live Play Console wording before submitting.

## Store listing

- **App name (30 max):** Karunya Kiranam
- **Short description (80 max):** Give monthly to causes you care about. Track every contribution.
- **Category:** Lifestyle (alternatives: Social, Finance — avoid Finance unless asked; the app takes donations, not payments for goods)
- **Tags:** Donations / Charity
- **Contact email:** support@kiranam.online
- **Website:** https://kiranam.online
- **Phone:** +91 99466 61059
- **Privacy policy URL:** https://kiranam.online/legal/privacy
- **Account deletion URL (App content → Data deletion):** https://kiranam.online/legal/data-deletion
- **Developer name:** Health Care Foundation (must match the D-U-N-S / payments profile)

### Full description (4000 max)

Karunya Kiranam is the giving app of Health Care Foundation, a registered charitable organisation
in Kerala.

Choose a monthly amount, give to active campaigns, and keep a clear record of everything you have
contributed — all in one place.

What you can do
• Set a monthly contribution and change it any time
• Give to a specific campaign and watch its progress
• See upcoming events and how to take part
• Keep a full history of your contributions and download a receipt for each one
• Get reminders and updates on WhatsApp or in the app (you choose)
• Apply to become a coordinator and support contributors in your community

Simple and safe
• Sign in with your phone number — we send a one-time code on WhatsApp
• Payments are handled by Razorpay; we never see or store your card or UPI details
• You can delete your account and data from Profile → Delete Account, or via kiranam.online/legal/data-deletion

Health Care Foundation is approved under Section 80G of the Income Tax Act, 1961, so contributions
may be eligible for a tax deduction, subject to the conditions of the Act.

Questions? support@kiranam.online

## Graphics still needed

- App icon 512×512 (use assets/images/icon.png, export at 512)
- Feature graphic 1024×500 — NOT created yet
- Phone screenshots: you have 4 in store-assets/screenshots; Play wants 2–8. Retake after the latest build
  (new About / Personal Information pages, no placeholder data).

## App access (App content → App access)

Choose "All or some functionality is restricted" and add:

- Instructions: "Sign in with the phone number below. Enter the one-time code shown below (no WhatsApp message is sent for this test number)."
- Phone: +91 90000 00001 (test number — must be added in Supabase → Auth → Phone → Test numbers with a fixed OTP)
- OTP: 123456
- Note: "Payments use Razorpay; please do not complete a real payment."

## Content rating (IARC questionnaire)

Category: Reference / Utility-style app with donations. Answer No to violence, sexual content,
profanity, controlled substances, gambling, user-to-user communication and sharing of location.
The app lets users donate real money to a charity: answer Yes to the question about real-money
transactions only if the questionnaire asks about purchases/donations; no simulated gambling.

## Target audience

18 and over. Not designed for children.

## Ads

No ads.

## Data safety form

**Does your app collect or share any of the required user data types?** Yes

**Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS/TLS to Supabase and Razorpay)

**Do you provide a way for users to request that their data be deleted?** Yes
(in-app Profile → Delete Account, plus https://kiranam.online/legal/data-deletion)

### Data types collected

| Category → type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Required | App functionality, Account management |
| Personal info → Email address | Yes | No | Optional | App functionality (receipts), Account management |
| Personal info → Phone number | Yes | No | Required | App functionality, Account management (login code) |
| Personal info → User IDs (account ID, referral code) | Yes | No | Required | App functionality, Account management |
| Photos and videos → Photos | Yes (profile photo, only if the user adds one) | No | Optional | App functionality |
| Financial info → Purchase history (contribution records: amount, date, campaign) | Yes | No | Required | App functionality |
| Device or other IDs → Device or other IDs (push notification token) | Yes | No | Optional (if notifications allowed) | App functionality (notifications) |

Not collected: location, contacts, calendar, web browsing, search history, audio, health and
fitness, messages, files, app interactions/analytics, crash logs/diagnostics, advertising ID.

### Notes on "shared"

Data processed by service providers acting on Health Care Foundation's behalf is NOT "sharing" under
Play's definition: Supabase (database, login), Razorpay (payment processing — receives name,
phone, email and amount for the payment), Meta WhatsApp Business (delivers the login code and
reminders). Answer "No" for shared, and keep the privacy policy's third-party section in sync.

### Payment information

Card, UPI and bank details are entered on Razorpay's screen and never reach our servers —
do not declare "User payment info" as collected.

### Clipboard

On first launch the app reads the clipboard once to recover a referral code. It is used locally and
only the code is sent to our server when valid; it's disclosed in the privacy policy. It is not a
Play Data safety category.

## Financial features declaration (Policy → App content)

- Select that the app does NOT provide: loans, banking, trading, crypto, insurance.
- Charitable donations: the app lets users donate to a registered charity through a third-party
  processor (Razorpay). Have the 80G approval (Form 10AD, AAATH8790C28KC02) and the registration
  certificate ready if the Console asks for proof.

## Release notes (first release)

"First release of Karunya Kiranam: monthly giving, campaigns, events, receipts and account management."
