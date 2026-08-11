# What's left before Kiranam goes live

A plain-language checklist for launching the admin website and the phone app. Check items off as you complete them.

## 1. Set up your accounts

Some of these take days to be approved, so start them first, even before the other steps.

- [ ] **Sign up for an Apple Developer account.** Costs $99 a year. Your app can't go on the iPhone App Store without it, and approval can take a few days.
- [ ] **Sign up for a Google Play Console account.** Costs $25 once. Your app can't go on the Google Play Store without it. New accounts sometimes get an extra verification check, so give it time.
- [ ] **Set up your live website hosting account.** This is the service (Vercel) that will actually run the admin website once it's public, separate from your testing setup.
- [ ] **Set up a clean, real version of your database.** Right now you're likely testing on the same database you'll use for real. Before launch you want one with no test data sitting in it.

## 2. Get the phone app ready to take real payments

Payments are currently switched off in the app on purpose, so it could be tested without a special build.

- [x] **Turn payments back on in the app.** This was intentionally disabled for easier testing. It has to be switched back on before anyone can actually donate.
- [ ] **Build a real version of the app and test one real payment start to finish.** Not the quick testing mode — an actual build like the one that will ship to the app stores.
- [ ] **Prepare your app store listing.** You'll need an app icon, an opening screen, screenshots for different phone sizes, a short description, a support contact, and a link to your privacy policy that anyone can open.
- [ ] **Double check the app's store ID.** This is the app's permanent "name tag" in the app stores. It can't be changed later, so confirm it's the one you want to keep forever.

## 3. Get the admin website ready to go live

This is the internal tool your team uses day to day — it isn't meant for the public.

- [x] **Do a practice run of putting the website on its hosting service.** You're using very new website software, so it's better to catch any surprises now than on launch day.
- [x] **Turn on the full security shield.** Right now it only watches for problems and reports them, without blocking anything. Once you've confirmed nothing gets wrongly blocked, switch it to actually block.
- [ ] **Write down every secret setting the website needs, then enter them into the hosting service.** There are 19 of these (passwords, keys, and so on), and none are written down anywhere yet — easy to miss one when setting up.
- [ ] **Make sure the payment behind-the-scenes functions are switched on in your real database.** Not just in your test one — they need to be live in the database your real app will use.
- [ ] **Check outgoing email is using your real email service.** Not a placeholder used for testing, so invite emails and notifications actually reach people.

## 4. A few safety habits before you launch

Quick checks that catch costly mistakes early.

- [ ] **Have someone check the database's access rules one more time.** Makes sure people can only see and edit what they're actually supposed to.
- [x] **Set up a simple automatic check that runs whenever the website's code changes.** So a broken change can't accidentally go live without anyone noticing.
- [x] **Make sure a stranger can't sign themselves up as a staff member by accident.** Only your invite system should ever be able to grant admin access.
