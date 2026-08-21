# EES V0.1 — Pilot Runbook

**Project:** PRJ-2026-001 — Dongmei Home  
**Version:** V0.1 Phase 1 UX (Frozen)  
**Date:** 2026-08-19

---

## 1. Getting Started

### Start the System

```bash
cd ees-v01-alpha
node start-pg-utf8.mjs     # Start PostgreSQL (if not running)
npm run dev                 # Start frontend dev server
```

- Frontend URL: `http://localhost:3000`
- API URL: `http://localhost:3001`

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Founder | `founder@ees.sg` | `password123` |
| Cammy | `cammy@ees.sg` | `password123` |
| Dongmei | `dongmei@ees.sg` | `password123` |
| PM | `pm@ees.sg` | `password123` |
| Quality Reviewer | `reviewer@ees.sg` | `password123` |

### Language Switch
- Toggle EN / 中文 via the language selector in the top navigation bar.
- All status labels, alerts, forms, and KPIs switch dynamically.

---

## 2. PRJ-2026-001 Starting State

| Attribute | Value |
|-----------|-------|
| Project Code | PRJ-2026-001 |
| Customer | Dongmei Home (Dongmei Chen) |
| Selling Price | SGD 185,000 |
| Total Landed Cost | SGD 126,000 |
| Gross Profit | SGD 59,000 |
| Gross Margin | 31.9% |
| Target Margin | 25.0% |
| Deposit Status | ✅ Received (SGD 55,500) |
| Current Stage | Procurement (Stage 5) |
| Gate 01 (Proposal) | 🟢 GO |
| Gate 02 (Commercial) | 🟢 GO |
| Gate 03 (Procurement) | 🟡 PENDING |
| Gate 04 (Production/QC) | 🟡 PENDING |
| Gate 05 (Installation) | 🟡 PENDING |
| Gate 06 (Handover) | 🟡 PENDING |
| Singapore Partner | SG Interior Installations Pte Ltd (Rajesh Kumar) |
| Partner Licence | HDB HB-06-12345A (Valid until 2027-01-14) |

### BOM Items (8 total)

| Item | Product | Supplier | Critical | Status |
|------|---------|----------|----------|--------|
| BOM-001 | Solid Oak Kitchen Cabinet | Guangzhou Fine Woodworks | ✅ Yes | Draft |
| BOM-002 | Quartz Kitchen Countertop | Foshan Premium Ceramics | ✅ Yes | Draft |
| BOM-003 | Brushed Nickel Faucet Set | Shenzhen Hardware Solutions | No | Draft |
| BOM-004 | Frameless Shower Enclosure | Dongguan Glass & Mirror | ✅ Yes | Draft |
| BOM-005 | Velvet Upholstery Sofa | Hangzhou Fabric & Upholstery | No | Draft |
| BOM-006 | Engineered Oak Flooring | Guangzhou Fine Woodworks | ✅ Yes | Draft |
| BOM-007 | LED Mirror Cabinet | Shenzhen Hardware Solutions | No | Draft |
| BOM-008 | Marble Bathroom Vanity Top | Foshan Premium Ceramics | No | Draft |

### Active Risk

| Risk ID | Category | Description | Owner | Status |
|---------|----------|-------------|-------|--------|
| RSK-2026-001 | Supplier | Oak kitchen cabinet supplier may delay due to CNY holiday backlog | Dongmei | Open |

---

## 3. Step-by-Step Pilot Scenarios

### Scenario A: Cammy — Morning Dashboard Review

1. **Login** as `cammy@ees.sg`
2. **Dashboard** opens automatically
3. Verify:
   - Attention banner shows 🟡 "Attention Required" (Gates 03–06 pending)
   - KPI cards show: 1 active project, BOM items delayed = 0 (if none yet)
   - Alerts section shows pending gates and open risk
4. **Click** the PRJ-2026-001 project card → Project Cockpit opens
5. Review tabs: Overview / Order & Deposit / BOM / ETA / Gates / Quality / Suppliers / Partners / Risks / Issues / Documents / Audit

### Scenario B: Dongmei — BOM Approval

1. **Login** as `dongmei@ees.sg`
2. Open **Project Cockpit** → **BOM** tab
3. Review BOM-001 (Solid Oak Kitchen Cabinet)
   - Verify supplier: Guangzhou Fine Woodworks Ltd
   - Verify unit cost: SGD 850.00, quantity: 12, total: SGD 10,200
