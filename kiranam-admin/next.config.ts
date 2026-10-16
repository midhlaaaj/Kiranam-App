import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers applied to every response. Carried over
 * verbatim from wacrm's own next.config.ts (now merged in under
 * /whatsapp) — CSP ships report-only until confirmed clean across every
 * route, the rest are safe to enforce today. See wacrm's original
 * comments (git history) for the full per-header rationale.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // Microphone allowed same-origin only so the WhatsApp inbox composer
    // can record voice notes via MediaRecorder.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
] as const;

const nextConfig: NextConfig = {
  // The receipt PDF reads its fonts/logos from disk at runtime — make sure
  // they ship with the route's serverless function.
  outputFileTracingIncludes: {
    "/api/receipts/send": ["./src/lib/receipts/assets/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/analytics",
        destination: "/",
        permanent: true,
      },
      // Volunteers were renamed Coordinators — keep old bookmarks and
      // notification links working.
      {
        source: "/volunteers/:path*",
        destination: "/coordinators/:path*",
        permanent: true,
      },
      {
        source: "/volunteers",
        destination: "/coordinators",
        permanent: true,
      },
    ];
  },

  // Dev-only: allow tunnels (ngrok/cloudflare/localtunnel) to reach the
  // dev server's HMR/internal routes. No effect on production builds.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
    "*.loca.lt",
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : []),
  ],

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // Only the public marketing/legal pages may be cached by the CDN.
      // Admin pages are per-user and must never be served from a shared
      // cache — Next.js marks those private/no-store itself.
      // Scoped to the public host: "/" on admin.kiranam.online is the
      // signed-in dashboard.
      ...["/", "/landing", "/join", "/legal/:path*"].map((source) => ({
        source,
        has: [{ type: "host" as const, value: "(www\\.)?kiranam\\.online" }],
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      })),
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
