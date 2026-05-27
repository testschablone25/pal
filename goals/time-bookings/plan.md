# Time Bookings — Implementation Plan

## Solution Approach

Build a standalone time tracking system: a database table for time bookings, API routes for clock in/out and querying, an iPad-optimized kiosk page for staff to tap in/out, and a manager dashboard with editing and CSV export.

Existing shift clock-in/clock-out (`/api/shifts/[id]/clock-in|out`) remains untouched. This is a separate feature.

---

## Steps

### Step 1: Database Migration — `time_bookings` table ✅

**File:** `supabase/migrations/20260606000000_time_bookings.sql`

- Create `time_bookings` table: id, staff_id (FK → staff), clocked_in_at, clocked_out_at, notes, corrected_by (FK → profiles), timestamps
- Add indexes on staff_id and clocked_in_at
- Enable RLS with policies:
  - INSERT: any authenticated user (clock in)
  - UPDATE own open booking: any authenticated user (clock out)
  - SELECT all: managers/admins
  - UPDATE all: managers/admins (corrections)

**Verification:** Run `npx supabase db lint` or apply locally and verify RLS with a quick test query.

---

### Step 2: Permissions — Add TIME_BOOKINGS feature keys ✅

**File:** `src/lib/permissions.ts`

Add to `FEATURE_PERMISSIONS`:
- `TIME_BOOKINGS_READ`: `["admin", "manager", "staff", "backoffice"]` — anyone can see bookings
- `TIME_BOOKINGS_WRITE`: `["admin", "manager", "staff", "backoffice"]` — anyone can clock in/out
- `TIME_BOOKINGS_MANAGE`: `["admin", "manager", "backoffice"]` — edit/correct + dashboard access

Add to `ROLE_ROUTE_ACCESS`:
- `/time-bookings`: `["admin", "manager", "staff", "backoffice"]`

**Verification:** Run `npm run lint` — no type errors from new keys.

---

### Step 3: Zod Validation Schema ✅

**File:** `src/lib/validations/timeBooking.ts`

Schemas:
- `timeBookingClockInSchema` — empty body (no input needed, derives staff_id from auth)
- `timeBookingClockOutSchema` — empty body
- `timeBookingFilterSchema` — optional `date_from`, `date_to`, `staff_id`
- `timeBookingUpdateSchema` — optional `clocked_in_at`, `clocked_out_at`, `notes` (for manager corrections)

**Verification:** Run `npm run lint`.

---

### Step 4: API Routes ✅

**Files:**
- `src/app/api/time-bookings/clock-in/route.ts` — POST clock-in
- `src/app/api/time-bookings/clock-out/route.ts` — POST clock-out
- `src/app/api/time-bookings/route.ts` — GET list + POST manual entry (manager only)
- `src/app/api/time-bookings/[id]/route.ts` — PUT edit (manager only)
- `src/app/api/time-bookings/me/route.ts` — GET current user's active booking status

**Logic:**
- `clock-in`: Authenticated user → find their staff_id → if they have an open booking, close it → create new one with `clocked_in_at = NOW()`
- `clock-out`: Authenticated user → find open booking → set `clocked_out_at = NOW()` → 400 if none
- `GET`: List with filters. Non-managers only see their own. Managers see all. Join staff + profiles for names.
- `PUT [id]`: Manager-only. Edit clocked_in_at, clocked_out_at, notes. Set `corrected_by = auth.uid()`.
- `GET /me`: Lightweight endpoint for kiosk to show "you are clocked in" state without loading all staff.

**Verification:** `npm run lint`. Manual test with curl.

---

### Step 5: Kiosk Page — `/time-bookings` ✅

**Files:**
- `src/app/time-bookings/page.tsx` — server component, fetches staff list
- `src/components/time-bookings/kiosk-view.tsx` — client component, full-screen iPad layout

**Design:**
- Full-viewport, large staff grid/cards
- Each card: name, role, big Clock In (green) / Clock Out (red) button
- Search bar at top
- Auto-refresh every 30s via `setInterval` polling `/api/time-bookings`
- Uses `authenticate()` (not `requireAuth`) — any logged-in user can access
- Large tap targets (min 48px), high contrast, no distracting nav elements
- When a staff member clicks clock in/out, calls the API, shows toast, updates local state

**Verification:** `npm run build`, `npm run lint`. Open on browser/iPad simulator.

---

### Step 6: Manager Dashboard — `/time-bookings/dashboard` ✅

**Files:**
- `src/app/time-bookings/dashboard/page.tsx` — server component, requires `TIME_BOOKINGS_MANAGE`
- `src/components/time-bookings/dashboard-view.tsx` — client component

**Features:**
- "Currently Clocked In" section at top — live list with elapsed time
- Date range picker (default: today)
- Table: Staff Name | Role | Clock In | Clock Out | Duration | Notes | Actions (Edit)
- Total hours summary per staff member for selected range
- CSV export button
- Edit dialog: click a row → modal with clocked_in_at, clocked_out_at, notes fields

**Verification:** `npm run build`, `npm run lint`.

---

### Step 7: Staff Sub-Nav Integration ✅

**File:** `src/components/staff/staff-sub-nav.tsx`

Add "Time Bookings" link pointing to `/time-bookings`.

**Verification:** Visual check — nav renders correctly.

---

### Step 8: Tests (existing tests pass, new tests deferred)

**Files:**
- `src/test/integration/time-bookings-api.test.ts` — clock in/out API tests
- `src/test/e2e/time-bookings-kiosk.spec.ts` — kiosk page e2e (Playwright)

**Verification:** `npm run test:unit` and `npm run test:e2e`.

---

### Step 9: Quality Gates ✅

Run: `npm run build`, `npm run lint`, `npm run knip`, `npm run jscpd`, `npm run test:unit`

---

## Risks / Open Questions

- **Persistent iPad session:** The current auth cookies may expire. We may need to extend cookie lifetime for the iPad kiosk account or use a dedicated "kiosk mode" setting. This can be handled as a follow-up.
- **Staff without auth accounts:** Currently only staff with PAL auth accounts can clock in. If walk-in staff need to clock in too, a quick name-entry flow could be added later.
- **Concurrent iPads:** Multiple iPads hitting the same kiosk page is fine — state lives in the database, not local storage.
