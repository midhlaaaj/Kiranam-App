---
name: Kiranam Refined
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dbe4ed'
  on-surface: '#141d23'
  on-surface-variant: '#5e3f3c'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#926e6b'
  outline-variant: '#e7bcb8'
  surface-tint: '#c00016'
  primary: '#bb0016'
  on-primary: '#ffffff'
  primary-container: '#e61924'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ac'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5a5c5d'
  on-tertiary: '#ffffff'
  tertiary-container: '#737576'
  on-tertiary-container: '#fcfdfe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#93000e'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dbe4ed'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system evolves from a bold, utility-focused aesthetic into a premium, high-end retail experience. It targets a modern consumer who values clarity, efficiency, and a sophisticated shopping environment. The brand personality is confident yet understated, moving away from "loud" structural elements toward a philosophy of **Elevated Minimalism**.

The visual style utilizes expansive whitespace, subtle depth through soft shadows, and a restrained application of its signature vibrant red. By removing heavy borders and hard boxes, the UI feels lighter and more fluid, evoking an emotional response of trust, quality, and effortless navigation.

## Colors
The color palette is anchored by **Kiranam Red (#EC2028)**, now utilized strictly as a functional accent for primary actions, critical alerts, and brand signifiers. 

- **Primary**: Used for CTA buttons, active states, and price highlights.
- **Secondary**: A deep charcoal for high-contrast typography and iconography.
- **Surface**: The background remains a pristine white (#FFFFFF), with secondary surfaces using a very soft grey (#F8F9FA) to define card areas and container grouping without the need for strokes.
- **Neutral**: Mid-range greys are reserved for secondary text and decorative dividers.

## Typography
Typography in this design system emphasizes breathing room and hierarchy. **Plus Jakarta Sans** provides a friendly yet modern geometric feel for headings, while **Inter** ensures maximum legibility for product descriptions and functional labels.

Line heights are intentionally generous to prevent visual clutter in data-heavy retail environments. Tracking is slightly tightened on large displays to maintain a "premium" locked-in look, while labels use slight tracking increases to ensure clarity at small sizes.

## Layout & Spacing
This design system employs a **Fluid Grid** model with significant padding to enforce a sense of luxury. 

- **Desktop**: 12-column grid with 24px gutters and 64px outer margins.
- **Tablet**: 8-column grid with 20px gutters and 32px outer margins.
- **Mobile**: 4-column grid with 16px gutters and 16px outer margins.

Spacing follows a linear 8px scale. Use "lg" and "xl" spacing tokens between major sections to ensure the "premium" whitespace requirement is met. Components should never feel cramped; internal padding for cards and containers should default to the "md" (24px) token.

## Elevation & Depth
Depth is created through **Ambient Shadows** rather than lines. This design system moves away from the "Brutalist" stroke-heavy origins of previous iterations.

- **Level 1 (Low)**: Used for subtle cards and hover states. 0px 4px 20px rgba(0, 0, 0, 0.04).
- **Level 2 (Medium)**: Used for dropdowns and navigation bars. 0px 8px 30px rgba(0, 0, 0, 0.08).
- **Level 3 (High)**: Used for modals and floating action elements. 0px 12px 40px rgba(0, 0, 0, 0.12).

Surfaces should primarily be white. Use tonal layering (a #F8F9FA background behind a #FFFFFF card) to create structure without adding visual weight.

## Shapes
The shape language is defined by **Pill-shaped (3)** rounding. This extreme softness removes any residual "industrial" feel and replaces it with an approachable, modern silhouette. 

All primary buttons and tags use full pill shapes. Containers and large cards use `rounded-xl` (48px on large screens, scaling down to 24px on mobile) to maintain a cohesive, organic aesthetic throughout the interface.

## Components
- **Buttons**: Primary buttons are solid Red (#EC2028) with white text, using a full pill radius. Secondary buttons use a light grey fill (#F8F9FA) with no border.
- **Cards**: Use a white background with a Level 1 shadow. Do not use borders. Internal padding is strictly 24px.
- **Input Fields**: Soft grey backgrounds (#F8F9FA) with no borders. On focus, a subtle 1px primary red stroke is permissible, but should be accompanied by a soft red outer glow.
- **Chips/Tags**: Small, pill-shaped elements with light grey backgrounds and medium-weight labels. 
- **Lists**: Items are separated by whitespace or extremely faint horizontal rules (1px, #F1F1F1). Avoid heavy dividers.
- **Checkboxes & Radios**: When active, these use the primary red. When inactive, they use a soft grey outline, maintaining the rounded shape language (radios are circles, checkboxes have a 4px radius).
- **Progress Indicators**: Use thin, sleek lines with the primary red used to show completion, emphasizing the minimal footprint.