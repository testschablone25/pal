# Code Context: Shift Scheduling System

## Files Retrieved

### Database Schema

1. `supabase/migrations/20240324000000_initial_schema.sql` (lines 1-210) - Full schema with all tables, enums, RLS, and triggers
2. `supabase/migrations/20240325000000_relax_rls_for_public.sql` (lines 1-18) - Relaxed RLS for public-facing tables

### API Routes

3. `src/app/api/shifts/route.ts` (full, ~170 lines) - GET list + POST create shifts
4. `src/app/api/shifts/[id]/route.ts` (full, ~140 lines) - GET/PUT/DELETE single shift
5. `src/app/api/availability/route.ts` (full, ~130 lines) - GET list + POST upsert availability
6. `src/app/api/availability/[id]/route.ts` (full, ~100 lines) - PUT/DELETE single availability
7. `src/app/api/staff/route.ts` (full, ~155 lines) - GET list + POST create staff
8. `src/app/api/staff/[id]/route.ts` (full, ~140 lines) - GET/PUT/DELETE single staff
9. `src/app/api/dashboard/route.ts` (full, ~100 lines) - Dashboard aggregator that fetches shifts + colleagues + events

### Client Pages & Components

10. `src/app/staff/shifts/page.tsx` (full, ~460 lines) - Shift scheduling page with timeline view + list view + create dialog
11. `src/app/staff/availability/page.tsx` (~20 lines) - Availability page wrapping AvailabilityCalendar
12. `src/app/staff/page.tsx` (~310 lines) - Staff listing page with search/filter/delete
13. `src/app/staff/new/page.tsx` (~15 lines) - Add staff page wrapping StaffForm
14. `src/app/page.tsx` (lines 1-620) - Dashboard showing upcoming shifts, colleagues, tasks
15. `src/app/workflow/page.tsx` (~430 lines) - Kanban board (tasks only, no shift references)

### Shared Components

16. `src/components/availability-calendar.tsx` (full, ~380 lines) - Monthly calendar grid with per-staff availability marking
17. `src/components/staff-form.tsx` (full, ~210 lines) - Staff creation/edit form with Zod validation
18. `src/components/calendar-view.tsx` (lines 1-50) - Event calendar view (not shift-related)
19. `src/components/nav-bar.tsx` (full, ~55 lines) - Navigation with "Staff" link pointing to `/staff`

### Utilities & Config

20. `src/lib/supabase/config.ts` (~20 lines) - Supabase URL, publishable key, service key
21. `src/lib/supabase/server.ts` (~30 lines) - Server-side Supabase client factory

### Plans & Memories

22. `.sisyphus/plans/pal-implementation-continuation.md` (full) - Implementation plan detailing Phase 2 (Staff Planning) with API, UI, and tests
23. `.sisyphus/plans/nightclub-booking-system-review.md` (full) - Gap analysis covering German labor law, shift edge cases
24. `.factory/memories.md` (full) - Architecture decisions, known issues, implementation status

---

## Key Code

### Database Tables (from initial_schema.sql)

```sql
-- STAFF
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL,
  contract_type contract_type NOT NULL,  -- 'permanent' | 'freelance' | 'minor'
  is_minor BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHIFTS
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  role TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  break_minutes INT DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVAILABILITY
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);
```

**Key Schema Notes:**

- `shifts` has indexes on `event_id` and `staff_id`, plus an `update_updated_at` trigger
- `availability` has a unique constraint on `(staff_id, date)` — upsert pattern
- No `shift_templates`, `shift_requirements`, `shift_swaps`, `time_off` tables exist
- Staff `role` is a free-text field (not an enum), but the frontend constrains to 10 predefined roles
- RLS policies on shifts/availability are declared but NOT defined (only profiles, events, guest_entries have policies)

### Shift API: GET /api/shifts (lines 23-72)

