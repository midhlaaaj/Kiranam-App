# UX Audit — Progress Checklist

_Tracks the items in [UX_AUDIT.md](UX_AUDIT.md). Updated 2026-10-06._

- `[x]` Done
- `[~]` Partly done (what's left is noted)
- `[ ]` Not started

Every change has passed the TypeScript typecheck and ESLint on the files touched. **Nothing has been clicked through in a browser yet.**

**Totals:** 68 done · 29 partly done · 30 not started (127 items).

---

## Part 1 — Foundations

- [x] **F1** The full-width filter bug is fixed: width overrides now go through `cn()`, and there's a warning note in `lib/ui.ts`.
- [~] **F2** A shared filter bar exists in `components/filters/FilterBar.tsx`, with search, date range, dropdown pills, chips, Clear all, URL sync and a loading dim.
  - Used on: Activity log, Contributions, Volunteers search.
  - **Left:** Campaigns, Events, Contributors, dashboard filters.
- [~] **F3** Colours:
  - Done: deep brick brand colour (#89221a); danger is now its own red; new success, warning and info colours for the admin and WhatsApp (light and dark); all WhatsApp status badges use them.
  - **Left:** red money totals, red progress bars and chart colours on the admin dashboard and campaign pages.
- [x] **F4** Contrast fixes: muted text, success, warning, input borders, and placeholder text. Input borders are now 2.5:1 (WCAG asks for 3:1, which looks heavy).
- [x] **F5** WhatsApp now looks like part of the same product:
  - Opens in light mode; dark mode is opt-in.
  - A permanent "← Kiranam Admin" link.
  - One toaster, so no more duplicate toasts.
  - Controls are 36px tall.
  - Called "WhatsApp" everywhere; the duplicate account menu is gone.
- [x] **F6** Confirmations:
  - A shared `ConfirmDialog` with a list of consequences and type-to-confirm.
  - Destructive buttons are now solid red; confirmations are non-destructive by default; Approve and "Mark fully raised" no longer look dangerous.
  - Every browser `confirm()` in the WhatsApp area has been replaced.
- [~] **F7** Losing work:
  - Done: `useUnsavedChangesGuard` (covers tab close and in-app links), used in the template editor, automation builder and flow editor. The Account form keeps your input after a failed save.
  - **Left:** replace the custom `Modal`; convert the campaign and event edit pages; stop the sign-in forms clearing after an error.
- [~] **F8** Labels and focus:
  - Done: a neutral focus ring everywhere; labels on invite, KK, Announcements, Account, contact sheet and WhatsApp forms.
  - **Left:** admin create forms (campaign, event, payments).
- [~] **F9** Dates:
  - Done: India-time helpers in `lib/format.ts`, used on Activity log, Team, Announcements, Contributions and pending volunteers.
  - **Left:** other admin pages.
- [~] **F10** Plain language:
  - Done: log sentences, Meta error reasons, template names and languages, run and log labels.
  - **Left:** "wacrm" in invite text; status badges on Campaigns and Contributors.
- [~] **F11** Honest success and error messages:
  - Done: invites, Announcements, inbox status changes, WhatsApp dashboard, broadcasts.
  - **Left:** contributor and volunteer quick-view windows; the flows load error.

## Part 2 — Admin core

- [x] **A1** Contributions date presets: correct names, India time, an "All time" option, a validated custom range.
- [x] **A2** Contributions totals (received, payments, failed), search, and a campaign filter.
  - Also fixed: totals were silently capped at 1,000 rows.
- [ ] **A3** Contributor status ("Inactive" really means "autopay off"); Due/Overdue dates
- [x] **A4** Pending applications can be reviewed by keyboard; the row has a Review button and shows why they applied.
- [x] **A5** The review dialog no longer shows two red buttons: Approve is primary, Reject is secondary and asks for a reason.
- [ ] **A6** "Mark as past event" being overwritten; edit-form validation
- [ ] **A7** Assign/reassign feedback; "currently with…"
- [ ] **A8** Export CSV ignores the filters on screen
- [~] **A9** The Pagination component now shows "26–50 of 340".
  - Used on: Activity log, Contributions, Announcements.
  - **Left:** paginate the Campaigns, Events, Contributors and Volunteers lists.
- [ ] **A10** Column sorting
- [~] **A11** Contributions rows link to the contributor.
  - **Left:** one consistent way to open a row on every table.
- [~] **A12** Contributions shows Paid/Failed.
  - **Left:** campaign and volunteer status wording.
- [ ] **A13** One "Record payment" dialog
- [ ] **A14** Person picker as a proper combobox
- [ ] **A15** Empty states that know about filters (Campaigns, Events)
- [ ] **A16** Dashboard period controls
- [ ] **A17** Dashboard numbers you can act on
- [ ] **A18** Chart colours and toggles
- [ ] **A19** Campaign and event edit page layout
- [~] **A20** The Search button is gone from Volunteers.
  - **Left:** Campaigns, Events, Contributors.
- [~] **A21** Live search with a clear button on Volunteers.
  - **Left:** the other lists, and the mobile filter badge.
- [x] **A22** "Pending applications (3)" tab badge, plus a badge on Volunteers in the sidebar.
- [x] **A23** The mobile menu drawer: off-screen links are skipped by keyboard, focus is handled properly, and the current page is announced. Applies to both the admin and WhatsApp sidebars.
- [ ] **A24** Trash icon used for "Unassign"; badges that look clickable
- [ ] **A25** Cards nested inside cards in the create pop-ups
- [~] **A26** Amounts are right-aligned on Contributions, and action columns have hidden headers for screen readers on Team and Logs.
  - **Left:** sticky headers.
- [ ] **A27** Touch targets under 44px
- [ ] **A28** Inconsistent wording ("offline payment", button capitalisation)
- [ ] **A29** Page headers and DESIGN.md drifting apart

## Part 3 — Settings, logs, notifications, sign-in, legal

- [x] **S1** The Activity log was rebuilt:
  - Search, a date range, Area and By filters, chips, Export CSV.
  - Rows grouped by day in India time, with a matching loading skeleton.
- [x] **S2** Filter categories now come from one shared action map, so new log types can't silently go missing.
- [x] **S3** Logs say what happened in plain language, name the record, and link to it.
  - Older entries look up names when the page loads; new entries store the name.
  - (A claim in the audit was wrong: approvals were already logged.)
  - **Not done:** a before/after view of what changed.
- [x] **S4** The admin filter includes former admins.
- [x] **S5** The sidebar says "Announcements" (with a Send icon); the bell is now only for your own notifications.
- [x] **S6** Announcement composer:
  - Labels, character counters, live audience counts, a phone preview, a confirmation that names the exact number of people, and the form resets after sending.
  - Sends in batches, reports partial failures, and offers "Retry the ones that failed".
- [x] **S7** Sent history is rebuilt from the audit log: one row per send, read rate, expandable message, paged.
- [x] **S8** The invite warns when the email failed and gives you a link to copy.
- [ ] **S9** Sign-in confirmation banners, `?next=`, filling in the email after sign-up
- [ ] **S10** Friendly sign-in errors that don't reveal whether an account exists
- [ ] **S11** One password policy, shown up front
- [ ] **S12** A shared password field with a labelled show/hide button
- [ ] **S13** Sign-in error pages that lead nowhere
- [ ] **S14** A shared `AuthShell` (red gradient copied into 7 files)
- [x] **S15** Settings now has a shared heading and tabs:
  - General: KK numbers.
  - Account.
  - Team: invite, pending invites with Resend, admins.
  - Activity log.
- [x] **S16** Your own row shows "You"; "Remove access" is a text button.
- [ ] **S17** The admin's own notification inbox (links, unread styling)
- [ ] **S18** Legal pages: table of contents, anchors, layout
- [ ] **S19** Notification bell styling
- [x] **S20** KK settings: a proper switch, the result count in the window header instead of a duplicate pop-up message, and labelled inputs.
- [ ] **S21** "Sign up" link copy and `autocomplete` hints
- [ ] **S22** Join page
- [ ] **S23** Contrast of "Last updated" on legal pages

**Extras you asked for:**

- [x] The KK numbers list was redesigned: rows don't wrap, "KK" is pre-filled, errors show per row, there's search, and phone numbers are formatted.
- [x] The Account page: the password card is collapsed by default, a "Change photo" button, a "Saved" state, and input kept after a failed save. I also checked that these forms work.

## Part 4 — WhatsApp: inbox, contacts, dashboard, shell

- [x] **W1** Draft text and attachments no longer carry over into the next chat.
- [x] **W2** The Assign menu only lists your team, with you at the top.
- [x] **W3** Mine / Unassigned / All views with counts; each row shows who it's assigned to.
- [x] **W4** Status is a labelled filter; "Unread only" is separate; "Clear all" really clears everything; the empty state tells "nothing yet" apart from "nothing matches".
- [x] **W5** New activity moves a conversation to the top.
- [x] **W6** Failed messages show "Not delivered" with a Retry for text messages, and the ticks are labelled.
- [x] **W7** The 24-hour chip ticks every minute, shows on mobile, and opens templates once the window has closed. AI drafts are turned off after the window closes.
- [x] **W8** "Opted out" is shown in the contact panel, contacts list and contact sheet.
- [x] **W9** Quick actions: Open inbox, New broadcast, Add contact (opens the form directly), New automation.
- [x] **W10** The thread only scrolls to new messages when you're already at the bottom, with a "New messages" pill otherwise; messages load 50 at a time.
- [x] **W11** Failed status changes roll back and show an error.
- [~] **W12** Media messages show "📷 Photo" and similar in previews (live updates only).
  - **Left:** a "You:" prefix needs a database column.
- [x] **W13** Unread rows are bold, times are compact, and status is shown as text.
- [x] **W14** The contact panel shows Kiranam details (role, commitment, last gift, link to admin) instead of Deals; tags can be edited; it opens as a sheet on phones; failed note saves are reported.
- [~] **W15** Composer:
  - Done: buttons are named for screen readers; Enter adds a new line on touch devices; the box grows to 8 lines; a character counter; the hint line is gone; quick replies are named inline.
  - **Left:** an emoji picker; folding the buttons into a "+" menu on small screens.
- [x] **W16** Template picker: readable names, search, labels taken from the surrounding words, the first blank filled with the contact's name, a WhatsApp-style preview.
- [x] **W17** Contacts: debounced search; rows reachable by keyboard; bulk Add tag, Remove tag, Export and Delete.
- [x] **W18** Contacts synced from Kiranam show a badge and a warning before delete.
- [x] **W19** Contact sheet: the Name label is fixed, "Open chat" added, Deals tab removed, note delete always visible.
- [x] **W20** The header wraps on mobile, dates use Indian format, tag chips are neutral, and a loading skeleton.
- [~] **W21** Open conversations show the unassigned count, and new conversations have their own card.
  - **Left:** "Awaiting reply" and median first-response cards.
- [~] **W22** Left as is: the period toggle sits inside the chart's own card.
- [~] **W23** Days with no data now show a gap instead of "0 min", and the colours are neutral.
  - **Left:** a target line on the chart.
- [x] **W24** The spend card leads with the amount and has a "View billing" link.
- [~] **W25** Renamed "Alerts", and the unread count shows in the browser tab title.
  - **Left:** a bell pop-up, and sound or desktop alerts.
- [x] **W26** Phones: the correct screen height (`dvh`), and the Back gesture returns to the list.
- [x] **W27** Outbound messages use a soft tint, the template label is visible, and teammate names are shown.
- [x] **W28** Called "WhatsApp" everywhere; the AI page is called "AI Assistant".
- [x] **W29** Menu drawer: off-screen links skipped, `aria-current`, a number instead of a pulsing dot.
- [~] **W30** The "not connected" banner links to settings.
  - The "Reconnecting…" chip was dropped because it flashed on every page load.
- [~] **W31** The playground puts each side where the inbox does.
  - **Left:** a loading skeleton; cost instead of token counts.
- [x] **W32** ICU plurals in the contact import strings.
- [x] **W33** The empty pipelines folder is removed, and the leftover "Deals" sections and text are gone.

## Part 5 — WhatsApp: broadcasts, templates, automations, flows, settings

- [~] **O1** A guard against closing the tab or navigating away, plus "Sending X of Y".
  - **Left:** sending from the server.
- [x] **O2** One shared audience count with a breakdown.
  - Also fixed: sends stopped at 1,000 recipients.
  - Also fixed: contacts without a phone stayed "pending" forever.
- [x] **O3** CSV upload works: validation, valid/skipped counts, preview, Indian numbers accepted without +91.
- [x] **O4** The review step shows a preview, who receives it, an estimated cost from your last 30 days of spend, and a confirmation that names the number of people.
- [x] **O5** Templates show the whole account's templates, with "by {name}".
- [x] **O6** WhatsApp reset is in a Danger zone card, lists what breaks (including donor sign-in), and requires typing RESET.
- [~] **O7** Activation stops if the save failed; active flows say "Publish changes" and ask first.
  - **Left:** discard changes; keeping draft and live versions.
- [x] **O8** Unsaved-changes guard in all three editors (template, automation, flow).
- [~] **O9** Search and status tabs on Broadcasts and Templates.
  - **Left:** Automations, Flows, run/log paging.
- [~] **O10** Broadcast custom-field rule reads as a labelled sentence.
  - **Left:** the condition fields in the automation builder.
- [x] **O11** A shared WhatsApp-style `TemplatePreview`.
- [x] **O12** Template editor: two columns with a live preview, character counters, every rule checked live, names auto-formatted.
- [x] **O13** Rejection reasons in plain language, quality score explained.
- [x] **O14** Template categories shown as explained cards; Authentication links to Meta.
- [x] **O15** "Save as draft" removed, since drafts couldn't be reopened.
- [ ] **O16** Scheduling (needs a server-side send queue first)
- [x] **O17** Failures grouped by reason, "Retry failed", live refresh, full error shown on demand.
- [x] **O18** Broadcast list: name links, a Failed column, a "Sent" date, pagination.
- [~] **O19** The condition uses a tag picker, and the schedule hint is plain.
  - **Left:** a frequency picker instead of cron; an "Insert variable" menu.
- [x] **O20** Every automation problem is shown inline in plain words.
- [~] **O21** Automations: Undo after deleting a step; the fake drag handle is removed.
  - **Left:** undo on the flow canvas.
- [x] **O22** Flows is in the nav, and both pages explain Flows vs Automations.
- [x] **O23** "Ran for" now shows the real duration; logs and runs use plain language.
- [x] **O24** Active/Paused shown as text, a confirmation before switching on, a clear save button, the switch named after the automation.
- [x] **O25** System tags (Contributor, Volunteer, Paused) are locked.
- [x] **O26** Role downgrade confirmation was already in place; the role select now shows names.
- [x] **O27** The template step empty state shows the pending count and links to Templates.
- [~] **O28** Flows heading aligned.
  - **Left:** the visible heading on Templates is still a smaller one.
- [x] **O29** Icon buttons named (interactive builder, token toggle, copy webhook).
- [x] **O30** Steps can be clicked, `aria-current="step"`, a default broadcast name.
  - **Not done:** keeping your progress if the page is refreshed.
- [~] **O31** Charity-specific automation starters and new strings in `en.json`.
  - **Left:** remaining hard-coded English.

---

## Decisions & notes

- **Brand colour:** you chose deep brick for the admin, and the logo stays red.
- **WhatsApp theme:** the saved setting was reset, so everyone starts in light mode once. Dark mode is still in the toggle.
- **Other in-progress work:** the uncommitted Account tab and settings work were kept and built on. The Account page's own heading and tabs were removed, because the shared settings layout now provides them.
- **Not committed:** none of this has been committed.
