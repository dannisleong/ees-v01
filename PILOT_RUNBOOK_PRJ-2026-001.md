# EES V0.1 Pilot Runbook — PRJ-2026-001 Dongmei Home

**Version:** V0.1 Pilot  
**Date:** 2026-08-16  
**Frozen Baseline:** 113/113 automated tests PASS  
**Objective:** Operational validation of the complete Customer → Handover workflow

---

## Table of Contents

1. [System Access](#1-system-access)
2. [Roles & Responsibilities](#2-roles--responsibilities)
3. [Project Snapshot: PRJ-2026-001](#3-project-snapshot-prj-2026-001)
4. [Workflow Step-by-Step](#4-workflow-step-by-step)
5. [Issue Logging Protocol](#5-issue-logging-protocol)
6. [Emergency & Escalation](#6-emergency--escalation)
7. [What NOT to Do During Pilot](#7-what-not-to-do-during-pilot)
8. [Post-Pilot Deliverables](#8-post-pilot-deliverables)

---

## 1. System Access

### URL
- **Frontend:** `http://localhost:7100` (or as configured by IT)
- **API Base:** `http://localhost:3001`

### Login Credentials (Pilot Environment)

| Role | Email | Password | Language |
|------|-------|----------|----------|
| **Founder** | `founder@ees.sg` | `password123` | EN / 中文 |
| **Dongmei** (Supply Chain Owner) | `dongmei@ees.sg` | `password123` | EN / 中文 |
| **Cammy** (Customer-facing) | `cammy@ees.sg` | `password123` | EN / 中文 |
| **PM** (Project Manager) | `pm@ees.sg` | `password123` | EN / 中文 |

> **Note:** These are pilot-only credentials. Production credentials will be issued separately.

### Language Switching
Click the language toggle in the top navigation bar to switch between **English** and **简体中文 (Simplified Chinese)**. All navigation, forms, status labels, alerts, and errors support both languages.

---

## 2. Roles & Responsibilities

### Cammy — Customer Relationship Owner
- **Primary:** Customer communication, design approval, deposit collection, variation requests
- **Can see:** Customer-facing documents (quotation, design drawing, customer approval, deposit record)
- **Can upload:** Customer-facing documents
- **Cannot:** Upload BOM, PO, QC reports, or delete any documents
- **ETA access:** Read-only

### Dongmei — China Supply Chain Owner
- **Primary:** Supplier management, BOM approval, QC oversight, ETA updates, procurement
- **Can see:** Supply chain documents (BOM, PO, supplier quotation, QC report, packing photos, shipping docs)
- **Can upload:** Supply chain documents
- **Cannot:** Upload customer-facing documents (quotation, customer approval, deposit record)
- **ETA access:** Full update authority

### PM — Project Coordinator
- **Primary:** Project coordination, timeline tracking, cross-functional communication
- **Can see:** Most project documents (design, BOM, shipping)
- **Can upload:** Design drawings, BOM, shipping docs
- **Cannot:** Upload final audit, deposit record, approve BOM, delete documents
- **ETA access:** Read-only

### Founder
- **Primary:** Override authority, exceptional decisions, audit review
- **Can see & upload:** All document types
- **Can delete:** Any document (only Founder)
- **Can override:** Gate results (with mandatory audit log)

---

## 3. Project Snapshot: PRJ-2026-001

### Customer
| Field | Value |
|-------|-------|
| Name | Dongmei Home |
| Contact | Dongmei Chen |
| Address | 123 Serangoon Gardens, Singapore 554123 |
| Phone | +65 9123 4567 |

### Financials
| Field | Value |
|-------|-------|
| Selling Price | SGD $185,000 |
| Deposit Required | SGD $55,500 (30%) |
| Deposit Status | ✅ Received (Bank Transfer, 2026-02-20) |
| Target Margin | 25% |
| Current Margin | 31.89% |

### Stage & Gate Status
| Stage | Name | Status | Gate | Result |
|-------|------|--------|------|--------|
| 1 | Inquiry | ✅ Completed | Gate 01 | GO |
| 2 | Proposal | ✅ Completed | Gate 02 | GO |
| 3 | Measurement | ✅ Completed | — | — |
| 4 | Commercial | ✅ Completed | — | — |
| 5 | Procurement | 🔄 In Progress | Gate 03 | PENDING |
| 6 | Production/QC | ⏳ Pending | Gate 04 | PENDING |
| 7 | Shipping | ⏳ Pending | Gate 05 | PENDING |
| 8 | Installation | ⏳ Pending | Gate 06 | PENDING |
| 9 | Handover | ⏳ Pending | — | — |

### BOM Summary
| Metric | Value |
|--------|-------|
| Total Items | 8 |
| Critical Items | 4 (BOM-001, BOM-002, BOM-004, BOM-006) |
| Total BOM Cost | SGD $26,945 |
| Approval Status | All items in `draft` — awaiting Dongmei approval |

### Singapore Partner
| Field | Value |
|-------|-------|
| Name | SG Interior Installations Pte Ltd |
| Contact | Rajesh Kumar |
| HDB Licence | HB-06-12345A (expires 2027-01-14) |
| Status | ✅ Valid |
| Responsibility | Full interior installation including cabinetry, flooring, and fixtures |

### Active Risk
| ID | Description | Level | Owner |
|----|-------------|-------|-------|
| RSK-2026-001 | Oak kitchen cabinet supplier may delay due to CNY holiday backlog | HIGH | Dongmei |

---

## 4. Workflow Step-by-Step

### Phase 1: Customer → Design → Approval → Deposit ✅ (COMPLETED)

These stages are already complete for PRJ-2026-001:

1. **Customer Inquiry** — Dongmei Home contacted EES
2. **Site Measurement** — Completed
3. **Design Proposal** — Approved by customer
4. **Quotation** — SGD $185,000 approved
5. **Deposit** — SGD $55,500 received via Bank Transfer (TT-20260220-001)
6. **Gate 01 & 02** — Both evaluated GO

### Phase 2: Minimum BOM → Procurement (CURRENT)

**Owner:** Dongmei  
**System Module:** BOM Management + ETA Tracking

#### Step 2.1 — Review BOM Items
1. Navigate to **BOM Management**
2. Review all 8 BOM items for PRJ-2026-001
3. Verify specifications, quantities, and supplier assignments

#### Step 2.2 — Approve BOM Items
1. For each BOM item, click **Submit for Approval**
2. Dongmei reviews and clicks **Approve** or **Reject**
3. If rejected, add reason — item returns to `draft`
4. Approved items cannot be modified (Founder override required)

#### Step 2.3 — Update ETAs
1. Navigate to **ETA Tracking**
2. For each BOM item, update:
   - `planned_eta` — original committed date
   - `forecast_eta` — latest realistic estimate
   - `actual_arrival` — when item actually arrives
3. System auto-calculates variance and triggers alerts for critical delays

#### Step 2.4 — Trigger Gate 03
When all critical BOM items are approved and deposit is confirmed:
1. System evaluates Gate 03 automatically
2. If GO → project advances to Stage 6 (Production/QC)
3. If NO-GO → issue is auto-created, project blocked

### Phase 3: Production → QC

**Owner:** Dongmei + Quality Reviewer  
**System Module:** Quality Audit

#### Step 3.1 — Production Monitoring
- Dongmei tracks production progress via ETA Tracking
- Update `forecast_eta` as new information arrives

#### Step 3.2 — QC Audit
1. Quality Reviewer initiates QC audit for the batch
2. Complete all checklist items:
   - `pass` — item meets spec
   - `fail` — item below spec (requires finding_details)
   - `N/A` — not applicable
3. **Critical item FAIL = overall FAIL** (one-strike rule)
4. Submit audit — result is immutable after submission

#### Step 3.3 — Re-audit (if needed)
1. If QC FAIL, Dongmei coordinates rework with supplier
2. Create re-audit — copies checklist, resets to pending
3. Complete re-audit and submit

#### Step 3.4 — Trigger Gate 04
- QC PASS + all required documents uploaded = Gate 04 GO
- QC FAIL = Gate 04 NO-GO → rework required

### Phase 4: Logistics → Singapore Delivery

**Owner:** Dongmei + PM  
**System Module:** ETA Tracking + Dashboard

#### Step 4.1 — Shipping Arrangement
1. PM uploads shipping documents
2. Dongmei updates international freight ETA

#### Step 4.2 — Singapore Customs & Delivery
1. PM tracks customs clearance
2. Update `actual_arrival` for each BOM item
3. System calculates variance and alerts on critical delays

#### Step 4.3 — Trigger Gate 05
- All items arrived + customs cleared = Gate 05 GO

### Phase 5: Singapore Partner → Installation → Inspection

**Owner:** Singapore Partner (SG Interior Installations)  
**System Module:** Document Access + Quality Audit

#### Step 5.1 — Partner Qualification Verification
- System validates HDB licence (HB-06-12345A) is current
- Alert if licence expires within 30 days

#### Step 5.2 — Installation
1. Partner uploads installation photos via Document module
2. Partner can read design drawings but cannot access BOM or quotation

#### Step 5.3 — Inspection
1. Dongmei or Quality Reviewer conducts final inspection
2. Upload inspection report
3. Record any defects as issues

#### Step 5.4 — Trigger Gate 06
- Installation complete + inspection passed + lessons recorded = Gate 06 GO

### Phase 6: Handover → Warranty

**Owner:** Cammy  
**System Module:** Issues + Lessons Learned

#### Step 6.1 — Customer Handover
1. Cammy schedules handover with Dongmei Home
2. Record customer sign-off
3. Upload warranty documents

#### Step 6.2 — Lessons Learned
1. PM records lessons learned for the project
2. Flag items that should become SOP

#### Step 6.3 — Project Close
1. Founder reviews final margin vs. target
2. Archive project
3. Generate Pilot Performance Report

---

## 5. Issue Logging Protocol

### When to Log an Issue
Log an issue **immediately** when you encounter:
- Something the system does not allow that it should
- Something the system allows that it should not
- Confusing UI or workflow
- Missing data or incorrect calculation
- Any process that requires a manual workaround

### How to Log an Issue
1. Navigate to **Pilot Issues** in the sidebar
2. Click **New Issue**
3. Fill in:
   - **Title:** Clear, concise description
   - **Category:** `business_rule` | `sop` | `ux` | `software_defect`
   - **Priority:** `low` | `medium` | `high` | `critical`
   - **Description:** What happened, what you expected, steps to reproduce
   - **Proposed Action:** What you think should change (do NOT implement yourself)
4. Click **Save**

### Issue Categories
| Category | Use When |
|----------|----------|
| `business_rule` | The system enforces a rule that doesn't match real business needs |
| `sop` | A standard operating procedure is missing, unclear, or unenforceable in the system |
| `ux` | The interface is confusing, slow, or requires too many clicks |
| `software_defect` | The system crashes, shows wrong data, or behaves unexpectedly |

### Important: Do NOT Fix It Yourself
> **Rule:** Record first, propose change, wait for post-pilot review.
>
> During the pilot, your job is to **discover** issues, not to **fix** them.
> All changes go through the post-pilot review process to maintain the 113/113 test baseline.

---

## 6. Emergency & Escalation

### Scenario: System Down
1. Do not attempt to restart the database or server
2. Record issue as `software_defect` / `critical`
3. Notify Founder immediately
4. Continue work using offline records (Excel/Word) if possible

### Scenario: Wrong Data Entered
1. Do not delete records unless you are Founder
2. Record the error in Pilot Issues
3. Dongmei or Founder will correct via approved process
4. All corrections are logged in the Audit Log

### Scenario: Gate NO-GO Blocks Progress
1. Review the Gate result to see which condition failed
2. Address the underlying issue (e.g., missing deposit, failed QC)
3. Re-evaluate the gate
4. If exceptional circumstances require override, Founder must authorize with mandatory reason and audit log

### Scenario: Customer Variation Request
1. Cammy records the variation request
2. Dongmei assesses cost and schedule impact
3. Founder approves variation
4. **Manual SOP:** Use the Customer Variation SOP document (V0.2 will automate this)
5. Update BOM and quotation offline if needed; record in Pilot Issues

---

## 7. What NOT to Do During Pilot

❌ **Do NOT modify the database directly** (SQL, Prisma Studio edits)  
❌ **Do NOT change code, schema, or business logic**  
❌ **Do NOT approve your own changes without peer review**  
❌ **Do NOT delete approved BOM items** (only Founder can, and only with reason)  
❌ **Do NOT override gate results without Founder authorization**  
❌ **Do NOT ignore a system alert or error** — always log it  
❌ **Do NOT share login credentials**  
❌ **Do NOT test in production** — this IS the pilot production environment

---

## 8. Post-Pilot Deliverables

At the end of PRJ-2026-001, the system will generate:

### Pilot Performance & Lessons Learned Report
Covering:
1. **Cost and Margin** — Actual vs. target, variance analysis
2. **ETA Accuracy** — Planned vs. forecast vs. actual for each BOM item
3. **QC and Rework** — Pass/fail rates, rework cycles, cost of quality
4. **Supplier Performance** — On-time delivery, quality score, communication
5. **Singapore Partner Performance** — Installation quality, timeliness, compliance
6. **Customer Variations** — Number, cost impact, approval time
7. **Risks and NO-GO Events** — What blocked progress and how it was resolved
8. **Manual Workarounds** — Processes that required offline handling
9. **UX Issues** — Interface friction points
10. **Recommended V0.2 Changes** — Prioritized list of enhancements

---

## Appendix A: Quick Reference — URL Routes

| Page | Route | Who Uses It |
|------|-------|-------------|
| Dashboard | `/dashboard` | Everyone |
| BOM Management | `/bom` | Dongmei, PM |
| ETA Tracking | `/eta` | Dongmei, PM (read-only) |
| Pilot Execution | `/pilot-execution` | Everyone |
| Pilot Issues | `/pilot-issues` | Everyone |
| Pilot KPI | `/pilot-kpi` | Founder, PM |
| Projects | `/projects` | Everyone |

## Appendix B: Gate Definitions

| Gate | Name | Trigger Stage | Key Condition |
|------|------|---------------|---------------|
| Gate 01 | Order Confirmed | 1 | Order exists |
| Gate 02 | Deposit Received | 2 | Deposit SSOT = `deposit_received` |
| Gate 03 | BOM Approved | 5 | All critical BOM items approved |
| Gate 04 | QC Passed | 6 | QC audit = PASS |
| Gate 05 | Ready for Shipment | 7 | All items arrived |
| Gate 06 | Handover Ready | 8 | Installation complete + lessons recorded |

---

**Document Owner:** Founder  
**Approved For Pilot Use:** ✅ Yes  
**Next Review:** End of PRJ-2026-001 Pilot
