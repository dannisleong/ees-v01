# Deposit SSOT — Migration & Test Guide

## Overview

`customer_deposits` is the **single source of truth** for all deposit data.  
`customer_orders.payment_status` is a **derived field** maintained automatically by a PostgreSQL trigger.

**No application code should ever directly update `customer_orders.payment_status`.**

---

## Migration

### File
`prisma/migrations/20250816000000_deposit_ssot_trigger/migration.sql`

### What it creates
1. `recalculate_order_payment_status(order_id UUID)` — helper function
2. `trg_customer_deposits_ssot()` — trigger function handling INSERT/UPDATE/DELETE
3. Trigger `trg_customer_deposits_ssot` on `customer_deposits`

### Apply the migration

```bash
# Option 1: Deploy (production)
npm run db:apply-migration

# Option 2: Dev migration
npx prisma migrate dev
```

> Note: The migration is included in the Prisma migrations directory and will be applied automatically when you run `prisma migrate deploy` or `prisma migrate dev`.

---

## SSOT Rules

| Condition | payment_status |
|---|---|
| SUM(deposits) >= order_amount | `fully_paid` |
| SUM(deposits) >= deposit_required | `deposit_received` |
| SUM(deposits) > 0 | `partial_deposit` |
| No deposits | `pending_deposit` |

---

## Trigger Behavior

| Operation | Behavior |
|---|---|
| **INSERT** | Recalculates `payment_status` for `NEW.order_id` |
| **UPDATE** | Recalculates `NEW.order_id`; if `order_id` changed, also recalculates `OLD.order_id` |
| **DELETE** | Recalculates `OLD.order_id` |

---

## Automated Tests

### Run tests
```bash
npm run test:deposit-ssot
```

### Test coverage

| Test | Scenario | Expected Result |
|---|---|---|
| Test 01 | No deposit recorded | `pending_deposit` |
| Test 02 | Partial deposit (e.g. 5000/10000) | `partial_deposit` |
| Test 03 | Full deposit >= deposit_required | `deposit_received` |
| Test 04 | Complete payment >= order_amount | `fully_paid` |
| Test 05 | Delete deposit after full payment | Rolls back to `pending_deposit` |
| Test 06 | Move deposit to another order | Both orders recalculate correctly |
| Test 07 | Gate 02 reads payment_status | Matches SSOT value directly |
| Test 08 | Multiple deposits accumulate | Status updates incrementally |

---

## Gate 02 Integration

Gate 02 checks `customer_orders.payment_status = 'deposit_received'` (or higher).  
Because the trigger is `AFTER` and runs at the database level, **any** change to `customer_deposits` is immediately visible to Gate 02 — no application cache, no delayed batch job.

---

## Architecture Principle

```
┌─────────────────┐     INSERT/UPDATE/DELETE     ┌─────────────────┐
│   Application   │ ───────────────────────────► │  customer_      │
│   (Express API) │                            │  deposits       │
└─────────────────┘                            └────────┬────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │  PostgreSQL     │
                                              │  Trigger        │
                                              └────────┬────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │  customer_orders│
                                              │  payment_status │
                                              │  (derived)      │
                                              └─────────────────┘
```

**The application layer NEVER writes to `payment_status`.**  
It only reads it for display and Gate evaluation.
