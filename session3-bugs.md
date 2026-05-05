# Session 3: Bug Fixes

Reference: review/findings.md (F1, F3, F5, F6, F7)

## F1 — Performance time overlap comparison broken
- **File**: `src/app/api/performances/route.ts`
- **Fix**: Added `timeToMinutes()` helper and `timesOverlap()` function that converts TIME strings to minutes and handles cross-midnight (end < start → add 1440 min). Replaced naive string comparison.
- **Validation**: `npx tsc --noEmit` — no errors. 2 pre-existing `any` lint warnings remain (not introduced by fix).

## F3 — Occupancy API hardcodes 800 as default capacity
- **File**: `src/app/api/occupancy/[eventId]/route.ts`
- **Fix**: Replaced `event.max_capacity || 800` with `event.max_capacity ?? null`. When max is null, percentage is also null (skipped).
- **Validation**: TypeScript clean, lint clean.

## F5 — Guest list promoter limits documented as incomplete
- **File**: `src/app/api/guest-lists/[listId]/entries/route.ts`
- **Fix**: Added deprecation comment above `PROMOTER_LIMITS` noting the feature is unfinished (no UI, no promoter role, no per-promoter tracking).
- **Validation**: TypeScript clean, lint clean.

## F6 — Door page uses hardcoded demo UUIDs
- **File**: `src/app/door/page.tsx`
- **Fix**: Removed `DEMO_EVENT_ID` and `DEMO_GUEST_LIST_ID` constants. Added `useEffect` to fetch today's published events on mount. Added event selection dropdown. Fetches guest lists for selected event. Passes real event/guest-list IDs to `GuestEntryForm` and `CapacityDashboard`. Shows "No events today" when empty.
- **Validation**: TypeScript clean, lint clean.

## F7 — Document backfill limitation in migration
- **File**: `supabase/migrations/20260427000000_tasks_enhancement_inventory.sql`
- **Fix**: Added comment noting `UPDATE tasks SET created_by = assignee_id` is an approximation and may be incorrect for manager-assigned tasks.
- **Validation**: SQL comment only.

## Verification
- `npx tsc --noEmit` — all errors are pre-existing test file issues (artists.test.ts, events.test.ts, running-order.spec.ts). Zero new errors.
- `npm run lint` — 2 pre-existing `any` warnings in performances/route.ts. All other modified files lint clean.

## Risks
- F6 door page assumes guest lists exist for an event. If none exist, the walk-in form shows a message. Users need to create guest lists via the guest list management UI.
- F1 assumes time format is always `HH:MM:SS` — matches DB TIME column format.
- F3 occupancy API consumers expecting `max: 800` will now get `max: null` for events without max_capacity set.
