# Product

## Register

product

## Platform

web

## Users

Kiranam charity staff and operations admins — a small internal team, not the public. They log in daily to manage contributors (recurring donors), volunteers, campaigns, events, contributions, and notifications. Their context is task-focused desk work (and occasional on-the-go phone checks), moving between data-entry, review/approval, and reporting workflows within the same session.

## Product Purpose

An internal admin console for Kiranam, a charity organization. It lets staff onboard and manage volunteers and contributors, run fundraising campaigns and events, track contributions and donor commitments, send in-app notifications, and audit admin activity. Success looks like staff completing these workflows quickly and confidently, with clear status at a glance (who's overdue, what needs approval, how campaigns are tracking) and no ambiguity about destructive actions.

## Positioning

The operational backbone of Kiranam's fundraising and volunteer programs — one trustworthy place to see and manage everything the charity's donor and volunteer relationships depend on.

## Brand Personality

Trustworthy and calm. This tool handles donor money and volunteer data, so it should read as institutional and precise rather than flashy — steady confidence, not urgency or salesmanship. Warmth comes through in tone and care for detail (real empty states, clear status, no dead ends), not through decoration.

## Anti-references

Generic AI-admin-template tells: indigo/purple gradient SaaS defaults, hero-metric stat cards with gradient accents, tiny uppercase tracked eyebrows above every section, side-stripe colored borders on cards, identical card grids. Also avoid overloading the brand color for destructive actions — brand and "danger" must read as visually distinct.

## Design Principles

- One system, not per-page reinvention: shared primitives (buttons, cards, tables, badges) carry the redesign to every route automatically.
- Brand ≠ danger: the primary brand color signals identity and primary actions; a separate, distinct red signals destructive/error states only.
- Show real state, not blank screens: every async route gets a skeleton loading state and a designed empty state — never a blank flash or a bare "No X yet." row.
- Calm precision over decoration: restrained color, tight numeric alignment (tabular figures for money/counts), motion that confirms actions rather than performs.
- Respect the device: full responsive behavior including a working mobile nav, since staff also check this tool on phones.

## Accessibility & Inclusion

WCAG AA as the floor: body text ≥4.5:1 contrast, large text ≥3:1, visible focus rings on all interactive elements, `prefers-reduced-motion` alternatives on every animation. No color-only status indicators (badges/status pair color with text, never color alone).