- Supports filters: `event_id`, `staff_id`, `status`, `date_from`, `date_to`
- Joins `staff(staff_id → profiles(profile_id → id, full_name, email))` and `events(event_id → id, name, date)`
- Uses service role key directly (bypasses RLS)
- Pagination via `limit`/`offset` query params (default limit=100)
- **No Zod validation** — manual field checks with string conditions

### Shift API: POST /api/shifts (lines 86-160)

- Manual validation for required fields (event_id, staff_id, role, start_time, end_time)
- No overlap/conflict detection
- No availability check before creation (only client-side visual warning)
- Returns `{ error: string }` on failure, `{ shift }` on success

### Availability API: POST /api/availability (lines 65-120)

- Uses `upsert` with `onConflict: 'staff_id,date'`
- If `available=true`, `reason` is set to null
- Manual validation (no Zod)

### Shift Scheduling Page (`staff/shifts/page.tsx`)

- Single-page client component with inline interfaces (Event, StaffMember, Shift, Availability)
- Timeline view: assumes 18:00-06:00 operating hours, positions shifts as colored bars
- List view: shows staff name, role, time, break, status badge, and "unavailable" warnings
- Create dialog: uses react-hook-form + Zod, but the schema is **inline** (no shared validation)
- Delete confirmation dialog
- Fetches events (published only), staff (all), shifts (by event_id), availability (by event date)
- **No edit shift functionality** — only create and delete
- **No bulk/batch import** for shifts

### Availability Calendar (`availability-calendar.tsx`)

- Monthly calendar grid per-staff member
- Click a date → dialog with available/unavailable buttons + reason textarea
- Uses POST /api/availability (upsert) and DELETE /api/availability/[id]
- Legend shows available (green), unavailable (red), not set (zinc)

### Dashboard Integration (`page.tsx`, lines 454-620)

- Fetches shifts via `/api/dashboard?user_id=...`
- Shows today's shifts + upcoming shifts (up to 2)
- Shows colleagues working the same events
- Links to `/staff/shifts` and `/staff/availability`
- German locale (`date-fns/locale/de`)

### Staff API Pattern

