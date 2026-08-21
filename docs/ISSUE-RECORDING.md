# EES V0.1 — Pilot Issue Recording Procedure

**Rule:** During the pilot, do not change the system when an issue is discovered. Record it first.

---

## Issue Categories

| Category | Definition | Examples |
|----------|------------|----------|
| **Business Rule** | A real-world rule that EES does not handle | "Customer wants to split deposit into 2 payments" |
| **SOP** | Standard Operating Procedure gap | "No procedure for handling customs inspection hold" |
| **UX** | Interface friction, confusion, or missing context | "Cammy cannot see supplier contact info on BOM page" |
| **Software Defect** | Bug, crash, incorrect calculation, or data error | "ETA variance calculated as negative when on time" |

---

## Issue Log Template

Use the following format for every issue. Copy this block into a shared document or the EES Pilot Issue Log.

```
Issue ID: PILOT-001
Date Discovered: 2026-08-19
Discovered By: Cammy
Category: UX
Severity: Medium
Title: BOM page does not show supplier phone number

Description:
When reviewing BOM-001, Cammy needed to call the supplier (Mr. Zhang) 
but could not find the phone number on the BOM detail page. 
Had to open a separate supplier list.

Expected Behavior:
Supplier contact info (phone + email) should be visible on the BOM 
detail card or accessible via one click.

Actual Behavior:
Only supplier name is shown. Phone/email require navigating to Suppliers module.

Workaround:
Open Suppliers module in a second tab.

Owner: Cammy
Recommended Fix: Add supplier contact card to BOM detail view.
Status: Open
```

---

## Severity Definitions

| Severity | Meaning | Response Time |
|----------|---------|---------------|
| 🔴 Critical | Blocks pilot workflow or causes data integrity risk | Same day |
| 🟡 High | Significant friction or repeated manual workaround | Within 2 days |
| 🟢 Medium | Annoyance or missing convenience | Within 1 week |
| ⚪ Low | Cosmetic or nice-to-have | Post-pilot review |

---

## Recording Rules

1. **One issue per record.** Do not bundle multiple problems into one issue.
2. **Include a workaround.** If users found a way to continue, document it.
3. **Assign an owner.** Every issue must have a human owner who discovered it or is affected by it.
4. **Do not assign to "System".** The system cannot take action. Assign to Cammy, Dongmei, Founder, or PM.
5. **Tag with category and severity.** This determines post-pilot priority.
6. **Date everything.** When discovered, when escalated, when resolved.

---

## Escalation Path

```
Discovered → Recorded → Owner Reviews → If Critical → Escalate to Founder
                                    → If High → Discuss in daily standup
                                    → If Medium/Low → Log for post-pilot review
```

**Escalation triggers:**
- Critical data integrity issue (e.g., wrong deposit amount calculated)
- Critical blocker (e.g., cannot approve BOM, cannot update ETA)
- Repeated workaround > 3 times per day
- Customer-facing error (wrong quotation, wrong approval status)

---

## Issue Log Location

During the pilot, record issues in:
- **Option A:** Shared spreadsheet (Google Sheets / Excel) named `EES-Pilot-Issues-PRJ-2026-001`
- **Option B:** EES built-in Pilot Issue Log module (if available)
- **Option C:** Printed form (if digital is unavailable)

**Required columns:**
- Issue ID
- Date
- Discovered By
- Category
- Severity
- Title
- Description
- Expected Behavior
- Actual Behavior
- Workaround
- Owner
- Status (Open / Escalated / Resolved / Deferred)

---

**End of Procedure**
