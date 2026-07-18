---
name: Kiranam Admin
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#1d59c1'
  primary: '#003c90'
  on-primary: '#ffffff'
  primary-container: '#0f52ba'
  on-primary-container: '#bcceff'
  inverse-primary: '#b0c6ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#732900'
  on-tertiary: '#ffffff'
  tertiary-container: '#993900'
  on-tertiary-container: '#ffc0a7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00419c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

The design system is engineered for the **Kiranam Admin** dashboard, prioritizing high-density information management and operational efficiency. The brand personality is rooted in **transparency, reliability, and precision**, reflecting the stewardship required for charitable operations.

The aesthetic follows a **Clean Professional** movement. It balances the utility of an enterprise tool with the warmth of a mission-driven organization. The interface minimizes decorative elements to focus on data clarity, utilizing generous whitespace and a disciplined grid to prevent cognitive overload. The emotional response should be one of "controlled urgency"—where administrators feel equipped to handle critical tasks with absolute confidence.

## Colors

This design system utilizes a foundation of **Sapphire Blue** to convey trust and authority. The palette is structured to support a data-heavy environment where color is used primarily as a functional signifier rather than decoration.

- **Primary:** Used for main actions, active navigation states, and brand presence.
- **Secondary/Neutral:** A range of cool grays (Slate) provides the scaffolding for the interface, ensuring the content remains the focal point.
- **Semantic Colors:** Critical for the dashboard's utility. 
    - **Green (Success):** Used for completed donations and active campaigns.
    - **Amber (Pending):** Used for audits and verification queues.
    - **Red (Error):** Reserved for failed transactions or urgent system alerts.
- **Surface Colors:** Pure white (#FFFFFF) is used for cards and main content areas to maximize contrast against the light gray background (#F8FAFC).

## Typography

The design system employs **Inter** for its exceptional legibility in UI contexts, particularly within dense data tables. For specific financial figures or ID strings, **JetBrains Mono** is introduced to ensure character distinction (e.g., distinguishing '0' from 'O').

- **Hierarchy:** Use `display-lg` sparingly for main dashboard overviews. `headline-sm` is the default for card titles.
- **Tables:** Use `body-md` for standard row data and `label-md` for table headers to create a clear visual distinction.
- **Mobile Adaptation:** For screens smaller than 768px, `display-lg` should scale down to 24px to maintain readability without excessive wrapping.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for the main content area, paired with a fixed-width left navigation rail (240px). 

- **Grid Logic:** Use 24px margins for desktop and 16px for mobile. Gutters are fixed at 20px to ensure data columns in tables remain distinct.
- **Vertical Rhythm:** A strict 4px base unit governs all spacing. Stat tiles and cards should use 24px (`lg`) internal padding to create a sense of premium space.
- **Responsive Behavior:** 
    - **Desktop:** Sidebar expanded, 12 columns.
    - **Tablet:** Sidebar collapses to icons only, 8 columns.
    - **Mobile:** Sidebar moves to a bottom navigation bar or hamburger menu, 4 columns.

## Elevation & Depth

This design system uses a **Tonal Layering** approach to minimize the "heaviness" often found in admin tools. 

- **Level 0 (Background):** #F8FAFC (Neutral base).
- **Level 1 (Cards/Tables):** White surface with a 1px border (#E2E8F0). No shadow is used for static elements to maintain a "flat professional" look.
- **Level 2 (Dropdowns/Modals):** White surface with a soft ambient shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to suggest interaction and temporary presence.
- **Interactive States:** Buttons and clickable cards use a subtle "lift" effect (y-offset: 2px) on hover to provide tactile feedback.

## Shapes

To maintain a professional and structured appearance, the design system utilizes **Soft** roundedness. 

- **Small Components:** Checkboxes and small tags use 4px (`0.25rem`) corner radii.
- **Large Components:** Main content cards and input fields use 8px (`0.5rem`) corner radii. 
- **Buttons:** Follow the 8px standard unless they are "Action Icons" which may be circular. 

This subtle rounding prevents the interface from feeling "sharp" or unfriendly while maintaining the geometry required for a serious financial tool.

## Components

### Data Tables
- **Headers:** Sticky headers with `label-md` text and a subtle bottom border.
- **Rows:** Zebra striping is avoided; instead, use a subtle #F1F5F9 hover state for row highlighting.
- **Actions:** Row actions should be grouped in an "ellipsis" menu at the end of the row to reduce visual clutter.

### Status Badges
- **Style:** Small, pill-shaped with low-opacity background fills (10-15%) and high-contrast text.
- **Variants:** Success (Green), Warning (Amber), Error (Red), Neutral (Gray).

### Stat Tiles
- Feature a large `headline-md` number and a `body-sm` label. 
- Include a small sparkline chart (120px width) to show 7-day trends at a glance.

### Data Visualization
- **Bar/Line Charts:** Use Primary Blue for the main data series. Secondary series use Teal or Indigo.
- **Donut Charts:** Use high-contrast color pairings from the semantic palette for categorical data.
- **Loading Skeletons:** Use a subtle shimmer animation on #F1F5F9 shapes that mirror the final content structure (e.g., rectangular blocks for text, circles for avatars).

### Empty States
- Always include a central icon (light gray), a clear `headline-sm` title, and a primary CTA button to guide the user on how to populate the data.