/**
 * MODE — the light/dark dimension. The comm center's only remaining
 * theming axis — it previously also carried a 6-way accent-color picker
 * (kiranam/violet/emerald/cobalt/amber/rose), removed in favor of a
 * single fixed brand identity matching the rest of the admin panel (see
 * the [data-wacrm-scope] block in globals.css for the actual color
 * values).
 *
 * The CSS variables live in `src/app/globals.css` under
 * `[data-wacrm-scope][data-mode="..."]` blocks (neutral surfaces only —
 * the accent/primary color is fixed in the base [data-wacrm-scope]
 * block, not mode-dependent). Applied at runtime via a data-mode
 * attribute on the wrapper div (see use-theme.tsx).
 *
 * Persisted to localStorage so the choice survives across sessions.
 */
export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "dark";

export const MODE_STORAGE_KEY = "wacrm.mode";

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === "string" && (MODES as ReadonlyArray<string>).includes(value)
  );
}