- All API routes use `createClient(supabaseConfig.url, supabaseConfig.serviceKey)` directly → service role bypasses RLS
- No Zod schemas (despite the plan document describing `src/lib/validations/staff.ts` and `src/lib/validations/shift.ts` — these files don't exist)
- Pagination via `.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer (service role)                   │
│  /api/shifts       GET (list)  POST (create)                     │
│  /api/shifts/[id]  GET  PUT  DELETE                              │
│  /api/availability GET (list) POST (upsert)                      │
│  /api/availability/[id] PUT  DELETE                              │
│  /api/staff         GET (list) POST (create)                     │
│  /api/staff/[id]    GET  PUT  DELETE                             │
│  /api/dashboard     GET (aggregator: shifts+tasks+colleagues)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Client Pages                                 │
│  /staff            → Staff directory (list + search + delete)    │
│  /staff/new        → StaffForm (create)                          │
│  /staff/[id]/edit  → StaffForm (edit)                            │
│  /staff/shifts     → Shift scheduling (timeline + list + create) │
│  /staff/availability → AvailabilityCalendar (monthly grid)       │
│  /                 → Dashboard (shifts + tasks + colleagues)     │
└─────────────────────────────────────────────────────────────────┘

Data Flow:
  User selects Event → fetches shifts + availability → timeline renders
  User creates Shift → POST /api/shifts → refetch shifts
  User toggles Availability → POST /api/availability (upsert) → refetch

Missing:
  - No shared types/validation between client and API
  - No service/client auth separation (all use service role)
  - No conflict detection
  - No batch operations
  - No time_off / shift_swaps / shift_templates tables
  - No payroll/hour tracking integration
  - No notifications on shift creation
  - Workflow/Kanban page (in `/workflow`) has zero references to shifts
```

---

## Start Here

**First file to open:** `src/app/staff/shifts/page.tsx`

- This is the primary shift scheduling UI — single file containing all the client logic
- Shows the current architecture: event selector, timeline, list view, create/delete dialogs
- Demonstrates the inline type definitions, inline Zod schema, manual API fetch patterns
- Reveals all missing features at a glance (no edit, no batch, no conflict detection, no labor law compliance)

Then read `src/app/api/shifts/route.ts` to understand the API counterpart.

---

## Pain Points & Missing Features

### Critical Missing Features

1. **No conflict detection** — Shifts can overlap; double-booking possible
2. **No labor law compliance** — No break enforcement, max-hours, minor restrictions, or rest-period checks (German MiLoG/JuSchG)
3. **No shift editing** — Only create and delete; cannot modify existing shifts in the UI
4. **No shift swap workflow** — No `shift_swaps` or `time_off` tables or UI
5. **No batch operations** — Cannot create shifts for multiple staff at once or import from templates
6. **No payroll integration** — `hourly_rate` exists on staff but no hours calculation or payroll view
7. **No notifications** — No triggers on shift creation/change for staff
8. **No shared validation** — Zod schemas are inline in the client, API uses manual checks; no `src/lib/validations/` exists despite plan documents
9. **No RLS policies on shifts/availability** — RLS is enabled on these tables but no policies defined (only profiles/events/guest_entries have policies)

### Architectural Concerns

1. **Service role key in all API routes** — Bypasses RLS entirely, used for both read and write
2. **No integration tests for shifts** — `src/test/integration/` has artists, checkin, events tests but no shifts/availability/staff tests
3. **No unit tests for shift/availability** — Only `task-needs-refining.test.ts` in unit tests
4. **No E2E tests for shifts** — No specs found for shift scheduling flows
5. **No `shift_templates`, `shift_requirements`** — Cannot define recurring shift patterns or role requirements per event type
6. **No time-off tracking beyond availability** — Availability only marks entire days as available/unavailable; no half-day or time-range options

---

## Integration Touchpoints Affected by Rework

| Area                                       | Current State                                      | Change Required                                                         |
| ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------- |
| **Dashboard** (`/page.tsx`)                | Shows shifts via `/api/dashboard` aggregator       | Needs updated type definitions if shift shape changes                   |
| **Nav bar** (`/nav-bar.tsx`)               | Links to `/staff` (which links to `/staff/shifts`) | May need direct `/staff/shifts` nav item                                |
| **Workflow/Kanban** (`/workflow/page.tsx`) | Currently has no shift awareness                   | Could show shift-related tasks per event                                |
| **Event pages**                            | No shift info on event detail                      | Could display staffing requirements                                     |
| **API auth pattern**                       | All use service role key                           | Should use server client with auth context for user-specific operations |

### Data Flow Dependencies

- `shifts.event_id → events.id` (ON DELETE CASCADE)
- `shifts.staff_id → staff.id`
- `staff.profile_id → profiles.id`
- `availability.staff_id → staff.id` (ON DELETE CASCADE)
- Dashboard aggregates shifts + staff + tasks in one endpoint

---

## Remaining Clarification Questions

1. **What shift types/templates are needed?** — e.g., "Door staff 22:00-06:00", "Bar staff 23:00-05:00" as reusable templates per event type?
2. **What labor law rules to enforce?** — German law requires max 10h/shift, 11h rest, 48h/week average, minor restrictions. Which subset to implement now?
3. **Shift swap/request workflow?** — Do staff self-schedule picks, or managers assign? Any swap approval flow?
4. **Payroll scope?** — Just track hours for export, or full payroll calculation with overtime/break deductions?
5. **Notification triggers?** — Email/SMS on shift assignment, change, reminder? Using the existing `notifications` table?
6. **Batch import source?** — CSV upload, copy from last event, template-based generation?
7. **Staff profile linking to auth users?** — Currently staff profiles link to `profiles.id` but staff page doesn't create auth users; is this expected?
8. **Timeline operating hours?** — Currently hardcoded 18:00-06:00. Should this be event-configurable?
9. **Recurring events?** — Club runs 2 nights/week; should shifts copy/duplicate between similar event dates?
10. **Edit vs delete+recreate?** — UI has no edit; should we add inline editing on timeline bars or a dialog?
