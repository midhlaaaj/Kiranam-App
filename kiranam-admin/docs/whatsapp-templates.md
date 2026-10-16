# WhatsApp templates

To add these, open the admin panel and go to **WhatsApp → Templates → New template**.

- **Language:** English (`en`) for all of them.
- **Name:** use each name exactly as written. The code looks templates up by name.
- **Variables:** `{{1}}`, `{{2}}`, … must be numbered in order. Meta reviews the sample values, so enter the samples shown.

---

## 1. `kiranam_payment_receipt`: payment receipt with PDF

**Sent:** after every successful payment (monthly Kiranam or campaign), whether paid in the app, through autopay, or added by an admin.

| Field | Value |
|---|---|
| Category | **Utility** |
| Header | **Document**. Upload a sample receipt PDF (≤16 MB), e.g. one downloaded from the app's receipt screen. |
| Footer | `Karunya Kiranam · An initiative of Health Care Foundation` |
| Buttons | none |

**Body**
```
Hi {{1}}, thank you for your contribution of ₹{{2}} towards {{3}} on {{4}}.
Receipt No: {{5}}
Your receipt is attached for your records. Your kindness helps families get their monthly groceries.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Contributor name | Anil |
| {{2}} | Amount | 500 |
| {{3}} | What it was for | Monthly Contribution |
| {{4}} | Payment date | 17 Oct 2026 |
| {{5}} | Receipt / transaction no. | KK-2026-00123 |

---

## 2. `kiranam_new_campaign`: new campaign announcement

**Sent:** when an admin creates a campaign with "Notify users" ticked.

| Field | Value |
|---|---|
| Category | **Marketing**. Meta treats announcements as marketing, and a Utility template with this content would be rejected or re-categorised. |
| Header | **Image**. Upload any campaign cover (JPEG/PNG ≤5 MB). Each message uses the real campaign's cover. |
| Footer | `An initiative of Health Care Foundation` |
| Button | **Visit website**, text `Open Kiranam`, URL `https://kiranam.online` |

**Body**
```
Hi {{1}}, a new campaign has started on Karunya Kiranam: *{{2}}*
{{3}}
Target: ₹{{4}}. Every contribution counts — open the app to support it.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Name | Anil |
| {{2}} | Campaign title | Ramadan Kit Drive |
| {{3}} | Short description | Help 200 families with essential groceries this month. |
| {{4}} | Target amount | 2,00,000 |

> Marketing messages cost more, and Meta may hold some back for users who already got many marketing messages that day. Push and email still go out.

---

## 3. `kiranam_reminder_upcoming`: 3 days before the due date

| Field | Value |
|---|---|
| Category | **Utility** |
| Header | none |
| Footer | `Karunya Kiranam · Health Care Foundation` |

**Body**
```
Hi {{1}}, a gentle reminder that your monthly Kiranam contribution of ₹{{2}} is due on {{3}}. You can pay anytime from the Karunya Kiranam app. Thank you for your support!
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Name | Anil |
| {{2}} | Monthly amount | 500 |
| {{3}} | Due date | 20 Oct 2026 |

---

## 4. `kiranam_reminder_due_today`: on the due date

| Field | Value |
|---|---|
| Category | **Utility** |
| Header | none |
| Footer | `Karunya Kiranam · Health Care Foundation` |

**Body**
```
Hi {{1}}, your monthly Kiranam contribution of ₹{{2}} is due today. Please complete it from the Karunya Kiranam app. Thank you for standing with families in need.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Name | Anil |
| {{2}} | Monthly amount | 500 |

---

## 5. `kiranam_reminder_overdue`: 3 days after the due date, if still unpaid

| Field | Value |
|---|---|
| Category | **Utility** |
| Header | none |
| Footer | `Karunya Kiranam · Health Care Foundation` |

**Body**
```
Hi {{1}}, your monthly Kiranam contribution of ₹{{2}} (due {{3}}) is still pending. If you've already paid, please ignore this message. You can pay from the Karunya Kiranam app.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Name | Anil |
| {{2}} | Monthly amount | 500 |
| {{3}} | Due date | 17 Oct 2026 |

---

### Notes
- Reminders are not sent to users with active autopay.
- If Meta rejects a template, edit the wording and resubmit under the same name. If you have to use a different name, tell the developer so the name used in the code can be updated.
- Approval usually takes from a few minutes to 24 hours.
