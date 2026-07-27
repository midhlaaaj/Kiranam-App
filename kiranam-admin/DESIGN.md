# Design

Target visual system for the Kiranam Admin redesign. Single source of truth — `globals.css` tokens and `lib/ui.ts` primitives implement exactly this, and every route consumes them rather than reinventing styles.

## Theme

Light mode only (internal desk tool, not a night-mode use case). OKLCH throughout for predictable contrast control.

## Color

Restrained strategy: one brand accent, semantic tokens for state, true near-white neutrals (not a cream/sand default).

| Token | OKLCH | Role |
|---|---|---|
| `--color-bg` | `oklch(0.975 0.003 40)` | Page background — near-white, near-zero chroma |
| `--color-surface` | `oklch(1 0 0)` | Card/panel background |
| `--color-surface-alt` | `oklch(0.965 0.005 40)` | Subtle fills (pills, table hover, chips) |
| `--color-border` | `oklch(0.92 0.006 40)` | Default hairline border |
| `--color-border-strong` | `oklch(0.86 0.008 40)` | Input borders, dividers that need more presence |
| `--color-ink` | `oklch(0.22 0.012 35)` | Primary text |
| `--color-muted` | `oklch(0.48 0.014 35)` | Secondary text — re-checked to clear 4.5:1 on both bg and surface |
| `--color-muted-2` | `oklch(0.68 0.012 35)` | Tertiary text / placeholders (still ≥4.5:1 where used as text) |
| `--color-primary` | `oklch(0.42 0.14 29)` | Brand — deep brick/oxblood. Buttons, links, active nav, focus ring, chart accent |
| `--color-primary-soft` | `oklch(0.95 0.03 29)` | Primary tint (badges, active pill backgrounds) |
| `--color-danger` | `oklch(0.55 0.19 25)` | Destructive actions / errors only — distinct from primary |
| `--color-danger-soft` | `oklch(0.95 0.045 25)` | Danger tint |
| `--color-success` | `oklch(0.45 0.09 155)` | Positive status (active, completed, funded) |
| `--color-success-soft` | `oklch(0.94 0.04 155)` | Success tint |
| `--color-warning` | `oklch(0.55 0.12 75)` | Due / pending status |
| `--color-warning-soft` | `oklch(0.95 0.05 75)` | Warning tint |

**Why primary ≠ danger:** the current app uses one red for both the brand and all destructive/error UI. This redesign gives destructive actions their own distinct hue so "revoke access" doesn't visually borrow the same alarm color as the logo.

## Typography

Single family: **Inter** (already loaded via `next/font/google` as `--font-inter`), weights 400–800. A dense, data-heavy product register doesn't need a second display face — hierarchy comes from weight/size, not a font pairing.

- Page titles (`h1`): 24px / bold / tight tracking
- Section headings (`h2`): 16–18px / bold
- Body / table text: 14px, line-height 1.5
- Labels / eyebrows: 12px / semibold / uppercase, used sparingly (table headers only — not decorative section eyebrows)
- Numeric values (money, counts, stat figures, table numeric columns): `font-variant-numeric: tabular-nums`

## Shape & Elevation

- Radius: `rounded-lg` (buttons, inputs, badges/pills stay `rounded-full`), `rounded-xl` for cards (tightened from the previous `rounded-2xl` — reads more precise, less "bubbly")
- Elevation scale (named, not ad hoc):
  - `--shadow-sm`: subtle 1px card lift
  - `--shadow-md`: card default
  - `--shadow-lg`: dropdowns, modals, mobile nav drawer

## Motion

Standard tier — 150–300ms, ease-out-quart. Table rows and stat cards stagger in (30–50ms/item) on first paint. Stat numbers count up. Every animated element has a `prefers-reduced-motion` fallback (instant/crossfade). Transform/opacity only — never animate layout properties.

## Layout

- `min-h-dvh` shell, sidebar collapses to a slide-over drawer with a hamburger trigger below `lg` (1024px) — currently has zero responsive behavior.
- 4/8pt spacing rhythm.
- Tables scroll horizontally within their own container on narrow viewports rather than breaking page layout.

## Components

- **Buttons**: primary (filled brand), secondary (outlined), danger (filled `--color-danger`, for destructive confirmations only), ghost link.
- **Cards**: `cardClass` — white surface, `rounded-xl`, `--shadow-md`, `--color-border`.
- **Tables**: sticky header row, tabular-nums numeric columns, zebra-free (border + hover tint instead), designed empty state (icon + message + optional action) instead of a bare text row.
- **Badges**: semantic tone (success/warning/danger/neutral), always paired with text — never color-only.
- **Skeletons**: shimmer blocks matching each real component's exact footprint (`SkeletonStatCard`, `SkeletonTable`, `SkeletonChart`, `SkeletonForm`), static tint under reduced-motion.
- **Tabs**: underline-style tab strip (used by Settings and, in a pill variant, already present on Volunteers/Analytics).
