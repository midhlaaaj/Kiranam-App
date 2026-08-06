# Restore Razorpay (after Expo Go testing)

Razorpay and `expo-dev-client` were temporarily removed so the app could run in
plain **Expo Go** via `npx expo start` (native modules aren't supported in Expo Go).

When you're done testing and want real payments back, paste this prompt to Claude Code:

---

**Prompt to give Claude:**

> Restore Razorpay in kiranam-app. Reinstall `react-native-razorpay` and
> `expo-dev-client` in package.json, remove the try/catch guard around
> `require('react-native-razorpay')` in `src/context/AppContext.tsx` (restore
> the plain `const RazorpayCheckout = require('react-native-razorpay').default;`
> line), and change the `start`, `android`, and `ios` scripts in package.json
> back to using the `--dev-client` flag. Then run `npm install` to update the
> lockfile.
>
> After that, I'll need to build a dev client via EAS (`npx eas-cli build
> --profile development --platform ios` and/or `--platform android`), install
> it on my device, and then `npx expo start` will work again like it does now,
> but opening in the custom dev client instead of Expo Go.

---

## What gets reverted

1. **package.json**
   - Add back `"react-native-razorpay": "^3.0.0"` and `"expo-dev-client": "~6.0.21"` to `dependencies`
   - Change scripts back to:
     ```json
     "start": "expo start --dev-client",
     "android": "expo start --dev-client --android",
     "ios": "expo start --dev-client --ios",
     ```

2. **src/context/AppContext.tsx** — in `makeRazorpayPayment`, replace the guarded require:
   ```ts
   let RazorpayCheckout: any;
   try {
     RazorpayCheckout = require('react-native-razorpay').default;
   } catch {
     throw new Error('Razorpay payments are disabled in this Expo Go test build.');
   }
   ```
   back to:
   ```ts
   const RazorpayCheckout = require('react-native-razorpay').default;
   ```

3. Run `npm install` to restore `package-lock.json`.

4. Build a fresh dev client (EAS cloud build, since there's no local Android/iOS
   SDK on this machine) and install it on your device before `npx expo start`
   will work with real Razorpay payments again.
