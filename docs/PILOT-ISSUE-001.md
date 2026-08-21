# Pilot Issue Log — PRJ-2026-001

## PILOT-001: Frontend API base URL hardcoded to localhost:3001/api + Vite base config conflict

| Field | Value |
|-------|-------|
| **Issue ID** | PILOT-001 |
| **Date Discovered** | 2026-08-19 |
| **Discovered By** | Founder (pilot facilitator) |
| **Category** | Software Defect |
| **Severity** | 🔴 High |
| **Status** | ✅ Fixed / Verified |

### Description
When the frontend was accessed through the Kimi Work preview environment (port 7100), the Dashboard failed to load with "加载管理驾驶舱失败". Login also failed with "邮箱或密码错误" when credentials were correct.

### Root Cause — TWO issues, not one

**Issue A: `src/lib/api.ts` hardcoded API base URL**
`src/lib/api.ts` hardcoded the API base URL to `http://localhost:3001/api`. When the frontend was served through any port other than the Vite dev server (e.g., Kimi Work preview on 7100), the browser attempted direct cross-port requests to localhost:3001. In sandboxed or preview contexts, these requests were blocked or failed, causing all API calls to fail.

**Issue B: `vite.config.ts` had duplicate `base` keys — the actual blocker**
`vite.config.ts` contained:
```typescript
base: '/',
base: './',   // ← This SECOND line overwrites the first
```
JavaScript objects use the last value for duplicate keys, so `base` was effectively `'./'` even though `base: '/'` was present. This caused the Vite dev server to return 404 on `http://localhost:3000/`, breaking the root path serving. **This was the real reason the login page 404'd after the api.ts fix was applied.**

**Issue C: Stale API process**
The API server process running on port 3001 was started in a previous session and was not restarted after code changes. This caused HTTP 500 errors on login even after the frontend fixes were applied, because the running process was using stale in-memory state.

### Expected Behavior
API requests should work regardless of which port or preview surface serves the frontend, as long as the backend is running. The Vite dev server should correctly serve the root path at `http://localhost:3000/`.

### Actual Behavior
All API calls failed when accessed through non-3000 ports, blocking login and Dashboard loading. After the api.ts fix, the root path (`/`) still returned 404 due to the duplicate `base` key. After restarting the API, login worked correctly.

### Fixes Applied

**Fix A — `src/lib/api.ts` line 1:**
```typescript
// Before
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// After
const API_BASE = import.meta.env.VITE_API_URL || '/api';
```

**Fix B — `vite.config.ts`:**
```typescript
// Before (duplicate keys — second overwrites first)
base: '/',
base: './',

// After (single correct value)
base: '/',
```

**Fix C — Restarted the API server**
Killed the stale API process on port 3001 and started a fresh instance with `npx tsx api/src/index.ts`.

### Access Instructions
The application **must** be accessed at `http://localhost:3000/` (Vite dev server with proxy). `http://localhost:7100/` is the Kimi Work preview surface and has no API proxy — it will not work.

### Workaround (before fix)
None — users could not log in or load Dashboard through the preview surface.

### Verification
- [x] Controlled verification script: 12/12 PASS
- [x] Founder login via 3000 proxy: PASS
- [x] Cammy login via 3000 proxy: PASS
- [x] Dongmei login via 3000 proxy: PASS
- [x] Dashboard loads: PASS
- [x] Project Cockpit loads: PASS
- [x] API requests correctly use `/api/...` path through proxy: PASS
- [x] No hardcoded `localhost:3001/api` in frontend source: PASS
- [x] No duplicate `base` keys in `vite.config.ts`: PASS
- [x] EN/ZH i18n parity: PASS
- [x] Full 113-test regression: 113/113 PASS
  - deposit-ssot: 8/8
  - smart-gate: 13/13
  - quality-audit: 13/13
  - document-access: 19/19
  - bom-management: 26/26
  - eta-tracking: 15/15
  - dashboard: 19/19

### Impact on Frozen Baseline
- Database schema: ❌ No change
- Business logic (SSOT, Smart Gate, Quality Audit, DAC, BOM, ETA, Dashboard): ❌ No change
- RBAC/DAC: ❌ No change
- Frontend architecture: ❌ No change (config fixes only)
- i18n structure: ❌ No change

### Recommended V0.2 Action
1. Add environment-specific `.env.production` and `.env.development` files to make `VITE_API_URL` explicit for each deployment target.
2. Add a startup health-check script that verifies `vite.config.ts` has no duplicate keys before starting the dev server.

---

**End of PILOT-001**
