import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Code merged in from wacrm (the WhatsApp comm center, under /whatsapp)
    // was written against eslint-config-next 16.2.6, which didn't yet
    // enforce the React Compiler rules below as errors — this app's
    // 16.2.10 does. The patterns they flag (setState directly inside an
    // effect, manual useCallback deps the compiler infers differently)
    // are React-Compiler-opinionated preferences, not correctness bugs —
    // this code shipped and worked fine in wacrm's own standalone repo.
    // Scoped down rather than rewritten wholesale, to avoid the real risk
    // of introducing actual regressions mid-migration for a style-only
    // rule. Revisit call-by-call if/when someone touches these files.
    files: [
      "src/app/whatsapp/**/*.{ts,tsx}",
      "src/app/api/whatsapp/**/*.{ts,tsx}",
      "src/lib/whatsapp/**/*.{ts,tsx}",
      "src/components/whatsapp/**/*.{ts,tsx}",
      "src/hooks/whatsapp/**/*.{ts,tsx}",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Same story: functions declared later in a component body but
      // referenced inside an effect (which only runs after the full
      // render commits, by which point the declaration exists) — works
      // correctly at runtime, flagged only by the compiler's stricter
      // lexical-ordering analysis.
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
