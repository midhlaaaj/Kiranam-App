import type { Metadata } from 'next';

// Every page under /auth (confirm, success, error, verifying) is reached by
// tapping an email link — almost always a contributor or volunteer
// confirming a password reset or email change from kiranam-app, not an
// admin. The root layout's "Kiranam Admin" title showing in the browser
// tab/history for these people is confusing and wrong; this overrides it
// to just the app's own name, matching the wordmark these pages display.
export const metadata: Metadata = {
  title: 'Kiranam',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
