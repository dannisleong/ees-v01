# EES V0.1 — First Pilot Session with Cammy & Dongmei

**Date:** __________  
**Facilitator:** __________  
**Participants:** Cammy (Design & Customer Lead), Dongmei (China Supply Chain Director)  
**Project:** PRJ-2026-001 — Dongmei Home  
**System Version:** V0.1 Phase 1 UX (Frozen)

---

## Opening Script (1 minute)

> "This is our first operating pilot. Please use the system as you would use it on a real project.  
> If something doesn't make sense, don't try to work around it silently — tell us.  
> We want to capture what the system needs to improve.  
> There are no wrong answers. If you get confused, that's valuable feedback."

---

## Session Ground Rules

1. **No test scripts.** Cammy and Dongmei operate the system freely.
2. **Think aloud.** Speak what you are looking for, what you expect to see, and what surprises you.
3. **No silent workarounds.** If you would normally open Excel or send a WeChat message instead, tell us.
4. **No code fixes during the session.** Issues are recorded, not solved on the spot.
5. **One hour max.** Stop while energy is still high.

---

## Suggested Flow (Facilitator keeps time loosely)

### 1. Login & First Look (5 min)
- Cammy and Dongmei log in with their own accounts
- Each opens the Dashboard
- **Observe:** Do they understand the attention banner? Do KPI numbers match their mental model?

### 2. Project Cockpit (10 min)
- Open PRJ-2026-001
- Browse through tabs: Overview → Order & Deposit → BOM → ETA → Gates → Quality → Risks
- **Observe:** Do they find what they expect? Is anything missing?

### 3. BOM Approval (Dongmei) (10 min)
- Dongmei navigates to BOM tab
- Reviews BOM-001 (Solid Oak Kitchen Cabinet)
- Submits and approves the item
- **Observe:** Does she understand the approval flow? Does she see supplier info clearly?

### 4. Dashboard Review (Cammy) (5 min)
- Cammy returns to Dashboard
- Checks if approved BOM count updated
- **Observe:** Does the alert make sense? Is ownership clear?

### 5. ETA Update (Dongmei) (10 min)
- Dongmei opens ETA tab
- Updates Forecast ETA for a BOM item (simulate a delay)
- **Observe:** Does she understand forecast vs planned vs actual? Does the alert trigger?

### 6. Issue Recording (5 min)
- Show Cammy how to record a pilot issue
- Cammy records one observation from the session
- **Observe:** Is the issue form intuitive? Does she know what category to pick?

### 7. Closing (5 min)
- Each participant shares: **one thing that worked well** and **one thing that confused them**
- Facilitator records these verbally as pilot issues
- Confirm next session date

---

## What NOT to Do

❌ Do not show Cammy and Dongmei the 113 automated tests  
❌ Do not explain the database schema or Prisma migrations  
❌ Do not describe the Smart Gate engine logic  
❌ Do not fix bugs during the session  
❌ Do not take over the mouse to "show them how" — let them click  
❌ Do not extend beyond 60 minutes

---

## What TO Capture

✅ Every "hmm" or pause — indicates confusion  
✅ Every "where is...?" — indicates missing information architecture  
✅ Every "I would normally do this in Excel/WeChat" — indicates system gap  
✅ Every incorrect alert or wrong owner assignment  
✅ Every language-switching glitch  
✅ Every moment they need help to proceed

---

## Post-Session (Facilitator only — 10 min)

1. Transfer verbal observations into formal Pilot Issue Log entries
2. Number the issues sequentially: `PILOT-001`, `PILOT-002`, etc.
3. Assign categories: Business Rule / SOP / UX / Software Defect
4. Assign severity: Critical / High / Medium / Low
5. Assign owner (Cammy / Dongmei / Founder / PM)
6. Save issues to `EES-Pilot-Issues-PRJ-2026-001`

---

## Session Checklist

- [ ] PostgreSQL running
- [ ] `npm run dev` started
- [ ] Both participants have credentials written down
- [ ] Facilitator has Pilot Issue Log template open
- [ ] Screen recording agreed (optional but recommended)
- [ ] 60-minute timer set
- [ ] No code editor open — this is observation only

---

**End of First Session Guide**