4. **Action:** Change status from Draft → Submitted → Approved
5. **Verify:** Audit log records Dongmei as approver
6. **Verify:** Dashboard BOM approved count increases

### Scenario C: Dongmei — ETA Update

1. **Login** as `dongmei@ees.sg`
2. Open **Project Cockpit** → **ETA** tab
3. Select BOM-001 (Solid Oak Kitchen Cabinet)
4. **Action:** Update Forecast ETA to a later date (simulate delay)
5. **Verify:**
   - ETA variance is calculated automatically
   - If critical item is delayed, an Alert is triggered
   - If delay exceeds threshold, a Risk is auto-created
   - Audit log captures before/after values
6. **Verify:** Dashboard shows delayed BOM item and updated risk count

### Scenario D: Founder — Gate Override (Emergency)

1. **Login** as `founder@ees.sg`
2. Open **Project Cockpit** → **Gates** tab
3. Review Gate 03 (Procurement) — currently PENDING
4. **Action:** Use "Exceptional Override" (only Founder can do this)
5. **Verify:**
   - Override is recorded with original result and new result
   - Audit log records Founder as authorizer
   - Gate status updates to GO with "exceptional" flag
6. **Verify:** Dashboard reflects updated gate status

### Scenario E: Quality Reviewer — QC Checklist

1. **Login** as `reviewer@ees.sg`
2. Open **Project Cockpit** → **Quality** tab
3. Review the QC checklist for BOM items
4. **Action:** Mark items as PASS / FAIL / N/A
5. **Rule:** If any critical item is FAIL, overall audit = FAIL (one-strike rule)
6. **Action:** Submit audit
7. **Verify:** Audit becomes immutable; re-audit creates a new copy

### Scenario F: PM — Read-Only Operational View

1. **Login** as `pm@ees.sg`
2. Verify you can view Dashboard, Project Cockpit, BOM, ETA
3. **Attempt:** Update ETA or approve BOM
4. **Verify:** System blocks the action with FORBIDDEN error
5. **Action:** Record any missing read-only view in the Issue Log

### Scenario G: Singapore Partner — Installation Readiness

1. **Login** as `partner` role (if account created) or review via Founder/Cammy
2. Verify partner qualification: HDB Licence HB-06-12345A
3. Verify assigned stage: Installation (Stage 8)
4. **Action:** Upload installation photos (when stage is reached)
5. **Verify:** Document Access Control allows photo upload but blocks BOM/quotation access

---

## 4. Escalation Procedure

| Situation | Immediate Action | Escalate To |
|-----------|-----------------|-------------|
| BOM supplier delay > 1 week | Dongmei calls supplier; updates Forecast ETA | Founder if > 2 weeks |
| QC failure on critical item | Quality Reviewer marks FAIL; Dongmei holds shipment | Founder immediately |
| Customer requests variation | Cammy records variation; Dongmei estimates cost impact | Founder if cost > SGD 5,000 |
| Singapore partner licence expires | Cammy checks qualification dashboard | Founder for partner replacement |
| Gate evaluation blocks project | System auto-creates Issue; owner acts | Founder for exceptional override |
| ETA delay affects margin > 5pp | Dongmei updates landed cost estimate | Founder for pricing decision |
| System bug or incorrect alert | Record in Pilot Issue Log (do not change code) | Developer after pilot review |

---

## 5. Language Switching Checklist

Verify these items in **both EN and 中文**:

- [ ] Dashboard title, subtitle, KPI labels
- [ ] Attention banner text (Action Required / Attention Required / All Clear)
- [ ] BOM status badges (Draft / Submitted / Approved / Rejected)
- [ ] Payment status labels (Pending Deposit / Partial Deposit / Deposit Received / Fully Paid)
- [ ] Quality Audit result labels (Pass / Fail / Pending / N/A)
- [ ] Gate labels (Stage X / Gate Y)
- [ ] Navigation menu items
- [ ] Error messages and alerts
- [ ] Supplier and Partner detail pages
- [ ] Pilot Issue Log labels

If any item appears in English when 中文 is selected, record it as a UX issue.

---

## 6. Post-Session Checklist

After each pilot session, the user should:

- [ ] Log out securely
- [ ] Note any system slowness or errors
- [ ] Record 1–3 observations in the Pilot Issue Log
- [ ] Confirm data is still visible on next login

---

**End of Runbook**
