# WP-2, WP-3, WP-4 Result

**Status:** ✅ Complete
**Date:** 2026-05-06

## Changes Made

### PART A — `src/lib/permissions.ts` (3 edits)

1. **Added RENTALS permissions (WP-2):**

   ```ts
   RENTALS_READ: ["admin", "manager", "tech", "tech-lead", "booking"],
   RENTALS_WRITE: ["admin", "manager", "tech", "tech-lead", "booking"],
   ```

   Placed after `CONTACTS_READ`, before `ROLES_MANAGE`.

2. **Added "staff" to STAFF_READ (WP-3):**

   ```ts
   // Before: ["admin", "manager", "backoffice"]
   // After:  ["admin", "manager", "backoffice", "staff"]
   ```

3. **Added "staff" to AVAILABILITY_READ (WP-3) + SHIFTS_WRITE (WP-4):**
   ```ts
   // AVAILABILITY_READ: was ["admin", "manager", "backoffice"] → now ["admin", "manager", "backoffice", "staff"]
   // SHIFTS_WRITE:      was ["admin", "manager", "backoffice"] → now ["admin", "manager", "backoffice", "staff"]
   ```

### PART B — Rental Route Files (3 files)

All three files changed from `authenticate(request)` (any authenticated user) to `requireAuth(request, "RENTALS_READ" | "RENTALS_WRITE")`:

| File                                       | GET            | POST            | PUT             | DELETE          |
| ------------------------------------------ | -------------- | --------------- | --------------- | --------------- |
| `src/app/api/rentals/route.ts`             | `RENTALS_READ` | `RENTALS_WRITE` | —               | —               |
| `src/app/api/rentals/[id]/route.ts`        | `RENTALS_READ` | —               | `RENTALS_WRITE` | `RENTALS_WRITE` |
| `src/app/api/rentals/[id]/return/route.ts` | —              | `RENTALS_WRITE` | —               | —               |

Import changed in all three: `import { authenticate }` → `import { requireAuth }`.

## Validation

- [x] Lint: 0 new errors (25 pre-existing `no-explicit-any` errors in unrelated files)
- [x] Unit tests: 122 passed, 2 pre-existing failures (rider extraction API tests)
- [x] Knip: 0 new dead exports (`RENTALS_READ`/`RENTALS_WRITE` consumed by rental routes)
- [x] TypeScript compilation: clean (verified by lint pass)

## Files Modified

1. `src/lib/permissions.ts` — 3 targeted edits
2. `src/app/api/rentals/route.ts` — import + 2 handler changes
3. `src/app/api/rentals/[id]/route.ts` — import + 3 handler changes (GET/PUT/DELETE)
4. `src/app/api/rentals/[id]/return/route.ts` — import + 1 handler change

## Risks / Notes

- **SHIFTS_WRITE now includes "staff"**: This means staff users can create/delete shifts via API (not just clock in/out). The page-level middleware still gated by `ROLE_ROUTE_ACCESS`, but direct API calls would work. If a stricter split is desired, WP-4 suggests Option B (create separate `SHIFTS_CLOCK` permission).

## Recommended Next Steps

- WP-1: Fix unprotected guest-list API routes
- WP-5+9: Staff form profile_id + staff filter bug
- WP-6: Availability self-mode (after WP-3 + WP-5)
