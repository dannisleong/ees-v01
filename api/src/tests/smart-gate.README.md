# Smart Gate Engine — Module Documentation

## Overview

The Smart Gate Engine is the core control mechanism of EES. It evaluates whether a project can proceed past a Gate by checking all required conditions. If any required condition fails, the result is **NO-GO** and the project is blocked.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Request   │────►│  Gate Engine    │────►│  PostgreSQL     │
│  POST /evaluate │     │  (evaluateGate) │     │  (project data) │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  GO     │    NO-GO      │
                    ▼         ▼               ▼
              ┌─────────┐  ┌─────────────────────────┐
              │ Proceed │  │ Auto-create Issue       │
              │         │  │ + Optional Override     │
              └─────────┘  └─────────────────────────┘
```

## Files

| File | Purpose |
|---|---|
| `api/src/services/gateEngine.ts` | Core evaluation logic |
| `api/src/routes/gates.ts` | API endpoints |
| `api/src/tests/smart-gate.test.ts` | Automated tests (12 tests) |
| `prisma/migrations/20250816000001_smart_gate_conditions/migration.sql` | Gate conditions seed |

## API Endpoints

### POST /api/gates/evaluate
Evaluate a gate for a project.

**Request:**
```json
{
  "project_id": "uuid",
  "gate_id": "uuid"
}
```

**Response:**
```json
{
  "gate_result": { "id": "...", "result": "GO", ... },
  "evaluation": {
    "gate_id": "...",
    "gate_number": 2,
    "result": "GO",
    "condition_results": [
      { "condition_type": "deposit_received", "passed": true, "required": true, ... }
    ],
    "failed_conditions": [],
    "message": "Gate 2 passed all conditions."
  }
}
```

### POST /api/gates/override
Exceptional Override — **Founder only**.

**Request:**
```json
{
  "gate_result_id": "uuid",
  "project_id": "uuid",
  "original_result": "NO-GO",
  "new_result": "GO",
  "reason": "Detailed reason (min 10 chars)",
  "risk_acceptance": "Risk acceptance statement (min 10 chars)",
  "approver_name": "Founder CEO"
}
```

**Validation:**
- `reason` must be ≥ 10 characters
- `risk_acceptance` must be ≥ 10 characters
- `approver_name` must be non-empty
- Caller must have `founder` role (403 otherwise)

## Condition Types

| Type | Description | Gates |
|---|---|---|
| `order_confirmed` | Customer order exists | 02 |
| `customer_approved` | customer_orders.customer_approved = true | 02, 06 |
| `deposit_received` | payment_status ∈ {deposit_received, fully_paid} | 02 |
| `cost_calculated` | landed_costs exists and is_current | 02, 06 |
| `margin_above_target` | margin_percent ≥ target_margin_percent | 02 |
| `bom_approved` | All BOM items have supplier assigned | 03 |
| `qc_passed` | quality_audits.result = 'pass' | 04 |
| `document_uploaded` | Documents of specified type exist | 01, 04, 05, 06 |
| `no_damage_reported` | No open damage issues | 04 |
| `compliance_valid` | All project partners have valid, role-matching qualifications | 05 |
| `installation_time_recorded` | Project partners marked completed | 05 |
| `lessons_recorded` | lessons_learned count > 0 | 06 |
| `warranty_issued` | Warranty document exists | 06 |

## Business Rules (Rev.1.2)

1. **All required conditions must pass** for GO
2. **NO-GO immediately blocks** project progression
3. **NO-GO auto-creates an Issue** with category `gate_failure` and severity `high`
4. **Exceptional Override** is available only to Founder
5. **Override requires**: reason + risk_acceptance + approver_name (all mandatory)
6. **All Overrides are logged** to audit_logs
7. **Gate 02** reads `payment_status` from Deposit SSOT trigger
8. **Gate 04** reads `quality_audits.result` (strict checklist)
9. **Gate 05** checks `partners.type` matches `qualification_types.applicable_partner_types`
10. **Gate 06** requires at least one `lessons_learned` record

## Test Coverage

| Test | Scenario |
|---|---|
| Test 01 | Gate 02 NO-GO — missing deposit |
| Test 02 | Gate 02 GO — deposit received via SSOT |
| Test 03 | Gate 04 NO-GO — QC audit failed |
| Test 04 | Gate 04 GO — QC audit passed + documents |
| Test 05 | Gate 06 NO-GO — lessons not recorded |
| Test 06 | Gate 06 GO — lessons recorded |
| Test 07 | NO-GO auto-creates Issue |
| Test 08 | Exceptional Override — Founder authorized |
| Test 09 | Override — non-Founder blocked |
| Test 10 | Override missing fields rejected |
| Test 11 | Gate result includes condition breakdown |
| Test 12 | Project current_gate advances |

## Run Tests

```bash
npm run test:smart-gate
```

## Schema

No schema changes required. Uses existing tables:
- `gates`, `gate_conditions`, `gate_results`, `gate_overrides`
- `projects`, `customer_orders`, `customer_deposits`
- `quality_audits`, `audit_items`
- `bom_items`, `suppliers`
- `partners`, `qualifications`, `qualification_types`, `project_partners`
- `landed_costs`
- `lessons_learned`
- `documents`
- `issues`
- `audit_logs`
