# EES V0.1 — Pilot Readiness Sign-Off

**Status:** Phase 1 UX FROZEN — PILOT READY  
**Date:** 2026-08-19  
**Frozen Baseline:** 113/113 PASS  

---

## A. System Baseline

### Architecture Summary
EES V0.1 is a project-centric operational control system built on:

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express 5 + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 (local) via embedded-postgres |
| i18n | react-i18next with EN / 中文 parity |
| Auth | JWT tokens, bcrypt-hashed passwords |

### Frozen Modules (113/113 PASS)

| Module | Tests | Status |
|--------|-------|--------|
| Deposit SSOT | 8/8 | ✅ PASS |
| Smart Gate Engine | 13/13 | ✅ PASS |
| Quality Audit Engine | 13/13 | ✅ PASS |
| Document Access Control (RBAC/DAC) | 19/19 | ✅ PASS |
| BOM Management | 26/26 | ✅ PASS |
| ETA Tracking | 15/15 | ✅ PASS |
| Dashboard (Management Attention) | 19/19 | ✅ PASS |

### Database / PostgreSQL Setup
- **Host:** `127.0.0.1:5432`
- **Database:** `ees_v01`
- **Migrations:** 4 baselined + triggers (Deposit SSOT, Audit log)
- **Seed scripts:** `api/src/seed.ts` (users/roles/gates) + `api/src/seed-pilot.ts` (PRJ-2026-001 data)
- **Restart command:** `node start-pg-utf8.mjs`

---

## B. User Roles

| Role | Login Email | Password | Purpose |
|------|-------------|----------|---------|
| **Founder** | `founder@ees.sg` | `password123` | Override, escalation, audit, full access |
| **Cammy** | `cammy@ees.sg` | `password123` | Customer-facing, design coordination, project cockpit |
| **Dongmei** | `dongmei@ees.sg` | `password123` | Supply chain, procurement, ETA owner, BOM approval |
| **PM** | `pm@ees.sg` | `password123` | Read-only operational view (no BOM approve, no ETA update) |
| **Quality Reviewer** | `reviewer@ees.sg` | `password123` | QC report upload, final audit |

> ⚠️ These are pilot test credentials. Change before production.

---

## C. Responsibility Matrix

| Function | Owner | Escalation |
|----------|-------|------------|
| Customer communication | Cammy | Founder |
| BOM creation / approval | Dongmei | Founder |
| Procurement / supplier management | Dongmei | Founder |
| ETA update (planned / forecast / actual) | Dongmei | Founder |
| China QC | Quality Reviewer + Dongmei | Founder |
| Singapore installation execution | Singapore Partner (SG Interior Installations) | Cammy / Dongmei → Founder |
| Gate progression evaluation | System evaluates; Founder approves override | Founder |
| Risk identification & mitigation | Dongmei (supply chain) / Cammy (customer) | Founder |
| Escalation authority | Founder | — |
| Deposit / payment status | System (SSOT) — Cammy verifies with customer | Founder |

---

## D. Pilot Workflow

```
Customer → Design → Approval → Deposit → BOM → Procurement → ETA → Production/QC → Logistics → Singapore Partner → Installation → Inspection → Handover → Warranty
```

**PRJ-2026-001 current stage:** Procurement (Stage 5)  
**Gates 01–02:** GO ✅  
**Gates 03–06:** PENDING 🟡  

---

## E. Pilot Operating Rules

During the pilot, all users must:

1. **Use the system for the actual workflow.** Do not bypass EES for BOM, ETA, or Gate tracking.
2. **Record issues instead of immediately changing code.** Every finding must be logged before any system change is proposed.
3. **Record manual workarounds.** If a business rule requires a spreadsheet, email, or phone call outside EES, document it.
4. **Record missing business rules.** If a real-world scenario has no system rule, write it down.
5. **Record UX friction.** Confusing labels, extra clicks, missing context — all count.
6. **Record incorrect alerts / ownership.** If an alert goes to the wrong person, or a gate evaluation is wrong, log it.
7. **Record ETA, QC, cost and variation outcomes.** Compare planned vs actual at every milestone.

---

## F. Known Non-Blockers

| Issue | Impact | Resolution |
|-------|--------|------------|
| Vite production chunk size warning (>500 KB) | Low — page loads are still fast | V0.2 code-splitting optimization |
| Dashboard test seed references "Project A" internally | None — test-only data, not rendered in production UI | Will remain in test suite only |
| PM role has read-only ETA access by design | Expected — Dongmei is ETA owner | No change required |

---

## G. Freeze Declaration

The following are **frozen** for the duration of PRJ-2026-001 pilot execution:

- [x] Database schema and relationships
- [x] Deposit SSOT logic (trigger-based)
- [x] Smart Gate Engine evaluation rules
- [x] Quality Audit Engine checklist rules
- [x] Document Access Control / RBAC / DAC
- [x] BOM Management business rules
- [x] ETA Tracking logic and ownership
- [x] Dashboard KPI aggregation logic
- [x] Project-Centric UX architecture
- [x] EN / 中文 i18n structure
- [x] Semantic color system (🟢🟡🔴⚪)
- [x] Ownership / responsibility model

**Any change to frozen items requires:**
1. Formal issue recording in the Pilot Issue Log
2. Root cause analysis
3. Post-pilot review approval
4. Re-run of full 113-test regression after change

---

**Approved for Pilot Execution:** _________________  
**Date:** _________________
