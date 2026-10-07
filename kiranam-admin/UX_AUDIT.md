# Kiranam Admin + WhatsApp Comm Center — UX Audit

_Audit date: 2026-10-06 · Method: code-level review (JSX, Tailwind, tokens, actions) by four parallel reviewers, merged and de-duplicated. Highest-impact claims were spot-checked against source._

**Severity:** 🔴 HIGH — hurts task completion, data accuracy, or trust · 🟠 MEDIUM — friction or inconsistency · ⚪ LOW — polish
**Effort:** S (< ½ day) · M (1–3 days) · L (> 3 days)

Paths are relative to `kiranam-admin/`.

---

## How to read this

Part 1 lists **11 foundation fixes**. Each one is a shared-code change that resolves a whole family of issues. Roughly half of the findings in Parts 2–5 disappear once these are done, so do them first.

Parts 2–5 list the remaining issues by area, with 🔴 first within each area.

| Part | Area | 🔴 | 🟠 | ⚪ |
|---|---|---|---|---|
| 1 | Foundations (fix once) | 11 | — | — |
| 2 | Admin core: dashboard, campaigns, contributions, contributors, events, volunteers | 8 | 16 | 5 |
| 3 | Settings, logs, notifications, auth, legal | 9 | 9 | 5 |
| 4 | WhatsApp: inbox, contacts, dashboard, shell | 9 | 19 | 5 |
| 5 | WhatsApp: broadcasts, templates, automations, flows, settings | 8 | 19 | 4 |

---

# Part 1 — Foundation fixes (do these first)

### F1 🔴 `inputClass` forces `w-full`, so every width override is ignored
**This is the direct cause of the screenshot** (two stacked, full-width "All entity types" / "All admins" bars).
- **Where:** `src/lib/ui.ts:20-21`. Overridden via string concatenation in `LogsFilters.tsx:45,58`, `ContributionsPeriodFilter.tsx:81,84,95`, `ContributorGrowthFilter.tsx:84,87`, `campaigns/page.tsx:78`, `events/page.tsx:66`, `contributors/page.tsx:56`, `volunteers/page.tsx:109`, `KkCoverageModal.tsx:85`.
- **Problem:** `` `${inputClass} w-auto` `` doesn't override anything. In the compiled CSS, `.w-full` comes after `.w-auto`, `.w-56` and `.w-64`, so it always wins. Every filter select stretches to full width and wraps onto its own row. The search-box widths on all four list pages are silently ignored too.
- **Action (S):** Remove `w-full` from `inputClass` and add an `inputFullClass` for form fields, **or** compose every override with the existing `cn()` (`src/lib/utils.ts`, which already wraps `twMerge`). Add a `filterControlClass` primitive (`h-9 w-auto`).

### F2 🔴 No shared filter/list toolbar: every list invents its own, and most have none
- **Where:** Logs (`LogsFilters.tsx`), Contributions (`ContributionsPeriodFilter.tsx`), dashboard (`ContributorGrowthFilter.tsx`), the search forms on Campaigns, Events, Contributors and Volunteers, the WhatsApp inbox (`conversation-list.tsx:240-264`), and the custom-field audience (`step2-select-audience.tsx:354-389`). Broadcasts, Templates, Automations, Flows and the logs/runs pages have **no** search or filters at all.
- **Problem:**
  - Filters have no labels; the default option ("All admins") stands in for one.
  - Nothing shows that a filter is active: no chip, no count, no "Clear all".
  - Pills and native selects are mixed in the same bar, and a separate "Search" primary button competes with "Add new".
  - Search quietly carries over between tabs.
  - Empty states can't tell "nothing exists" apart from "everything is filtered out".
- **Action (M):** Build one `<FilterBar>` and use it everywhere:
  1. A search input (debounced ~300 ms, clear ✕, submits on Enter, **no Search button**).
  2. Compact `Label: Value ▾` dropdown pills, auto-width, opening a popover listbox.
  3. A period control (presets plus custom range, shown as a chip).
  4. A second row that appears only when filters are active: removable chips, **Clear all**, and a result count ("42 results").
  5. State kept in URL params, without overwriting unrelated params.
  6. `useTransition` with a dimmed table while navigating.
  7. On mobile, collapse into `MobileToolbar` with a "Filters (2)" badge.

### F3 🔴 Brand red is used for everything: buttons, success, money, progress, and danger
- **Where:** `src/app/globals.css:109-114`: `--color-kiranam-primary #ec2028` against `--color-kiranam-danger #ba1a1a` gives a 1.48:1 contrast, so they read as the same red. DESIGN.md specifies a deep brick primary (`oklch(0.42 0.14 29)`). The WhatsApp side uses `primary` for "Sent", "Delivered", "Read", "Active", "Connected", positive KPI deltas, outbound bubbles and open status (`lib/whatsapp/broadcast-status.ts`, `automations/[id]/logs/page.tsx:175,198`, `automations/page.tsx:303`, `metric-card.tsx:295-300`, `message-bubble.tsx:290`, `whatsapp-config.tsx:447`).
- **Problem:**
  - A ₹ total in red reads as a loss, and a 40%-funded bar reads as failing.
  - Success and failure look identical in delivery tables.
  - Approve and Reject are two filled reds side by side.
  - This breaks the first principle in PRODUCT.md, "Brand ≠ danger".
- **Action (S tokens + M sweep):**
  - Implement the DESIGN.md brick primary.
  - Add semantic `success`, `warning`, `danger` and `info` tokens, and use `primary` only for buttons, links and identity.
  - The uncommitted `template-status.ts` change already does this for template badges; apply the same rule to broadcasts, recipients, automations, dashboard deltas, connection state and charts.
  - Money figures should be ink, and in-progress funding bars neutral or brand, with green only when funded.

### F4 🔴 Contrast fails WCAG AA across the token set
- **Where:** `globals.css:99-120`, `src/lib/ui.ts:49-61`, plus raw `text-*-300/400` classes throughout the comm center (`trigger-meta.ts`, `template-status.ts`, `sidebar.tsx:51,249`, `response-time-chart.tsx:62`, inbox banner `inbox/page.tsx:569`).
- **Problem:** Measured ratios:

  | Element | Ratio |
  |---|---|
  | Success badge | 2.89 |
  | Warning badge | 2.96 |
  | White on primary button | 4.37 |
  | Active nav item | 3.76 |
  | Muted text | 4.00 |
  | `muted-2` text | 2.24 |
  | Input border (needs 3:1) | 1.30 |
  | Comm-center pastels in light mode | ~2:1 |

- **Action (S):** Darken success to about `#157a3e`, warning to about `#8a6100`, muted to about `#6b665f`, and the input border to about `#b9b4ad`. Never use `muted-2` for text. Replace raw palette classes with semantic tokens.

