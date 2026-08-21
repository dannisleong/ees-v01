# EES V0.1 Core Control Validation Report

**Date:** 2026-08-16  
**Environment:** PostgreSQL 16.3 (local), Prisma 7.9.1, Node.js 24.15.0  
**Database:** `ees_v01` on `localhost:5432`  
**Status:** ✅ ALL TESTS PASSED

---

## Executive Summary

All four Core Control test suites have been executed against a live PostgreSQL database. **53 tests passed, 0 failed.**

| Module | Tests | Passed | Failed | Status |
|--------|-------|--------|--------|--------|
| Deposit SSOT Trigger | 8 | 8 | 0 | ✅ PASS |
| Smart Gate Engine | 13 | 13 | 0 | ✅ PASS |
| Quality Audit Engine | 13 | 13 | 0 | ✅ PASS |
| Document Access Control (DAC) | 19 | 19 | 0 | ✅ PASS |
| **Total** | **53** | **53** | **0** | **✅ PASS** |

---

## 1. Deposit SSOT Trigger — 8/8 PASSED

### What Was Tested
- INSERT → recalculates payment_status
- UPDATE (order_id change) → recalculates BOTH old and new orders
- DELETE → rolls back payment_status
- Multiple deposits accumulate correctly
- Full payment (≥ order_amount) → `fully_paid`
- Full deposit (≥ deposit_required) → `deposit_received`
- Partial deposit → `partial_deposit`
- No deposit → `pending_deposit`

### Key Fixes Applied
- PostgreSQL `customer_orders.id` is `TEXT` (Prisma `String` maps to `text`), not `UUID`
- Trigger function `recalculate_order_payment_status` parameter changed from `UUID` → `TEXT`
- Removed `::uuid` casts from function body
- String literals in `CASE` expression quoted: `'fully_paid'`, `'deposit_received'`, etc.
- `TG_OP` comparisons quoted in PL/pgSQL: `TG_OP = 'DELETE'`

### Evidence
```
▶ Test 06 — Move deposit recalculates both orders
  ✓ Order 1 after deposit: deposit_received
  ✓ Order 2 before deposit: pending_deposit
  ✓ Order 1 after move (old order recalculated): pending_deposit
  ✓ Order 2 after move (new order recalculated): deposit_received
```

---

## 2. Smart Gate Engine — 13/13 PASSED

### What Was Tested
- Gate 02 (Commercial): deposit SSOT integration → GO/NO-GO
- Gate 04 (Production/QC): QC audit pass/fail → GO/NO-GO
- Gate 06 (Handover): all conditions (final_audit, customer_approved, lessons_recorded, cost_calculated, warranty_issued) → GO/NO-GO
- NO-GO auto-creates Issue with correct category/severity
- Exceptional Override: Founder authorized with mandatory fields
- Override audit log created
- Non-Founder override blocked
- Missing mandatory fields rejected
- Condition breakdown returned for every evaluation

### Key Fixes Applied
- Test 06 setup expanded to create ALL Gate 06 required conditions (not just lessons)
- Prisma 7.9.1 driver adapter (`@prisma/adapter-pg`) configured via shared `api/src/lib/prisma.ts`

### Evidence
```
▶ Test 02 — Gate 02 GO (deposit received via SSOT)
  ✓ SSOT: payment_status updated
  ✓ Gate 02 should be GO after deposit
  ✓ deposit condition passes

▶ Test 08 — Exceptional Override (Founder authorized)
  ✓ Override records original result
  ✓ Override records new result
  ✓ Override marked as exceptional
  ✓ Audit log entry created
  ✓ Audit log records Founder
```

---

## 3. Quality Audit Engine — 13/13 PASSED

### What Was Tested
- All pending items → submission blocked
- FAIL without finding_details → rejected
- FAIL with finding_details → accepted
- Critical item FAIL = one-strike overall FAIL
- All PASS = overall PASS
- Non-critical FAIL still = overall FAIL
- N/A items count as completed
- Full audit submission → PASS result
- Critical FAIL submission → overall FAIL with flag
- Incomplete submission blocked with specific error
- Re-audit creates copy with reset items
- Immutable audit blocks updates
- Dry-run validation endpoint works

### Evidence
```
▶ Test 04 — Critical item FAIL = one-strike overall FAIL
  ✓ Overall result is FAIL
  ✓ Critical item triggered failure
  ✓ Message mentions critical item

▶ Test 12 — Immutable audit blocks updates
  ✓ Completed audit is immutable
  ✓ Error mentions immutability
```

---

## 4. Document Access Control (DAC) — 19/19 PASSED

