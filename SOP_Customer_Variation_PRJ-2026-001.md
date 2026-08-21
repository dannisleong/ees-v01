# SOP — Customer Variation for PRJ-2026-001 (Dongmei Home)

**Document ID:** SOP-CV-2026-001  
**Project:** PRJ-2026-001 — Dongmei Home  
**Version:** V0.1 (Manual Process — UI planned for V0.2)  
**Owner:** Dongmei (Supply Chain) / Founder (Approval)  
**Date:** 2026-08-16  
**Status:** ACTIVE — For Pilot Use

---

## 1. Purpose

This Standard Operating Procedure (SOP) defines how a **Customer Variation** (change order initiated by the customer after contract signing) is recorded, costed, approved, and tracked for **PRJ-2026-001 — Dongmei Home** during the V0.1 pilot phase.

> **Important:** The full customer-variation approval workflow UI is planned for V0.2. During V0.1 pilot, this SOP is executed manually with EES used for record-keeping, audit logging, and cost tracking.

---

## 2. Scope

Applies to all customer-requested changes after Gate 02 (Commercial / Deposit Received) has been passed, including but not limited to:
- Material upgrades or downgrades
- Specification changes (e.g., countertop thickness, tile grade)
- Quantity changes (additional rooms, extra cabinetry)
- Design alterations post-measurement

---

## 3. Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| **Cammy (Customer-facing)** | Receives variation request from customer; documents initial requirement; enters variation record into EES `customer_variations` table |
| **Dongmei (Supply Chain Owner)** | Evaluates BOM impact; sources revised supplier pricing; updates landed cost; confirms feasibility |
| **Founder** | Approves or rejects variation if total variation cost > SGD 5,000 or margin impact > 5% |
| **PM** | Coordinates timeline impact; updates project schedule; communicates ETA changes to customer |
| **Customer** | Signs variation acknowledgement; pays any additional deposit required |

---

## 4. Variation Workflow (6 Steps)

### Step 1 — Request Received
1. Cammy receives verbal or written variation request from customer.
2. Cammy logs a new record in `customer_variations` with:
   - `project_id` = PRJ-2026-001
   - `variation_number` = auto-increment (CV-001, CV-002, …)
   - `description` = detailed description of the change
   - `requested_by` = customer name
   - `status` = `pending_evaluation`
   - `created_by` = Cammy's user ID
3. EES audit log captures the creation event.

### Step 2 — Supply Chain Evaluation (Dongmei)
1. Dongmei reviews the variation against the existing BOM.
2. Dongmei determines:
   - Revised BOM items (add/modify/delete)
   - Revised supplier pricing
   - Production lead-time impact
   - Revised ETA
3. Dongmei updates the variation record:
   - `cost_impact` = additional or reduced cost (SGD)
   - `margin_impact` = percentage impact on overall project margin
   - `revised_eta` = new forecast completion date
   - `status` = `pending_approval`
4. If the variation requires new BOM items, Dongmei creates draft BOM line items linked to the variation.

### Step 3 — Financial Threshold Check

| Threshold | Action |
|-----------|--------|
| Cost impact ≤ SGD 1,000 AND margin impact ≤ 2% | Dongmei can approve directly |
| Cost impact SGD 1,001–5,000 OR margin impact 2–5% | Dongmei approves; Founder notified for info |
| Cost impact > SGD 5,000 OR margin impact > 5% | Founder approval **required** |

### Step 4 — Approval
1. **If Founder approval required:**
   - Founder reviews variation in EES Project → Variations tab (read-only view in V0.1)
   - Founder records approval decision in `customer_variations`:
     - `status` = `approved` or `rejected`
     - `approved_by` = Founder's user ID
     - `approved_at` = timestamp
     - `rejection_reason` = (if rejected)
   - EES audit log captures before/after status change.
2. **If Dongmei approval sufficient:**
   - Dongmei updates status directly.

### Step 5 — Customer Acknowledgement
1. Cammy prepares variation summary document (outside EES in V0.1 — Word/PDF).
2. Customer reviews and signs.
3. If additional deposit is required:
   - Cammy records new deposit in `customer_deposits`
   - Deposit SSOT trigger automatically recalculates `payment_status`
   - Verify Gate 02 still passes (or is re-passed after deposit)
4. Scanned acknowledgement uploaded to EES `documents` with type `variation_acknowledgement`.

### Step 6 — Execution & Close-Out
1. PM updates project timeline to reflect variation.
2. Dongmei submits any new/modified BOM items for approval (same BOM workflow as §3.5 of Pilot Readiness Review).
3. Upon completion of variation work:
   - PM updates `customer_variations.status` = `completed`
   - Actual cost recorded in `landed_costs` (new version flagged `is_current = true`)
   - Audit log captures close-out

---

## 5. Data Model Reference (V0.1 Schema)

```
customer_variations
├── id (UUID, PK)
├── project_id (FK → projects)
├── variation_number (TEXT, e.g., "CV-001")
├── description (TEXT)
├── requested_by (TEXT)
├── cost_impact (DECIMAL)
├── margin_impact (DECIMAL)
├── revised_eta (TIMESTAMP)
├── status (ENUM: pending_evaluation, pending_approval, approved, rejected, completed, cancelled)
├── approved_by (FK → users, nullable)
├── approved_at (TIMESTAMP, nullable)
├── rejection_reason (TEXT, nullable)
├── created_by (FK → users)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 6. Audit & Compliance

- Every `INSERT` / `UPDATE` on `customer_variations` is logged to `audit_logs` with `before_values` and `after_values`.
- Document access control applies: only Founder, Dongmei, and Cammy (creator) can read/write variation records for PRJ-2026-001.
- PM has read-only access.
- Supplier has no access.

---

## 7. Gate Impact

| Gate | Impact |
|------|--------|
| Gate 01–02 | Already passed; variation does not invalidate |
| **Gate 03** | If BOM changes, BOM must be **re-approved** before production proceeds |
| Gate 04 | QC checklist must include variation-specific items |
| Gate 05–06 | No direct impact unless ETA changes push handover date |

> **Critical Rule:** Any approved variation that modifies the BOM **requires re-approval of BOM at Gate 03** before production can resume. This is enforced by business process, not by automated gate re-evaluation in V0.1.

---

## 8. V0.2 Automation Roadmap

| Feature | V0.1 Status | V0.2 Plan |
|---------|-------------|-----------|
| Variation creation UI | Manual DB insert / API call | Full form with validation |
| Approval workflow | Manual status update | Automated routing with email notification |
| Customer signature capture | External PDF | In-app e-signature |
| Deposit linkage | Manual (Cammy records) | Auto-calculate additional deposit required |
| BOM auto-update | Manual (Dongmei creates items) | One-click "Apply to BOM" with diff view |
| Gate re-evaluation | Manual business rule | Auto-re-evaluate Gate 03 on BOM change |
| Margin simulation | Manual calculation | Real-time what-if margin calculator |

---

## 9. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| V0.1 | 2026-08-16 | EES System | Initial SOP for PRJ-2026-001 pilot |

---

**End of SOP — Customer Variation PRJ-2026-001**