### F5 🔴 The WhatsApp Comm Center looks like a separate product
- **Where:** `lib/whatsapp/themes.ts:21` (`DEFAULT_MODE = "dark"`) against the admin, which is forced light (`app/layout.tsx:27`; DESIGN.md says "light mode only"). The comm center has its own tokens (`[data-wacrm-scope]`), smaller controls (Button `h-8`/`h-7` against the admin's `py-2.5 px-5`; Input `h-8` against about 42 px), its own name ("Kiranam Comm Center" against "WhatsApp" in the nav), and a second toaster (`app/layout.tsx:28` + `app/whatsapp/layout.tsx:42`, both mounted). It also doesn't use the admin's `PageHeading`, `Skeleton`, `EmptyState` or `Pagination`.
- **Problem:** Clicking "WhatsApp" in the sidebar switches you to a dark app with different buttons, inputs, headers and toasts. The way back is the third item in an avatar menu, under an "external link" icon (`header.tsx:141-151`, duplicated in `sidebar.tsx:393-403`). Toasts may render twice; check this in a browser.
- **Action (M):**
  - Default to light, and hide the dark toggle until dark passes AA.
  - Align button and input sizes with `lib/ui.ts`.
  - Mount one toaster, themed with admin tokens and without `richColors`.
  - Use one name ("WhatsApp") everywhere.
  - Add a persistent "← Kiranam Admin" `<Link>` at the top of the comm-center sidebar, and remove the duplicate account menu.
  - Adopt the admin's `PageHeading`, `Skeleton`, `EmptyState` and `Pagination`.

### F6 🔴 Irreversible actions have the weakest safeguards, and there are three different confirm patterns
- **Where:**
  - **Inverted emphasis:** shadcn `destructive` is a pale tint (`components/ui/button.tsx:18-19`) while `default` is solid red. `ConfirmSubmitButton` defaults to `destructive = true` (`ConfirmSubmitButton.tsx:31`), so "Approve" and "Archive" look dangerous while "Delete campaign" looks soft.
  - **Native `confirm()`:** "Reset WhatsApp config", which also breaks donor-app OTP login (`whatsapp-config.tsx:346`), flow delete (`flows/page.tsx:184`, `flow-editor-state.tsx:412`), quick replies (`quick-replies-manager.tsx:115`), contact notes (`contact-detail-view.tsx:278`).
  - **No confirm at all:** role changes (`members-tab.tsx:428-447`), activating an automation, deleting builder steps or nodes.
- **Action (S–M):**
  - Build one `<ConfirmDialog>` on `components/ui/alert-dialog.tsx`, with a consequence line and a solid danger button for destructive actions. Default to non-destructive.
  - Use **type-to-confirm** for the highest-risk actions: WhatsApp reset, bulk delete.
  - Put the most dangerous settings in a separate "Danger zone" card.

### F7 🔴 Forms lose work, save silently, or fail into a full-page error
- **Where:**
  - The custom `Modal` (`components/Modal.tsx:21-36`) closes on backdrop click or Escape and unmounts the form. It has no focus trap or restore, no scroll lock, and Escape bubbles out of nested Radix dialogs.
  - Edit pages (`campaigns/[id]/edit/page.tsx:85`, `events/[id]/edit/page.tsx:82`) have no pending state and no success toast, and `throw` on error, which goes to `error.tsx` and loses every edit.
  - React 19 resets auth forms after a failed submit (`login/page.tsx:29-41`, `signup`, `reset-password`, `forgot-password`), so the email is wiped.
  - No unsaved-changes guard in the automation builder (`automation-builder.tsx:722-729`) or the template dialog (`template-manager.tsx:636-644`); flows only guard closing the tab.
  - The composer draft *carries over* to the next conversation instead (W1).
- **Action (M):**
  - Replace `Modal` with a wrapper over `components/ui/dialog.tsx`.
  - Make every form use `useActionState` with a `SubmitButton` (`useFormStatus` → "Saving…", disabled), a success toast, and inline errors through `friendlyErrorMessage`. Never throw from form actions.
  - Echo back non-password fields after a failed submit.
  - Add a shared `useUnsavedChangesGuard(dirty)` covering `beforeunload` and in-app navigation, with a "Discard changes?" prompt.

### F8 🔴 Labels are missing or placeholder-only, and focus is barely visible
- **Where:**
  - `CreateCampaignForm.tsx:30-33`, `CreateEventForm.tsx:30-34`: the required date field has neither a label nor a placeholder.
  - `ManualContributionButton.tsx:149-161`, `OfflinePaymentForm.tsx:54-66`, `InviteAdminForm.tsx:31`, `NotificationsForm.tsx:51-56`, `KkCoverageModal.tsx:74-86`, `LogsFilters.tsx`.
  - Template-manager labels with no `htmlFor` (`:667-933`), `automation-builder` `FieldBlock`, `whatsapp-config.tsx:576-643`.
  - Focus: `globals.css:200-204` removes the outline, and `inputClass` only shifts a 1 px border colour.
- **Action (S):**
  - Use the existing `Field` (`components/FormField.tsx`) for every input: visible label, `htmlFor`/`id`, required and optional markers, and hint text through `aria-describedby`.
  - Add `focus-visible:ring-2 ring-kiranam-primary/30` to `inputClass`.
  - Use a ₹ prefix with `inputMode="numeric"` for amounts, as `RegisterContributorForm` already does.

### F9 🔴 Dates are formatted 10+ different ways, and server-rendered ones are probably in UTC
- **Where:**
  - Server components using `toLocaleString('en-IN')` without `timeZone`: `settings/logs/page.tsx:118`, `admin-users/page.tsx:65,68`, `settings/page.tsx:120,123`, `notifications/page.tsx:131`, `my-notifications/page.tsx:87`, `contributions/page.tsx:169`.
  - `dd-mm-yyyy` and `mm/yy` on the dashboard; `en-US` in WhatsApp contacts (`contacts/page.tsx:628-643`).
  - Contribution presets built in UTC (`contributions/page.tsx:35-60`).
- **Problem:** Audit-log times are likely 5 h 30 m off, and "Today" between 00:00 and 05:30 IST is actually yesterday. Formats show seconds and ambiguous numeric dates.
- **Action (S):**
  - Add `formatDate` ("6 Oct 2026"), `formatDateTime` ("6 Oct, 3:42 pm") and `<RelativeTime>` helpers, all pinned to `Asia/Kolkata`.
  - Show relative time under 24 h, with the absolute time in a `title`.
  - Build query bounds with an explicit `+05:30` offset.

### F10 🟠→🔴 Database and Meta internals leak into the UI
- **Where:**
  - Raw enums: `active`/`success`/`failed` badges (`campaigns/page.tsx:151`, `contributions/page.tsx:178`), log "Action" column showing table names (`settings/logs/page.tsx:110,123`).
  - Developer and Meta jargon: `node_key`, `step_type`, `trigger_event`, `JSON.stringify(run.vars)` (`flows/[id]/runs/page.tsx:273-343`, `automations/[id]/logs/page.tsx:138,204`), `tag id`/cron/JSON inputs (`automation-builder.tsx:873,1441`), `en_US`, `MARKETING`, `Body {{1}}`, `QUICK_REPLY`, raw rejection enums, quality "RED".
  - The forked product name: **"wacrm"** in invite text sent to people (`messages/en.json:1295,1415`).
- **Action (S each):**
  - One `StatusBadge` per domain with a label-and-tone map.
  - Translate step, trigger and event types through the existing i18n labels.
  - Put raw data behind a "Show technical details" toggle.
  - Use pickers instead of IDs (`TagSelect`, a frequency/day/time picker instead of cron, an "Insert variable" menu).
  - Map language codes to names.
  - Replace "wacrm" with "Kiranam".

### F11 🟠→🔴 Loading, error and success states don't reflect what actually happened
- **Where:**
  - "Invite sent" even when the email failed (`settings/actions.ts:72-83`).
  - A partial notification failure is reported as a total failure, and retrying double-sends (`notifications/actions.ts:34-49`).
  - Quick-view modals stay on "Loading…" forever on error (`ContributorQuickViewModal.tsx:56-58`, `VolunteerQuickViewModal.tsx:90`), and "Contributor updated" shows on a no-op save (`:76-78`).
  - Inbox status changes ignore errors (`message-thread.tsx:623-636`).
  - Dashboard skeletons spin forever on error (`whatsapp/dashboard/page.tsx:64-67`).
  - A flows load error shows "No flows yet, create your first" (`flows/page.tsx:117-121`); a network error shows "Flow not found".
  - Spinners instead of skeletons across the comm center, and retry via `window.location.reload()`.
- **Action (M):**
  - Every async surface gets four states: a skeleton shaped like the content, an error with an in-place Retry, an empty state, and data.
  - Success messages must reflect the actual outcome: "Sent to 241 of 248; 7 failed · Retry failed".
  - Roll back optimistic updates on error.

---

# Part 2 — Admin core

### A1 🔴 Contributions: period presets are mislabelled, there's no "All time", and the custom range is fragile
- **Where:** `contributions/page.tsx:35-60,104-116`, `ContributionsPeriodFilter.tsx:23,47-51`.
- **Problem:**
  - "This Week" actually means the last 7 days, and "This Month" the last 30.
  - Once a preset is chosen there's no way back to "All".
  - Custom accepts from > to, Apply silently does nothing when a date is empty, and the popover auto-opens on load.
- **Action (M):** Use "Last 7 days" and "Last 30 days", or real calendar periods. Make **All time** the default pill. Validate the range inline. Show an active-range chip instead of auto-opening. Uses F2 and F9.

### A2 🔴 Contributions: no totals, count, search or campaign filter
- **Where:** `contributions/page.tsx:99-123` (`summaryData` is fetched but never shown), `:154-184`.
- **Problem:** Staff can't see "12 contributions · ₹18,500", find a payment by name, phone or transaction ref, or filter by campaign.
- **Action (M):** Add a summary strip (count · success total · failed count), a search box, and a Campaign filter in the FilterBar. Give the chart a heading with the period total.

### A3 🔴 Contributor "Inactive" really means "autopay off"; Due/Overdue have no dates; dashboard totals don't match
- **Where:** `lib/volunteerStats.ts:9`, `ContributorsTableClient.tsx:59-65`, dashboard `page.tsx:138-154`.
- **Problem:**
  - Cash and offline payers who paid today show as **Inactive**.
  - "Overdue" appears without a due date or how many days overdue.
  - The dashboard breakdown only counts contributors who have a volunteer assigned.
- **Action (M):** Work out status from the last successful payment, or relabel it "No autopay". Add "Last paid" and "Next due" columns with "3 days overdue". Add a legend tooltip. Base the dashboard breakdown on all contributors.

### A4 🔴 Pending volunteer applications can't be reviewed by keyboard
- **Where:** `volunteers/PendingApplicantRow.tsx:80-84`: `<tr onClick>` with no tabIndex, role or key handler.
- **Action (S):** Add a "Review" button (or make the name a `<button>`). Add a truncated motivation preview to the row.

### A5 🔴 Review dialog: Approve and Reject are two filled reds side by side
- **Where:** `PendingApplicantRow.tsx:120-156`, `volunteers/[id]/page.tsx:50-59` (Approve uses the destructive style), `campaigns/[id]/edit/page.tsx:92-101` ("Mark as fully raised" is destructive).
- **Action (S):** Make Approve primary and Reject secondary or outline. Set `destructive={false}` on non-destructive confirms (also covered by F6).

### A6 🔴 Event "Mark as past event" is silently undone; edit validation is weaker than create
- **Where:** `events/[id]/edit/page.tsx:59-65` against the self-heal at `events/page.tsx:96-100`; create requires date and location (`CreateEventForm.tsx:32,34`), edit doesn't.
- **Action (S):** Remove the checkbox, since past or upcoming comes from the date, or make it a real override. Use the same `required` rules on edit.

### A7 🔴 Assign and reassign fail silently and can steal contributors from other volunteers
- **Where:** `contributors/[id]/page.tsx:119-129`, `volunteers/[id]/page.tsx:169-179`, `contributors/actions.ts:226` (`if (!volunteerId) return;`).
- **Action (S):** Disable Assign until something is selected. Use `useActionState` with a toast. Show "currently with Priya" in picker rows and confirm before reassigning.

### A8 🔴 Export CSV ignores the filters on screen
- **Where:** `contributors/page.tsx:74,79`, `contributors/export/route.ts:15-23`.
- **Problem:** Filtering to "Overdue" and clicking Export downloads everyone.
- **Action (S):** Pass `q` and `status` through. Name the file `kiranam-contributors-overdue-2026-10-06.csv`. Label the button "Export 42 rows" and make it ghost/secondary.

### A9 🟠 Lists aren't paginated or counted; Pagination only says "Page N"
- **Where:** `campaigns/page.tsx:111-119`, `events/page.tsx:102-110`, `contributors/page.tsx:92-123` (filters status client-side after loading everyone), `volunteers/page.tsx:15-25`, `contributors/[id]/page.tsx:37-41`; `components/Pagination.tsx:17`.
- **Action (M):** Paginate on the server with `count`. Show "1–25 of 340", use secondary-button Prev/Next (not pill-tab styling) and `aria-disabled`. Show a record count next to each H1.

### A10 🟠 No column sorting; Upcoming events are listed furthest-first
- **Where:** every `<th>`; `events/page.tsx:105`.
- **Action (M):** Sortable header buttons synced to `?sort=` with `aria-sort`. Sort Upcoming in ascending date order.

### A11 🟠 Each table opens a row differently
- **Where:** Campaigns/Events open only via a pencil icon (`campaigns/page.tsx:150,172`); Contributors/Volunteers open a name → quick view → "View full details"; pending applicants use a whole-row click; contribution and assigned-contributor names aren't linked (`contributions/page.tsx:172`, `volunteers/[id]/page.tsx:143`).
- **Action (M):** One convention: the primary cell links to the detail page, with secondary actions in a "⋯" menu. If quick view stays, give it its own icon.

### A12 🟠 Raw status values and inconsistent status words
- **Where:** The tab says "Ongoing", the badge says `active`, and the edit form says "Active" (`campaigns/page.tsx:50,151`, `[id]/edit/page.tsx:63`); `success`/`failed` badges; lowercase `overdue` (`volunteers/[id]/page.tsx:147`).
- **Action (S):** Use `StatusBadge` (F10) and pick one word per status.

### A13 🟠 Recording an offline payment works two different ways
- **Where:** `ManualContributionButton.tsx` ("Record Manual Contribution", a modal with a hand-rolled picker that swallows fetch errors) against `contributors/[id]/page.tsx:131-136` + `OfflinePaymentForm.tsx` ("Record Offline Payment", a card that is always open *above* the history table).
- **Action (M):** One `RecordPaymentDialog`, with the contributor preselected on the detail page and opened from a "Record payment" button in the History header. Add an error and Retry state when contributors fail to load.

### A14 🟠 Person pickers aren't real comboboxes
- **Where:** `components/PersonCombobox.tsx:52,67-111`, `ManualContributionButton.tsx:120-146`, `Form.tsx:16` (blocks Enter).
- **Problem:** No ARIA roles and no arrow keys or Enter. Results are silently capped at 8. Typing clears the selection, and there's no message when nothing matches.
- **Action (M):** Rebuild on shadcn `Command`/Popover (cmdk). Add a "Showing 8 of 120, keep typing" hint and a no-results row.

### A15 🟠 Empty states don't account for filters
- **Where:** `events/page.tsx:115` ("No events yet — create your first event above" even when searching), `campaigns/page.tsx:124-128`.
- **Action (S):** Copy the Contributors pattern: "No events match 'x'" plus "Clear filters". Put the create CTA inside the empty state.

### A16 🟠 Dashboard filters overwrite each other; three different time controls
- **Where:** `(admin)/page.tsx:264,273,292` drops `cgRange`/`cgFrom`/`cgTo`; Volunteer Growth has no control; the arrow links have only a `title`.
- **Action (M):** One page-level period control that drives every time-series card (or a shared `PeriodControl` that keeps other params). Add `aria-label`s.

### A17 🟠 Dashboard KPIs aren't actionable
- **Where:** `(admin)/page.tsx:231-237,67,120-123,300`, `StatCard.tsx:26-29`.
- **Problem:**
  - Only all-time counts, with no change against last month.
  - No "Overdue" or "Pending applications" count.
  - The status donut doesn't link to anything.
  - Campaign progress includes archived and completed campaigns and shows % only.
  - The empty state can never appear.
- **Action (M):**
  - Add these cards: "Raised this month (Δ)", "Overdue contributors →", "Pending applications →".
  - Make donut segments clickable.
  - Show active campaigns only, as "₹X of ₹Y".

### A18 🟠 Charts use status colours for data series and include unnecessary toggles
- **Where:** `VolunteerGrowthChart.tsx:9` (success green), `ContributorGrowthChart.tsx:9` (warning mustard), `ContributionsChart.tsx:10` (red); `CampaignProgressChart.tsx:33-34` (names cut off at 13 characters); `ChartTypeToggle.tsx` (line/bar toggle, ~27 px targets).
- **Action (S):** Use one neutral or brand series colour. Widen the axis or label above the bars. Remove `ChartTypeToggle`. Use compact ₹ ticks (₹1.2L).

### A19 🟠 Campaign/event edit page structure
- **Where:** `campaigns/[id]/edit/page.tsx:34,41,80-125` (same structure on events).
- **Problem:**
  - The H1 doesn't show the campaign name.
  - The gallery is split: add inside the form, delete below Save.
  - "Mark as fully raised" floats between them.
  - There's no way to remove the cover image, and no unsaved-changes guard.
- **Action (M):** Use "Edit · {title}" with a status badge. Put one Media group with per-image remove buttons. Move "Mark as fully raised" into a Funding group. Add F7's unsaved-changes guard.

### A20 🟠 Two filled primary buttons in every list toolbar
- **Where:** `AddNewPanel.tsx:103-106`; the "Search" `buttonPrimary` on 4 pages; "Export CSV" on Contributors.
- **Action (S):** Drop the Search button (F2). Keep exactly one primary button per page header.

### A21 🟠 Search state is hidden, especially on mobile
- **Where:** search forms on 4 list pages; tab hrefs keep `q`; `MobileToolbar.tsx:33-38` only highlights while the panel is open.
- **Action (S):** Show a "Results for 'ravi' · 4 ✕" chip. Put a dot or count badge on the mobile filter and search icons when they're active.

### A22 🟠 Pending applications are hidden behind the default tab
- **Where:** `volunteers/page.tsx:79-98`.
- **Action (S):** Label the tab "Pending (3)" and add a matching sidebar badge. Consider opening on Pending when the count is above 0.

### A23 🟠 Mobile navigation drawer accessibility
- **Where:** `AdminShell.tsx:64-107`, `SidebarNav.tsx:43-58`.
- **Problem:** Links in the closed drawer stay tabbable, focus isn't moved into or out of the drawer, and the active link has no `aria-current`.
- **Action (S):** Add `inert` when closed, manage focus on open and close, and add `aria-current="page"`. The same fixes apply to the comm-center drawer (`whatsapp/layout/sidebar.tsx:170-191`).

### A24 🟠 Trash icon used for "Unassign"; badges that look clickable but aren't
- **Where:** `volunteers/[id]/page.tsx:152`, `contributors/[id]/page.tsx:105`, `volunteers/[id]/page.tsx:113-130`.
- **Action (S):** Use a `UserMinus` icon with a visible "Unassign" label. Make the status chips filter the list, or style them as plain text. Rename "Monthly Portfolio Value" to "Monthly commitments".

### A25 ⚪ Cards nested in cards, and duplicate titles in create modals
- **Where:** `CreateCampaignForm.tsx:29`, `CreateEventForm.tsx:29`, `RegisterContributorForm.tsx:119`, `RegisterVolunteerForm.tsx:113` inside `Modal.tsx:38`.
- **Action (S):** Forms render without their own frame; the modal or page provides it.

### A26 ⚪ Table details
- **Where:** `lib/ui.ts:29-34`; amounts in `text-kiranam-muted`; empty `<th>` (`campaigns/page.tsx:136`, `events/page.tsx:124`).
- **Action (S):** Right-align amounts in ink. Add an sr-only "Actions" header. Make headers sticky (per DESIGN.md).

### A27 ⚪ Touch targets under 44 px
- **Where:** 36 px row icons (`campaigns/page.tsx:176-215`, `events/page.tsx:154,166`), dashboard arrows, ~32 px pills.
- **Action (S):** Use `pointer-coarse:` 44 px hit areas. On mobile, put row actions in a "⋯" menu.

### A28 ⚪ Inconsistent copy and casing
- **Where:** "Record Manual Contribution" / "Record Contribution" / "Record Offline Payment"; the column header "Label"; the unexplained "KK Number"; Title Case and sentence case mixed.
- **Action (S):** Write a glossary ("Offline payment", "For: campaign/general"). Use sentence case everywhere. Add a tooltip explaining KK number.

### A29 ⚪ Page headers and DESIGN.md have drifted apart
- **Where:** hand-built H1s on edit and detail pages; Volunteers has no bell or `MobileToolbar`; the font is Urbanist although DESIGN.md says Inter; `rounded-lg` cards against a spec of `rounded-xl`; raw input class strings.
- **Action (S):** Give `PageHeading` `backHref`, `meta` and `badge` props and use it everywhere. Then either update DESIGN.md or the tokens so they match.

---

# Part 3 — Settings, logs, notifications, auth, legal

### S1 🔴 Logs page redesign (the screenshot)
- **Where:** `components/LogsFilters.tsx:41-66`, `settings/logs/page.tsx:30-40,72-75,110-142`, `logs/loading.tsx:13-16`.
- **Problem:**
  - Beyond F1: no labels, and "entity type" is jargon.
  - No search, no date range, no active-filter state, no reset.
  - The skeleton draws two small pills, so the layout jumps when the page loads.
  - No pending feedback when a filter changes.
- **Action (M):** One toolbar row:
  - `[🔍 Search actions…] [📅 Last 30 days ▾] [Area: Any ▾] [Admin: Anyone ▾] ··· [Export CSV]`
  - Second row only when filters are active: `Area: Campaigns ✕ · Admin: Asha ✕ · Clear all · 42 actions`
  - "Area" uses plain-language groups: People · Money · Campaigns & Events · Communications · Admin access & settings.
  - "Admin" is a searchable combobox with a "Former admins" group.

### S2 🔴 Log filter categories are wrong
- **Where:** `settings/logs/page.tsx:30-40`; `contributions` and `app_settings` are logged (`contributors/actions.ts:311`, `settings/actions.ts:107`) but can't be filtered; `profiles` is labelled "Admin Access" but also holds contributor and volunteer registrations.
- **Action (S):** Filter on action groups, using one shared action→area map so new log types can't go missing.

### S3 🔴 Log columns are mislabelled and entries don't say which record changed
- **Where:** `settings/logs/page.tsx:110-124`, `lib/auditDescriptions.ts:11-53`.
- **Problem:**
  - The "Action" column shows a raw table name.
  - Descriptions like "Deleted an event." name no record.
  - About 10 actions fall back to "Register contributor." with no name.
  - `approveApplication` (`volunteers/actions.ts:256`) never writes a log entry at all.
- **Action (M):**
  - Columns: **When · Who · What happened · Area**.
  - Record the display name and amount in `details` when the action happens, and render "Asha **deleted** campaign *Onam Kit Drive*", linked to the record if it still exists.
  - For updates, store before/after values and show them in a row drawer.
  - Add the missing approval log entry.

### S4 🔴 Admin filter only lists current admins
- **Where:** `settings/logs/page.tsx:72-75`.
- **Problem:** You can't filter to someone you just revoked.
- **Action (S):** Build the list from the distinct `admin_id`s in the log, with a "Former admins" group.

### S5 🔴 Sidebar "Notifications" sends; header-bell "Notifications" reads
- **Where:** `SidebarNav.tsx:26`, `NotificationBell.tsx:21`, `notifications/page.tsx:71`, `my-notifications/page.tsx:19`.
- **Problem:** The same word and icon mean "push a message to every donor" and "read my inbox".
- **Action (S):** Rename the sidebar item **Announcements** (megaphone icon) with the title "Send announcement". Use the bell only for the inbox.

### S6 🔴 Announcement composer: form stays filled after sending, partial failures, weak confirmation
- **Where:** `notifications/NotificationsForm.tsx:32-71`, `notifications/actions.ts:34-49`, `notifications/page.tsx:72`.
- **Problem:**
  - After a successful send the form stays filled and open, inviting a duplicate send.
  - Errors show twice (toast and inline).
  - The send is one RPC per recipient through `Promise.all`, so a single failure shows as a total failure and retrying double-sends.
  - No labels, no character counter, no preview.
  - The audience silently defaults to everyone, and the confirm says "everyone in the selected audience" without a number.
- **Action (M):**
  - Reset and collapse the form on success and highlight the new history row.
  - Use one bulk RPC, or report "Sent to 241 of 248 · Retry failed".
  - Add labelled fields with counters (title about 50, body about 150) and a lock-screen preview.
  - Make audience a required segmented control with counts.
  - Confirm with *Send "Monthly update" to **248 contributors**? This can't be unsent.*
  - Label the button "Send to 248".

### S7 🔴 Sent History is probably split into per-recipient rows with the wrong audience (check against live data)
- **Where:** `notifications/page.tsx:29-58,109,118-136`.
- **Problem:**
  - Rows are grouped by exact `created_at`, but each RPC call gets its own timestamp.
  - `profiles?.[0]?.role` treats a many-to-one embed as an array.
  - `limit(500)` on recipient rows.
  - Messages are truncated with no way to expand them.
- **Action (M):** Add a `broadcasts` table and a `broadcast_id`. Store the audience at send time. Paginate. Make rows expandable, and show the read rate as "25% (3 of 12)".

### S8 🔴 Invite says "sent" when the email failed
- **Where:** `settings/actions.ts:72-83`.
- **Action (S):** Show a warning state, "Invite created but email failed", with a **Copy signup link** button. Add an "Email not delivered" badge in the invites table.

### S9 🔴 Auth: no confirmation messages and no return to the original page
- **Where:** `reset-password/actions.ts:61`, `lib/dal.ts:22,32`, `signup/actions.ts:42`, `login/actions.ts:93`.
- **Problem:** `?reset=success`, `?signup=success` and `?error=not_admin` are ignored. A session timeout loses the page you were on.
- **Action (S):** Show a banner on login for each case. Carry a validated, same-origin `?next=` through to after login. Prefill the email after signup.

### S10 🟠 Raw Supabase errors and account-enumeration copy
- **Where:** `login/actions.ts:73-85`, `signup/actions.ts:23-36`, `reset-password/actions.ts:57`.
- **Action (S):** Pass errors through `friendlyErrorMessage`. Use neutral copy for not-invited and not-admin cases.

### S11 🟠 Password rules: 6 characters on signup, 8 on reset, shown only after an error
- **Where:** `signup/page.tsx:55`, `reset-password/page.tsx:87,109`, `actions.ts:35`.
- **Action (S):** One policy (8+, ideally 10+ for admins), shown up front as hint text with a live check, and enforced on the server.

### S12 🟠 Password eye toggle is unlabelled and 32 px; duplicated 3 times
- **Where:** `login/page.tsx:61-67`, `signup/page.tsx:58-64`, `reset-password/page.tsx:91-97`.
- **Action (S):** A shared `PasswordInput` with `aria-label`, `aria-pressed` and a 40 px target.

### S13 🟠 Auth pages lead nowhere
- **Where:** `reset-password/page.tsx:61-68` (the "request a new one" text isn't a link), `auth/error/page.tsx:20-24`, `auth/verifying/page.tsx:22-24,56-72` (a fake 700 ms spinner, and nothing happens if `next` is missing).
- **Action (S):** Add real buttons and links. Remove the fake delay. Always show a fallback action.

### S14 🟠 Auth pages use an off-brand alarm-red gradient, copied into 7 files
- **Where:** `login`, `signup`, `forgot-password`, `reset-password`, `auth/error`, `auth/success`, `auth/verifying` (lines ~10-23 of each); `#22A559` hard-coded; `rounded-full` and `rounded-lg` buttons mixed.
- **Action (S):** One `AuthShell` (logo from `/brand`, token background, `buttonPrimary`).

### S15 🟠 Settings: invites and admins split across tabs
- **Where:** `settings/page.tsx:41-55,88-146`, `admin-users/page.tsx`.
- **Action (M):** Add a **Team** tab with Pending invites above Active admins, plus a "Resend" row action. Leave General for org settings (KK numbers), each in its own titled card. Add a shared `settings/layout.tsx` so the tabs don't jump between pages.

### S16 🟠 Admin list: your own row isn't marked, and icon-only revoke has no tooltip
- **Where:** `admin-users/page.tsx:62-83`, `settings/page.tsx:127-137`.
- **Action (S):** Add a "You" badge and a disabled action with the tooltip "You can't remove yourself". Use a text button, "Remove access".

### S17 🟠 Inbox notifications lead nowhere and show unread only by colour
- **Where:** `my-notifications/page.tsx:43,81-96`.
- **Problem:** `deep_link` is fetched but never used. Unread is shown only by tint. "Mark read" is a 16 px target. There's no pending state. The list is capped at 100.
- **Action (S/M):** Rows link to `deep_link` and mark themselves read. Bold unread titles with an sr-only "Unread" label. Group by day. Use `PageHeading` with the actions in its slot.

### S18 🟠 Legal pages: no table of contents, anchors or cross-links; weak headings
- **Where:** `legal/privacy`, `legal/terms`, `legal/data-deletion/page.tsx:57-59` ("§6" isn't a link).
- **Action (S):** Add section `id`s, a TOC (sticky at `lg`), h2 at 18–20 px, and a shared `LegalLayout` with logo and footer links.

### S19 ⚪ Notification bell badge is 9 px and the bell is filled brand red
- **Where:** `NotificationBell.tsx:23,27`.
- **Action (S):** Use a ghost icon button and an 11 px+ badge in the danger colour.

### S20 ⚪ KK auto-assign is a bare checkbox; the coverage check shows a toast and a modal
- **Where:** `KkNumberSettings.tsx:57-70`, `KkCoverageModal.tsx:74-86`.
- **Action (S):** Use a switch with `aria-describedby`. Drop the toast and put the count in the modal header instead. Add per-row `aria-label`s.

### S21 ⚪ Login offers "Sign up" on an invite-only tool, and autocomplete is missing
- **Where:** `login/page.tsx:78-83`, `signup/page.tsx:36`, `forgot-password/page.tsx:29-33`.
- **Action (S):** "Got an invite? Create your account". Add `autoComplete="name"`. Add "Check spam · link expires in 1 h". Give each route its own `metadata.title`.

### S22 ⚪ Join page
- **Where:** `join/JoinRedirect.tsx:8,74-89`.
- **Action (S):** After about 1.5 s, switch to "Get the Kiranam app" with store badges. Add the logo. Replace the TODO iOS URL.

### S23 ⚪ "Last updated" text on legal pages fails contrast
- **Where:** `legal/*/page.tsx:14` (`text-kiranam-ink/50`).
- **Action (S):** Use `text-kiranam-muted` and `<time dateTime>`.

---

# Part 4 — WhatsApp: inbox, contacts, dashboard, shell

### W1 🔴 The composer draft and attachment follow you into the next conversation
- **Where:** `inbox/message-composer.tsx:146,160`; `message-thread.tsx:1155` renders `<MessageComposer>` with no `key`.
- **Problem:** Text or a photo staged for donor A is still in the composer on donor B. One press of Enter sends it to the wrong person.
- **Action (S → M):** Add `key={conversation.id}` now. Later, keep a draft per conversation (a Map or localStorage).

### W2 🔴 The "Assign" menu lists every donor and volunteer, not just staff
- **Where:** `message-thread.tsx:208-226` (`profiles.select("*")` with no filter; the code comment's assumption about access rules is wrong for admins).
- **Action (S):** Filter to members of the account. Add search, and put "Assign to me" at the top.

### W3 🔴 No Mine / Unassigned / All views, and rows don't show who owns them
- **Where:** `conversation-list.tsx:58-64,433-507`.
- **Action (M):** Add a segmented control with counts above the list, and an assignee avatar on each row. Status becomes a secondary filter.

### W4 🔴 Inbox filter: an unlabelled "All ▾" that mixes two dimensions and only partly resets
- **Where:** `conversation-list.tsx:220,240-264,383-388,404-407`.
- **Problem:** "Clear all" doesn't reset status or search. One empty state is used for both "empty" and "filtered out".
- **Action (S):** A "Status: Open ✕" chip and a separate Unread toggle. Make Clear all reset everything. Add an empty state that offers "Clear filters".

### W5 🔴 New messages don't move the conversation to the top of the list
- **Where:** `inbox/page.tsx:242-256,309-319`; `conversation-list.tsx:161-191` never sorts.
- **Action (S):** Sort by `last_message_at` descending.

### W6 🔴 You can't see when an outbound message failed
- **Where:** `message-bubble.tsx:33-48,290`; a failure only shows a toast (`message-thread.tsx:484-486`).
- **Problem:** A red ✕ on a red bubble is invisible, and there's no retry.
- **Action (M):** Show a row under the bubble with "⚠ Not delivered · reason · **Retry**". Give each status tick an `aria-label` or title.

### W7 🔴 The 24-hour reply window: hidden on mobile and never ticks down
- **Where:** `message-thread.tsx:229-253,908-917`.
- **Action (S):** Recompute every minute. Always show a chip: "Free reply · 5h left" (amber under 2 h) or "Template only". Clicking the expired chip opens the template picker. Also disable AI drafts once the window has expired (`message-composer.tsx:712-727`).

### W8 🔴 WhatsApp consent / opt-out is invisible everywhere
- **Where:** `types/whatsapp/index.ts:111-115` defines `whatsapp_consent`, but it has no UI. Missing from the contacts table, the contact sheet and the inbox sidebar.
- **Action (M):** Add an "Opted out" text badge, a Consent column and filter, and a warning before sending a template to an opted-out contact.

### W9 🔴 The dashboard's "New Deal" quick action goes nowhere
- **Where:** `dashboard/quick-actions.tsx:223-224` → `/whatsapp/pipelines`, which redirects back to the dashboard.
- **Action (S):** Replace with Open inbox · New broadcast · Add contact (opening the form).

### W10 🟠 The thread jumps to the bottom on every update; no "new messages" pill; full history loads at once
- **Where:** `message-thread.tsx:283-287,439-445`.
- **Action (M):** Auto-scroll only when you're already near the bottom; otherwise show a "↓ 2 new" pill. Load the last 50 messages and page older ones in as you scroll up.

### W11 🟠 Status changes ignore errors
- **Where:** `message-thread.tsx:623-636`.
- **Action (S):** Roll back and show a toast on error. Consider a "Close & next" action.

### W12 🟠 Media messages show "No messages yet" in the list preview, and there's no "You:" prefix
- **Where:** `inbox/page.tsx:247`, `conversation-list.tsx:487-489`.
- **Action (S):** Show "📷 Photo" / "🎤 Voice note · 0:12", and prefix outbound previews with "You:".

### W13 🟠 Unread rows don't stand out; timestamps are long; status is a colour-only dot
- **Where:** `conversation-list.tsx:39-43,447-502`.
- **Action (S):** Bold unread rows. Use compact times ("2m", "14:05", "Yesterday"). Use text pills for pending and closed.

### W14 🟠 Contact panel: hidden on mobile, read-only tags, a leftover "Deals" section, no link back to Kiranam
- **Where:** `inbox/page.tsx:632-636`, `contact-sidebar.tsx:112-116,186-280`.
- **Action (M):** Replace Deals with Kiranam context: role, monthly commitment, last contribution, and an "Open in admin" link. Make tags editable inline. On mobile, open the panel as a sheet.

### W15 🟠 Composer: unnamed icon buttons, cramped on mobile, Enter always sends
- **Where:** `message-composer.tsx:215-247,329-331,634-773`; `ui/gated-button.tsx:83-91` (the title is on the wrapper span).
- **Action (S–M):**
  - Put a "+" menu on narrow screens and add `aria-label`s.
  - On touch devices, Enter adds a newline.
  - Grow the composer to about 8 lines and add a counter above 3,500 characters.
  - Remove the permanent AI hint.
  - Name quick replies inline instead of via `window.prompt`.

### W16 🟠 The template picker shows Meta jargon
- **Where:** `template-picker.tsx:205-295`.
- **Action (M):** Show readable names, a category pill with a cost hint, and search. Label variables with the surrounding sentence, and prefill `{{1}}` with the contact's name.

### W17 🟠 Contacts: only bulk delete, search runs on every keystroke, rows can't be reached by keyboard
- **Where:** `contacts/page.tsx:127,388-395,500-526,589-593,647-725`.
- **Action (M):** Bulk bar: Add tag · Remove tag · Send broadcast · Export · Delete. Debounce search. Make the name cell a button. Add `aria-label`s.

### W18 🟠 Deleting a contact synced from Kiranam gives no warning
- **Where:** `contacts/page.tsx:250-313`.
- **Action (S):** Add a "Synced from Kiranam" badge, explain what deleting does, and suggest "Mark opted-out" instead.

### W19 🟠 Contact sheet: the Name field is labelled "Company", no "Open chat", mixed save behaviour
- **Where:** `contact-detail-view.tsx:278,433-489,522-625`.
- **Action (S):** Fix the label key. Add an **Open chat** button. Remove Deals. Make note delete always visible. Use a proper confirm dialog.

### W20 🟠 Contacts header overflows on mobile; dates in en-US format; tag contrast not guaranteed
- **Where:** `contacts/page.tsx:350-380,552-560,617-643`.
- **Action (S):** Wrap the header and move extra actions into "⋯". Use `en-IN` dates. Compute tag text colour for contrast. Use a skeleton table.

### W21 🟠 Dashboard KPIs mix meanings, and "up" is drawn in red
- **Where:** `whatsapp/dashboard/page.tsx:126-137`, `queries.ts:80-86`, `metric-card.tsx:295-300`.
- **Problem:** The "Active conversations" count shows a delta for *new* conversations.
- **Action (M):** Split into "Open conversations" and "New today (vs yesterday)". Show deltas in a neutral colour with an arrow. Add Unassigned, Awaiting reply > 1 h, and Median first response.

### W22 🟠 Dashboard: four different time windows, and a 7/30/90 toggle that only affects one chart
- **Where:** `conversations-chart.tsx:58-74`, `usage-card.tsx:45`.
- **Action (M):** One page-level period control, or label each card's period explicitly.

### W23 🟠 Response-time chart shows days with no data as "0 min", in off-brand violet
- **Where:** `response-time-chart.tsx:42-99`, `conversations-chart.tsx:92-93,293-299`.
- **Action (S):** Show gaps for days with no data. Draw a target reference line. Use theme tokens for colours.

### W24 🟠 Usage/spend card: hard-coded English, inconsistent title, billing jargon
- **Where:** `usage-card.tsx:24-101`.
- **Action (S):** Title it "WhatsApp spend · last 7 days" with cost as the main figure. Add a "View in Meta billing ↗" link. Localise it.

### W25 🟠 WhatsApp "Notifications" is a separate page with no bell and no new-message alerts
- **Where:** `whatsapp/notifications/page.tsx`, `header.tsx`, `app/whatsapp/layout.tsx:16-19`.
- **Action (M):** Replace the page with a bell popover named "Alerts". Show "(3) Inbox" in the tab title. Offer opt-in sound or desktop notifications for new messages.

### W26 🟠 Mobile inbox: `100vh` hides the composer, and Back leaves the inbox
- **Where:** `inbox/page.tsx:485,500,564`.
- **Action (S):** Use `dvh`. Use `router.push` when opening a thread on mobile.

### W27 🟠 Bubbles: a wall of red, an invisible "Template" chip, no sender name
- **Where:** `message-bubble.tsx:203-206,274,290`.
- **Action (S):** Use a soft tint for outbound bubbles. Fix the chip colour. Show the teammate's first name on outbound messages.

### W28 🟠 Inconsistent names: "Comm Center", "WhatsApp", and "AI Agents" against the human "Agent" role
- **Where:** `sidebar.tsx:60-66,197-202`, `header.tsx:73-78`, `agents/page.tsx:43`.
- **Action (S):** Use "WhatsApp" everywhere. Rename the AI page "AI Assistant".

### W29 ⚪ Comm-center drawer accessibility, and a pulsing unread dot
- **Where:** `whatsapp/layout/sidebar.tsx:170-262`.
- **Action (S):** Add `inert`, a focus trap, `aria-current`, a numeric badge, and `motion-safe:` on the pulse.

### W30 ⚪ "Not connected" banner has no link; realtime disconnects aren't shown
- **Where:** `inbox/page.tsx:343,567-574`.
- **Action (S):** Add a "Connect WhatsApp →" link and a "Reconnecting…" chip.

### W31 ⚪ The AI playground puts the customer on the opposite side from the inbox
- **Where:** `agents/ai-playground.tsx:120-135`, `agents/page.tsx:52`, `ai-usage.tsx:149-160`.
- **Action (S):** Put the customer on the left in grey. Show skeleton tabs while loading. Show an estimated cost instead of a token count.

### W32 ⚪ Plural strings always read as singular
- **Where:** `messages/en.json:425-459` (i18next `_plural` keys under next-intl).
- **Action (S):** Convert to ICU `{count, plural, …}`.

### W33 ⚪ Leftovers from the original CRM template
- **Where:** "Deals" in the sidebar, sheet, dashboard copy (`en.json:69`); "Company" filters; an empty `pipelines/` folder.
- **Action (S):** Remove them.

---

# Part 5 — WhatsApp: broadcasts, templates, automations, flows, settings

### O1 🔴 Broadcasts are sent from the browser tab, so leaving the page stops them halfway
- **Where:** `hooks/whatsapp/use-broadcast-sending.ts:500-590`, `step4-schedule-send.tsx:148-164`; no `beforeunload` anywhere in broadcasts.
- **Problem:** Closing the tab, refreshing or navigating away leaves the remaining recipients `pending` forever. Progress jumps from 30% to 90%.
- **Action:**
  - **Now (S):** Add a `beforeunload` and route guard, plus "Sending 240 of 1,200 · keep this tab open".
  - **Proper (L):** Send from a server-side queue or Edge Function, then go to the detail page and poll there.

### O2 🔴 The recipient count before sending is wrong, sometimes 0
- **Where:** `step4-schedule-send.tsx:54-84,206`; `step2-select-audience.tsx:130-210`; compare the real send at `use-broadcast-sending.ts:205-235`.
- **Problem:** Steps 2 and 4 each count differently, and neither excludes "Paused" or non-consenting contacts the way the real send does.
- **Action (M):** One shared `resolveAudience()` used by step 2, step 4 and the send itself. Show the breakdown: "1,240 matched − 32 excluded − 18 paused − 7 no consent = **1,183 will receive**", with "View list".

### O3 🔴 "Upload CSV" audience has no upload field
- **Where:** `step2-select-audience.tsx:81-86,241-249`; the CSV strings exist but are unused.
- **Action:** Remove the option (S), or build it: dropzone, validation, "N valid / M rejected", preview (M).

### O4 🔴 The final send review is too thin for something irreversible
- **Where:** `step4-schedule-send.tsx:116-145,190-233`.
- **Action (M):** Review as a checklist:
  1. A message preview.
  2. The audience with tag names and the verified count.
  3. An **estimated cost** (count × category rate).
  4. Now or scheduled.
  
  The confirm button reads "Send to 1,183".

### O5 🔴 Admins only see templates they created themselves
- **Where:** `template-manager.tsx:195-202` (`.eq('user_id', userId)`), against the broadcast picker, which shows the whole account.
- **Action (S):** Filter by `account_id`. Add "Created by" to each card.

### O6 🔴 "Reset WhatsApp config" is guarded only by a browser `confirm()` and sits next to Save
- **Where:** `whatsapp-config.tsx:346,729-748`.
- **Problem:** It wipes the config, which stops the inbox and broadcasts and **breaks donor-app OTP login**.
- **Action (S–M):** A Danger-zone card, a consequence list, and type-to-confirm (F6).

### O7 🔴 Flows: Save on an active flow goes live immediately, and Activate runs even if Save failed
- **Where:** `flows/flow-editor-state.tsx:331-376`, `flows/header.tsx:118-159`.
- **Action:**
  - (S) `save()` returns success, and activation stops if it fails.
  - (M) On active flows, label the button "Publish changes", confirm it, and add "Discard changes".
  - (L) Versioned draft and published states.

### O8 🔴 Builders lose work without warning
- **Where:** `automation-builder.tsx:722-729`, `template-manager.tsx:636-644`, `flow-editor-state.tsx:293-309`.
- **Action (M):** F7's `useUnsavedChangesGuard`. The template dialog shouldn't close on an outside click while it has unsaved changes.

### O9 🟠 No list page has search, status tabs or pagination
- **Where:** `broadcasts/page.tsx:223-291`, `template-manager.tsx:522-633`, `automations/page.tsx:216-231`, `flows/page.tsx:236-247`, logs `.limit(100)`, `broadcasts/[id]/page.tsx:176-183` (renders every recipient).
- **Action (M):** FilterBar (F2) plus status tabs with counts, e.g. Templates: All · Approved 12 · Pending 3 · Rejected 2. Paginate.

### O10 🟠 Custom-field audience: three unlabelled controls (the pattern from the screenshot)
- **Where:** `step2-select-audience.tsx:354-389`; repeated in `automation-builder.tsx` (10+ places).
- **Action (S):** A sentence-style rule, "Contacts where [Field ▾] [is ▾] [value]", using the shared `Select`, with labels and "Remove rule".

### O11 🟠 The message preview doesn't look like WhatsApp
- **Where:** `step3-personalize.tsx:58-68,287-292,414-419`.
- **Problem:** Red text on a red bubble on dark green. Body only. A "John Doe, Acme Corp" sample. "Preview not available" appears above a preview.
- **Action (M):** One `TemplatePreview` (header, body, footer, buttons), based on `interactive-preview.tsx`. Reuse it in step 3, Review and the template editor, with "Previewing as: Anitha ▾".

### O12 🟠 Template editor: no live preview, no counters, no inline validation
- **Where:** `template-manager.tsx:665-1064`.
- **Action (M):** Two columns: the form beside `TemplatePreview`. Add `n/limit` counters, live validation of variables, name format and button order, and auto-format names into lowercase-with-underscores (Meta's required format).

### O13 🟠 Rejection reasons and quality scores are raw codes
- **Where:** `template-manager.tsx:546-576`.
- **Action (S):** Plain-language reasons with a suggested fix, and the raw code in "Details". Show "Quality: Low – Meta may pause sending".

### O14 🟠 Template categories aren't explained, and Authentication leads nowhere
- **Where:** `template-manager.tsx:56,658-709,1076`.
- **Action (S):** Radio cards with one line each on purpose, cost and approval speed. Show Authentication as disabled, with a link to Meta.

### O15 🟠 Broadcast drafts can't be reopened
- **Where:** `broadcasts/new/page.tsx:76-130`, `broadcasts/[id]/page.tsx:314-351`.
- **Action:** Remove "Save as Draft" (S), or store the full configuration and add "Continue editing" (M).

### O16 🟠 There's a "Scheduled" status but no way to schedule
- **Where:** `step4-schedule-send.tsx`, `broadcast-status.ts`.
- **Action (M–L):** "Send now / Schedule for…" with a date-time picker labelled **IST**. Needs O1's server queue.

### O17 🟠 Broadcast detail: raw, truncated failures, no retry, stats never refresh
- **Where:** `broadcasts/[id]/page.tsx:162-195,520-522`.
- **Action (M):** Group failures by reason in plain language. Add "Retry failed (40)". Poll while the broadcast is under 24 h old.

### O18 🟠 Broadcast list: rows can't be reached by keyboard, there's no Failed column, and "Date" means "created"
- **Where:** `broadcasts/page.tsx:242-285`, `[id]/page.tsx:283-290`.
- **Action (S):** Make the name a `<Link>`. Add a Failed column. Show the sent date. Label the back button.

### O19 🟠 The automation builder needs tag IDs, cron, JSON and `{{ }}` syntax
- **Where:** `automation-builder.tsx:873,1441-1455`; `en.json` placeholders.
- **Action (S–M):** `TagSelect` in conditions. A frequency/day/time picker (with timezone) instead of cron. An "Insert variable" menu. Put webhook settings under "Advanced".

### O20 🟠 Automation validation shows only the first error, as a toast with `steps[2]…`
- **Where:** `automation-builder.tsx:696-704`.
- **Action (M):** Live validation, error badges on step cards, and a validation panel like the one in flows.

### O21 🟠 Deleting steps or nodes is instant with no undo; the drag grip doesn't drag
- **Where:** `automation-builder.tsx:1113,1155-1162`, `flow-canvas.tsx:464-538`.
- **Action:** Remove the fake grip and add an undo toast (S). Add an undo/redo stack with Ctrl+Z (M).

### O22 🟠 Flows aren't in the navigation and overlap with Automations
- **Where:** `whatsapp/layout/sidebar.tsx:99-107`; keyword and first-message triggers exist in both.
- **Action (S–M):** Add Flows to the nav with an explainer ("Flows = guided conversations, Automations = background rules") and a warning about conflicting triggers, or remove the route.

### O23 🟠 Flow runs: "Ran for" shows time since the run ended, not how long it ran
- **Where:** `flows/[id]/runs/page.tsx:234-238,283`.
- **Action (S):** `formatDistance(started_at, ended_at)`.

### O24 🟠 Automation on/off state is unclear, and activating needs no confirmation
- **Where:** `automations/page.tsx:301-335`, `automation-builder.tsx:736-751`.
- **Action (S):** "Active" / "Paused" text badges. Make the switch's `aria-label` "Enable {name}". Confirm before activating. The save button label changes with the toggle.

### O25 🟠 System tags ("Paused", "Contributor", "Volunteer") can be deleted
- **Where:** `settings/tag-manager.tsx:186-262`; `use-broadcast-sending.ts:211-226` relies on "Paused".
- **Problem:** Deleting "Paused" quietly sends broadcasts to donors who paused.
- **Action (S):** Lock system tags (no delete or rename) with a tooltip explaining why.

### O26 🟠 Team role changes apply instantly
- **Where:** `settings/members-tab.tsx:428-447`.
- **Action (S):** Confirm downgrades and spell out what access is lost.

### O27 🟠 The "No templates" empty state points to Settings and says nothing about pending ones
- **Where:** `step1-choose-template.tsx:82-87`.
- **Action (S):** "No approved templates yet · 3 waiting on Meta", with a **Go to Templates** button. Add search to the picker.

### O28 ⚪ Inconsistent page headers (Templates has no h1)
- **Where:** `template-manager.tsx:491`, `flows/page.tsx:206`, `runs/page.tsx:190`.
- **Action (S):** `PageHeading` everywhere.

### O29 ⚪ Icon-only buttons have no names; tiny touch targets
- **Where:** `template-manager.tsx:1007-1015`, `interactive-builder.tsx:237,346,381`, `whatsapp-config.tsx:614-689`, `tag-manager.tsx:188-195`.
- **Action (S):** `aria-label`s and 32 px minimum (44 px on touch).

### O30 ⚪ Broadcast wizard steps: can't click back, no `aria-current`, name asked last, state lost on refresh
- **Where:** `broadcasts/new/page.tsx:143-180`, `step4-schedule-send.tsx:105-113`.
- **Action (S):** Make completed steps clickable. Ask for the name first, or default it to "{template} – {date}". Keep progress in sessionStorage.

### O31 ⚪ Hard-coded English and inconsistent names for the same thing
- **Where:** `flows/header.tsx`, `step2-4`, `trigger-meta.ts` ("New Message" against "New Message Received").
- **Action (S):** Move strings into `en.json` and use one name per concept. Swap the sales-CRM automation starters for Kiranam ones: thank-you, payment failed, event RSVP.

---

## Not UX, but found along the way

- **Uncommitted settings change:** the uncommitted `settings-sections.ts` diff removes `profile`/`security`, but `src/app/whatsapp/settings/page.tsx:68-69` still references them. TypeScript will likely flag the leftover keys. Fix this before committing.
- **Missing audit entry:** volunteer `approveApplication` doesn't write an audit-log entry (S3).
- **Unchecked suspicions:** the double toaster (F5) and Sent History grouping (S7) are inferred from code. Confirm both in the browser or with live data.

---

## Suggested order of work

1. **Week 1 (stop the bleeding):**
   - **Wrong recipient or count:** W1 composer key · W2 assign list · O2 audience count.
   - **Mass-send safety and setup:** O1 tab guard · O6 reset guard · O5 templates scope · O25 system tags · S6/S8 send and invite feedback.
   - **Foundations:** F1 `inputClass` · F9 IST dates.
2. **Week 2 (foundations):** F3/F4 tokens · F6 ConfirmDialog · F7 form/dialog pattern · F8 labels and focus.
3. **Week 3 (shared primitives):** F2 FilterBar (start with Logs (S1), Contributions (A1/A2) and the inbox (W3/W4)) · a DataTable with pagination and sorting (A9/A10) · StatusBadge (F10).
4. **Week 4 (bring the comm center into the system):** F5, then the outbound wizard (O4, O11, O12) and the inbox polish items.