### What Was Tested
- Founder: full RUD access to all 15 document types
- Cammy: RU on customer-facing docs, R-only on supply-chain docs
- Dongmei: RU on supply-chain docs, R-only on customer-facing docs
- Quality Reviewer: RU on QC/final_audit, R-only on others
- Project Manager: RU on most docs, no delete
- Supplier: R-only on BOM/PO/QC/packing/shipping, upload own quotation
- Partner: R on installation docs, RU on installation_photos
- Installer: R on design/measurement, RU on installation_photos
- Document list filtered by role permissions
- Unknown document_type → no permission
- Unseeded role → no permission
- Permission scopes correctly seeded (`all`, `own_project`, `assigned`)

### Evidence
```
▶ Test 10 — No role can delete except Founder
  ✓ Founder can delete
  ✓ Cammy cannot delete
  ✓ Dongmei cannot delete
  ✓ Reviewer cannot delete
  ✓ PM cannot delete
  ✓ Supplier cannot delete

▶ Test 08 — Supplier read-only on assigned types
  ✓ Supplier reads BOM
  ✓ Supplier reads PO
  ✓ Supplier uploads own quotation
  ✓ Supplier cannot read customer quotation
  ✓ Supplier cannot read deposit_record
```

---

## Infrastructure Setup

### PostgreSQL Installation
- Downloaded: `postgresql-16.3-1-windows-x64-binaries.zip`
- Extracted to: `C:\postgres\pgsql`
- Data directory: `C:\postgres\data`
- Started with: `pg_ctl -D C:/postgres/data -l logfile start`

### Database Configuration
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ees_v01?schema=public
```

### Migrations Applied
| Migration | Description | Status |
|-----------|-------------|--------|
| `20250816000000_deposit_ssot_trigger` | Deposit SSOT trigger + function | ✅ Applied |
| `20250816000001_smart_gate_conditions` | Gate conditions + permissions seed | ✅ Applied |
| `20250816000002_document_access_permissions` | 8-role × 15-type DAC matrix | ✅ Applied |

### Prisma Configuration
- `@prisma/client`: ^7.9.1
- `@prisma/adapter-pg`: ^7.9.1
- `pg`: ^8.23.0
- Shared client: `api/src/lib/prisma.ts` (Pool + PrismaPg adapter)

---

## Files Modified During Validation

| File | Change |
|------|--------|
| `api/src/lib/prisma.ts` | **NEW** — Shared Prisma client with pg adapter |
| `api/src/index.ts` | Import prisma from shared module |
| `api/src/services/gateEngine.ts` | Import prisma from shared module |
| `api/src/services/auditEngine.ts` | Import prisma from shared module |
| `api/src/tests/*.test.ts` | Import prisma from shared module |
| `api/src/seed.ts` | Import prisma from shared module |
| `prisma/migrations/20250816000000_deposit_ssot_trigger/migration.sql` | Fixed TEXT param + quoted string literals |
| `package.json` | Added `@prisma/adapter-pg`, `pg`, test scripts |

---

## Unauthorized Action Blocking — Verified

| Action | Blocked For | Response | Test |
|--------|-------------|----------|------|
| Gate Override | Non-Founder | 403 Forbidden | Test 09 ✅ |
| Audit re-submit | Any role | `AUDIT_IMMUTABLE` | Test 12 ✅ |
| Doc read (quotation) | Supplier | `DOC_READ_FORBIDDEN` | Test 08 ✅ |
| Doc upload (BOM) | Cammy | `DOC_UPLOAD_FORBIDDEN` | Test 05 ✅ |
| Doc delete | Dongmei/PM/Reviewer | `DOC_DELETE_FORBIDDEN` | Test 10 ✅ |

---

## Conclusion

> **All 53 Core Control tests pass. The EES V0.1 Rev.1.2 business rules are correctly implemented and enforced at the database and API levels.**

The three priority modules (Smart Gate Engine, Quality Audit, Document Access Control) are validated and ready. The Deposit SSOT trigger — the foundational single source of truth for payment status — is verified working for INSERT, UPDATE, and DELETE operations.

---

## Sign-off

| Criterion | Result |
|-----------|--------|
| PostgreSQL installed and running | ✅ |
| All migrations applied | ✅ |
| Prisma client with pg adapter configured | ✅ |
| Smart Gate Engine tests | ✅ 13/13 |
| Quality Audit Engine tests | ✅ 13/13 |
| Document Access Control tests | ✅ 19/19 |
| Deposit SSOT trigger tests | ✅ 8/8 |
| **Total** | **✅ 53/53** |

---

**Next step:** Proceed to next V0.1 module (BOM Management, ETA Tracking, Dashboard, or i18n bilingual support) upon approval.
