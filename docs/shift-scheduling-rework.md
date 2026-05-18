# Shift Scheduling Rework — Production Launch Plan

**Goal:** Full rework of the scheduling module for PAL production launch  
**Timeline:** 2 weeks  
**Status:** Planning Phase — Ready for execution

---

## Executive Summary

This plan reworks the shift scheduling system from the ground up, targeting a **production launch in 2 weeks**. The current system is a basic CRUD-only skeleton (create/delete shifts, simple timeline, no validation). We're building a production-grade scheduling module with:

- **Venue sub-location–aware shifts** (staff assigned to specific rooms/stages/areas within a venue — e.g. KERN, ORB, ORBIT)
- **Event-driven timeline** (operating hours derived from event `door_time`/`end_time`)
- **Drag-and-drop shift creation** using existing `@dnd-kit` infrastructure
- **Shift templates** (save/apply shift plans by name)
- **Staff self-service** (logged-in staff view their shifts, mark availability)
- **Conflict detection** (overlapping shift prevention)

**Phase structure (2 weeks):**

| Phase | Focus                            | Days | Ship Critical |
| ----- | -------------------------------- | ---- | ------------- |
| 1     | Schema + Shared Validation       | 2    | ✅ Yes        |
| 2     | Shift API Rework                 | 2    | ✅ Yes        |
| 3     | Shift UI Rework (Timeline + DnD) | 4    | ✅ Yes        |
| 4     | Staff Self-Service               | 2    | ✅ Yes        |
| 5     | Templates                        | 2    | ✅ Yes        |
| 6     | Polish + Integration             | 2    | ✅ Yes        |

---

## Current State

### Schema (existing)

```sql
-- ✅ venue_sub_locations already exists! (KERN, ORB, ORBIT seeded per venue)
venue_sub_locations (id, venue_id, name, description, capacity)

venues (id, name, address, capacity, venue_type, is_pal_location, ...)
shifts (id, event_id, staff_id, role, start_time, end_time, break_minutes, status)
staff (id, profile_id, role, contract_type, is_minor, hourly_rate)
availability (id, staff_id, date, available, reason)
```

### Sub-Locations (existing — no work needed here)

- **Table:** `venue_sub_locations` with `id, venue_id, name, description, capacity, created_at`
- **Seeded:** KERN (Main dancefloor), ORB (Second room/ambient), ORBIT (Bar/lounge) for the main venue
- **API:** Full CRUD at `/api/venues/[id]/sublocations/` and `...[subId]/route.ts`
- **UI:** `VenueSubLocationForm` component with add/delete dialog, integrated into venues page
- **Used by:** `items.sub_location_id`, `task_items.goal_sub_location_id`
- **Not yet connected to:** `shifts`

### API (existing — all use service role key, no Zod validation)

- `GET/POST /api/shifts` — manual field checks, no conflict detection
- `GET/PUT/DELETE /api/shifts/[id]` — manual field checks
- `GET/POST /api/availability` — manual checks, upsert pattern
- `GET/PUT/DELETE /api/availability/[id]`
- `GET/POST /api/venues/[id]/sublocations/` — sub-location CRUD ✅ (already exists)
- `PUT/DELETE /api/venues/[id]/sublocations/[subId]/`

### UI (existing — single-page client component at `/staff/shifts`)

- Inline types + inline Zod schema (no shared schemas)
- Timeline hardcoded 18:00-06:00, not derived from event
- Create + Delete only (no edit)
- No sub-location/room assignment
- No drag-and-drop
- No templates

### Existing infrastructure we reuse:

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — already installed, used in `running-order.tsx` and `task-card.tsx`
- `react-hook-form` + `zod` + `@hookform/resolvers` — form validation pattern
- `lucide-react` — icons
- `date-fns` — date formatting
- `profiles` + `user_roles` tables — staff auth infrastructure exists
- `notifications` table — schema exists for future use
- `venue_sub_locations` table + CRUD API + UI — already built for inventory, now reused for shifts

---

## Phase 1: Schema + Shared Validation (2 days)

### 1A — Migration: Add `sub_location_id` to Shifts (no new table needed)

**`venue_sub_locations` already exists** with seeded data (KERN, ORB, ORBIT). We just need to link shifts to it:

```sql
ALTER TABLE shifts ADD COLUMN sub_location_id UUID REFERENCES venue_sub_locations(id);
CREATE INDEX idx_shifts_sub_location_id ON shifts(sub_location_id);
```

### 1B — Migration: Add `clock_in` / `clock_out` columns (for future)

```sql
ALTER TABLE shifts ADD COLUMN clocked_in_at TIMESTAMPTZ;
ALTER TABLE shifts ADD COLUMN clocked_out_at TIMESTAMPTZ;
ALTER TABLE shifts ADD COLUMN actual_break_minutes INT;
```

(These are schema-only — UI/API for clock-in is future. Keeps migration atomic.)

### 1C — Shared Validation Schemas

Create `src/lib/validations/shift.ts`:

```typescript
import { z } from "zod/v4"; // zod 4.x

export const shiftStatusEnum = z.enum([
  "draft",
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
]);

export const shiftCreateSchema = z.object({
  event_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  role: z.string().min(1),
  sub_location_id: z.string().uuid().nullable().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  break_minutes: z.number().int().min(0).default(0),
  status: shiftStatusEnum.default("draft"),
});

export const shiftUpdateSchema = shiftCreateSchema.partial();

export const shiftFilterSchema = z.object({
  event_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  sub_location_id: z.string().uuid().optional(),
  status: shiftStatusEnum.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ShiftCreate = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdate = z.infer<typeof shiftUpdateSchema>;
export type ShiftFilter = z.infer<typeof shiftFilterSchema>;
```

Create `src/lib/validations/availability.ts`:

```typescript
import { z } from "zod/v4";

export const availabilityUpsertSchema = z.object({
  staff_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available: z.boolean(),
  reason: z.string().nullable().optional(),
});

export type AvailabilityUpsert = z.infer<typeof availabilityUpsertSchema>;
```

Create `src/lib/validations/template.ts`:

```typescript
import { z } from "zod/v4";

export const templateSlotSchema = z.object({
  role: z.string().min(1),
  sub_location_id: z.string().uuid().nullable().optional(),
  count: z.number().int().min(1),
  start_offset_minutes: z.number().int(), // relative to door_time
  duration_minutes: z.number().int().min(30),
  break_minutes: z.number().int().min(0).default(0),
});

export const shiftTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  slots: z.array(templateSlotSchema).min(1),
});

export type ShiftTemplate = z.infer<typeof shiftTemplateSchema>;
export type TemplateSlot = z.infer<typeof templateSlotSchema>;
```

**Files to create:**

```
src/lib/validations/shift.ts
src/lib/validations/availability.ts
src/lib/validations/template.ts
supabase/migrations/20260518000001_shifts_sub_location_id.sql
supabase/migrations/20260518000002_shifts_clock_columns.sql
```

---

## Phase 2: Shift API Rework (2 days)

### 2A — Sub-Locations API (already exists — no work needed)

Sub-locations are already fully CRUD-capable:

| Route                                          | Description                    | Status      |
| ---------------------------------------------- | ------------------------------ | ----------- |
| `GET /api/venues/[id]/sublocations`            | List sub-locations for a venue | ✅ Existing |
| `POST /api/venues/[id]/sublocations`           | Create sub-location            | ✅ Existing |
| `PUT /api/venues/[id]/sublocations/[subId]`    | Update sub-location            | ✅ Existing |
| `DELETE /api/venues/[id]/sublocations/[subId]` | Delete sub-location            | ✅ Existing |
| `VenueSubLocationForm` component               | Add/delete UI on venues page   | ✅ Existing |

The shift scheduling page will call `GET /api/venues/[id]/sublocations` (where `id` is the event's venue) to populate the sub-location dropdown.

### 2B — Rewrite `/api/shifts` with Zod validation + conflict detection

**Conflict detection logic (POST & PUT):**
After validating with Zod, check for overlapping shifts for the same staff_id (excluding cancelled/completed):

```typescript
async function checkShiftConflict(
  staffId: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string,
): Promise<ShiftConflict | null> {
  let query = supabase
    .from("shifts")
    .select("id, start_time, end_time, role, events!inner(name)")
    .eq("staff_id", staffId)
    .not("status", "in", '("cancelled","completed")')
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeShiftId) {
    query = query.neq("id", excludeShiftId);
  }

  const { data } = await query;
  return data && data.length > 0 ? data[0] : null;
}
```

**GET /api/shifts** — Add `sub_location_id` filter, include venue_sub_locations data in joins  
**POST /api/shifts** — Zod validation → conflict check → insert with `sub_location_id`  
**PUT /api/shifts/[id]** — Zod validation → conflict check (exclude self) → update  
**DELETE /api/shifts/[id]** — Soft delete (set status = 'cancelled') or hard delete

**Response shape:**

```typescript
interface ShiftResponse {
  id: string;
  event_id: string;
  staff_id: string;
  role: string;
  sub_location_id: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: string;
  staff: {
    id: string;
    role: string;
    contract_type: string;
    profiles: { full_name: string | null; email: string | null };
  };
  venue_sub_locations: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  events: {
    id: string;
    name: string;
    date: string;
    door_time: string;
    end_time: string;
  };
}
```

### 2C — Rewrite `/api/availability` with Zod

- Same pattern: Zod validation → upsert
- Add filter for `staff_id`, `date_from`, `date_to`

### 2D — Template API

```
GET  /api/shift-templates — List all templates
POST /api/shift-templates — Create template (+ slots)
GET  /api/shift-templates/[id] — Get template with slots
PUT  /api/shift-templates/[id] — Update template
DELETE /api/shift-templates/[id] — Delete template
POST /api/shift-templates/[id]/apply — Apply template to an event (generates shifts)
```

**Apply logic** — Given an event with `door_time` + `end_time`:

```typescript
for (const slot of template.slots) {
  const shiftStart = addMinutes(eventDoorTime, slot.start_offset_minutes);
  const shiftEnd = addMinutes(shiftStart, slot.duration_minutes);
  // Create `slot.count` shifts for available staff matching slot.role
  // Assign to slot.sub_location_id if set
}
```

### 2E — Dashboard API Update

Update `/api/dashboard` to include new shift shape (sub_location_id, venue_sub_locations data).

**Files to modify:**

```
src/app/api/shifts/route.ts                     # REWRITE
src/app/api/shifts/[id]/route.ts                # REWRITE
src/app/api/availability/route.ts               # REWRITE
src/app/api/availability/[id]/route.ts          # REWRITE
src/app/api/shift-templates/route.ts            # NEW
src/app/api/shift-templates/[id]/route.ts       # NEW
src/app/api/shift-templates/[id]/apply/route.ts # NEW
src/app/api/dashboard/route.ts                  # UPDATE
```

---

## Phase 3: Shift UI Rework (4 days)

### 3A — Sub-Locations Management (already exists — no work needed)

The `VenueSubLocationForm` component at `src/components/venues/venue-sub-location-form.tsx` already provides full CRUD for sub-locations, integrated into the venues page. No new UI needed.

The shift scheduling page will fetch sub-locations via the existing API and display them in a dropdown on the shift form.

### 3B — Shift Timeline Component (Core)

Build a new **event-driven timeline** that replaces the hardcoded 18:00-06:00.

**Key features:**

- X-axis spans from `event.door_time` to `event.end_time` (may cross midnight)
- Each row = a venue sub-location (grouped), then staff within each sub-location
- Colored bars = shifts, color-coded by role
- **Drag from empty row space to create a shift** (click-and-drag on timeline)
- Click existing shift to edit
- Delete button (inline or on hover)
- Current time indicator line
- Hourly gridlines

**Architecture:**

```
src/components/shifts/timeline/shift-timeline.tsx         # Main timeline container
src/components/shifts/timeline/timeline-header.tsx        # Hour labels + grid
src/components/shifts/timeline/timeline-row.tsx           # One row = one staff member
src/components/shifts/timeline/shift-block.tsx            # Draggable/clickable shift bar
src/components/shifts/timeline/timeline-utils.ts          # Time → px, px → time conversion
src/components/shifts/timeline/use-timeline-dnd.ts        # Custom hook for drag-and-drop logic
```

**Drag-and-drop approach:**
Use `@dnd-kit` with a custom sensor. The timeline is a large `<div>` divided into columns (staff rows). Dragging on empty row space triggers a "create shift" action:

```typescript
// use-timeline-dnd.ts
// PointerSensor with activation constraint (min distance to distinguish click from drag)
// On drag start from empty space → show ghost shift block
// On drag end → compute start_time/end_time from pixel position
// → POST /api/shifts with the computed times
```

### 3C — Shift Form Dialog (Create/Edit)

**Components:**

```
src/components/shifts/shift-form-dialog.tsx    # REWRITE - Shared create/edit dialog
src/components/shifts/shift-details.tsx        # NEW - Read-only detail view (for staff self-service)
```

**Form fields:**

- Staff member (dropdown, filtered by role, shows availability badge)
- Role (dropdown from STAFF_ROLES constant, auto-filled if creating from role-filtered row)
- Sub-location (dropdown of venue sub-locations for the event's venue — fetched via existing API)
- Start time + End time (time inputs, pre-filled from timeline drag)
- Break (minutes, number input)
- Status (dropdown: draft → scheduled → confirmed → completed → cancelled)

### 3D — Shift Slot / Timeline Interactions

Building on the existing `@dnd-kit` infrastructure in `running-order.tsx`:

**Horizontal drag on timeline (create shift):**

1. User mousedowns on empty timeline row
2. Ghost block appears, follows cursor horizontally
3. On mouseup → compute start_time/end_time from pixel position (snapped to 30-min intervals)
4. Open shift-form-dialog with pre-filled times, staff, role, sub-location

**Click on existing shift block:**

- Open shift-form-dialog in edit mode

**Hover on shift block:**

- Show tooltip with: staff name, role, time range, break, status, sub-location
- Show delete button (trash icon)

### 3E — Event Selector + Info Bar

Refactor the existing event selector. When an event is selected:

- Load venue sub-locations for that event's venue via existing `/api/venues/[id]/sublocations`
- Show event info (venue name, date, door_time → end_time)
- Show staffing summary (X shifts across Y staff, grouped by role/sub-location)
- Timeline renders with dynamic hours from event's door_time/end_time

**Files to modify:**

```
src/app/staff/shifts/page.tsx    # REWRITE — full page replacement
```

### 3F — Remove Old Files

```
src/components/staff/shift-calendar.tsx   # DELETE or REWRITE (if exists)
```

---

## Phase 4: Staff Self-Service (2 days)

### 4A — Staff Dashboard / "My Shifts" View

A dedicated page where logged-in staff see their own shifts.

**Components:**

```
src/app/my-shifts/page.tsx                     # NEW — Staff's personal shift view
src/components/shifts/my-shifts-list.tsx        # NEW — List of upcoming shifts
src/components/shifts/my-shifts-calendar.tsx    # NEW — Calendar overview for staff
```

**Features:**

- Upcoming shifts list (next 30 days, sorted by date)
- Each shift shows: event name, date, role, sub-location, time range, break, status
- "Confirm" button for draft/scheduled shifts
- "Request swap" placeholder (UI only, logic is future)
- Calendar overview with shift markers

### 4B — Nav Bar Update

Add "My Shifts" link to nav (visible to staff role users):

```
src/components/nav-bar.tsx   # UPDATE — add "Meine Schichten" link
```

### 4C — Staff Availability Integration

On the shift creation form, show availability status for each staff member for the event date:

- Green dot: available
- Red dot: unavailable (with reason tooltip)
- Gray dot: no availability data

Filter out staff marked as unavailable from the dropdown (with an override toggle for managers).

---

## Phase 5: Shift Templates (2 days)

### 5A — Template Manager UI

```
src/app/shift-templates/page.tsx                   # NEW — Template list
src/app/shift-templates/new/page.tsx               # NEW — Create template
src/app/shift-templates/[id]/edit/page.tsx         # NEW — Edit template
src/components/templates/template-list.tsx         # NEW
src/components/templates/template-form.tsx         # NEW
src/components/templates/template-slot-row.tsx     # NEW
```

**Template form fields:**

- Template name (text)
- Description (textarea, optional)
- Slots (repeating group):
  - Role (dropdown)
  - Sub-location (dropdown of venue sub-locations — nullable)
  - Count (number, how many staff with this role)
  - Start offset (number of minutes before/after door_time)
  - Duration (minutes)
  - Break (minutes)
- "Save Template" button

### 5B — Apply Template to Event

On the shift scheduling page, add a "Apply Template" button that opens a dialog:

1. Select a template from dropdown
2. Preview generated shifts (staff assignments are best-effort)
3. Confirm to batch-create shifts

**Batch creation logic:**

- For each template slot with `count > 1`, find available staff matching the role
- If not enough available staff → show warning, create what we can
- Create shifts with `status: 'draft'`

### 5C — Save Current Shifts as Template

On the shift scheduling page, add "Save as Template" button that:

1. Collects all shifts for the current event
2. Groups by role + sub-location, computes offsets from event.door_time
3. Opens template form pre-filled with the derived slots
4. Manager can edit name, description, adjust counts/times before saving

### 5D — Long-Term Plan Note (Templates)

**`LNP: Shift Template Optimization`**

- Track template usage metrics (how often each template is used, how often shifts deviate from template)
- After ~20 events, analyze: which template slot counts are consistently adjusted? Which roles are over/understaffed?
- Build a recommendation engine: "Based on your last 10 Saturday events, you typically need 5 bar staff, not 4"
- Integrate with event capacity: if event.max_capacity changes, scale security count proportionally
- Seasonal adjustments: summer vs winter staffing patterns
- Data-driven template suggestions based on: day of week, event type tag, ticket sales (pre-sale count), artist/genre

---

## Phase 6: Polish + Integration (2 days)

### 6A — Dashboard Update

Update the home dashboard to reflect the new shift data shape. Show:

- Upcoming shifts for the logged-in user (if staff role)
- Staffing overview for upcoming events (if manager role)
- Quick links: "My Shifts", "Schedule Event", "Templates"

### 6B — Event Pages Integration

On event detail pages (existing or upcoming), show:

- Staffing summary card: "5 bar, 3 security, 2 door scheduled"
- Link to shift scheduling page pre-filtered to this event
- Venue sub-locations list for the event's venue

### 6C — Testing

**Unit tests:**

- `src/test/unit/validations/shift.test.ts` — Zod schema validation
- `src/test/unit/validations/availability.test.ts`
- `src/test/unit/validations/template.test.ts`
- `src/test/unit/components/shift-form-dialog.test.ts`
- `src/test/unit/components/template-form.test.ts`
- `src/test/unit/components/timeline-utils.test.ts` — Time/px conversion math

**Integration tests:**

- `src/test/integration/shifts.test.ts` — CRUD + conflict detection + sub-location assignment
- `src/test/integration/availability.test.ts`
- `src/test/integration/templates.test.ts`

**E2E tests:**

- `src/test/e2e/shifts/schedule.spec.ts` — Full flow: select event → create shift via form → verify on timeline
- `src/test/e2e/shifts/templates.spec.ts` — Create template → apply to event → verify shifts created
- `src/test/e2e/shifts/my-shifts.spec.ts` — Staff logs in → views shifts → confirms a shift

### 6D — Lint + Dead Code Cleanup

- Run `npm run lint`
- Run `npm run knip` (expect unused exports from old shift page to flag)
- Remove old inline types from `src/app/staff/shifts/page.tsx` once replaced
- Run `npm run jscpd`

### 6E — Staff Auth Email Linking

Create a helper/admin page/script to link existing staff.profile_id entries to real emails:

```
src/app/admin/link-staff/page.tsx   # NEW — Admin page to manage staff → auth links
```

Or simpler: seed script that creates auth users for each staff member without a linked profile.

---

## File Creation Summary

### New Files (~28 total)

```
supabase/migrations/20260518000001_shifts_sub_location_id.sql
supabase/migrations/20260518000002_shifts_clock_columns.sql
src/lib/validations/shift.ts
src/lib/validations/availability.ts
src/lib/validations/template.ts
src/app/api/shift-templates/route.ts
src/app/api/shift-templates/[id]/route.ts
src/app/api/shift-templates/[id]/apply/route.ts
src/components/shifts/timeline/shift-timeline.tsx
src/components/shifts/timeline/timeline-header.tsx
src/components/shifts/timeline/timeline-row.tsx
src/components/shifts/timeline/shift-block.tsx
src/components/shifts/timeline/timeline-utils.ts
src/components/shifts/timeline/use-timeline-dnd.ts
src/components/shifts/shift-form-dialog.tsx
src/components/shifts/shift-details.tsx
src/components/shifts/my-shifts-list.tsx
src/components/shifts/my-shifts-calendar.tsx
src/app/my-shifts/page.tsx
src/app/shift-templates/page.tsx
src/app/shift-templates/new/page.tsx
src/app/shift-templates/[id]/edit/page.tsx
src/components/templates/template-list.tsx
src/components/templates/template-form.tsx
src/components/templates/template-slot-row.tsx
src/app/admin/link-staff/page.tsx
```

### Rewritten Files (~7 files)

```
src/app/staff/shifts/page.tsx         # Full rewrite
src/app/api/shifts/route.ts           # Zod validation + conflict detection + sub_location_id
src/app/api/shifts/[id]/route.ts      # Zod validation + conflict detection + sub_location_id
src/app/api/availability/route.ts     # Zod validation
src/app/api/availability/[id]/route.ts
src/app/api/dashboard/route.ts        # Updated shift shape
src/components/nav-bar.tsx            # Add "My Shifts" link
```

### Skipped (already exist — no work needed)

```
❌ supabase/migrations/20240518000000_venue_areas.sql     → venue_sub_locations already exists
❌ src/app/api/venues/[id]/areas/                      → sub-locations CRUD already exists at .../sublocations/
❌ src/components/venues/area-manager.tsx              → VenueSubLocationForm already exists
❌ src/components/venues/area-form.tsx                 → Already covered by VenueSubLocationForm
❌ src/test/integration/venue-areas.test.ts            → venue_sub_locations already tested via inventory
❌ src/test/e2e/venues/areas.spec.ts                   → Existing venue tests cover sub-locations
```

---

## Risk Mitigation

| Risk                                 | Impact                 | Mitigation                                                                                                |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| 2-week timeline too tight            | Missed launch features | Phase 4-5 can be deferred to post-launch week 1; Phase 1-3 are critical                                   |
| Timeline DnD complex to implement    | Delayed Phase 3        | Start with click-to-create (current dialog) + basic timeline, add drag-to-create as iterative improvement |
| Conflict detection buggy             | Double-booked staff    | API-level conflict check + client-side preview; manual override for managers                              |
| Staff auth not linked to real emails | Staff can't log in     | Build link-staff admin page first; staff can still be managed by manager without self-service             |
| Template apply logic too complex     | Delayed Phase 5        | MVP: save/load template as reference data, auto-generate shifts in follow-up iteration                    |

---

## LNP: Long-Term Notes Collection

### Labor Law Compliance (ArbZG)

- Max 10 hours per shift (§3)
- Min 11 hours rest between shifts (§5)
- Breaks: 30min for 6-9h, 45min for >9h (§4)
- Minor restrictions (JArbSchG): max 8h, no 20:00-06:00 (22:00 for 16+)
- Sunday/holiday premium
- Implementation: add to conflict detection engine + UI warnings/badges. Blocking violations optional.

### Clock-In/Clock-Out

- QR-based clock-in (reuse existing guest QR infrastructure)
- `clocked_in_at` / `clocked_out_at` columns already added in migration
- Late arrival detection (>15min after shift start)
- Break compliance check on clock-out
- Integration with payroll hours calculation

### Payroll Integration

- Calculate total hours per staff (accounting for breaks)
- Overtime detection (hours > contract weekly hours)
- Export to Datev/Lightspeed/Xero
- Different rates: permanent vs freelance vs minor (already in schema)
- Shift differential (late night premium)
- Monthly payroll report generation

### Data-Driven Template Optimization

- Track template usage metrics across events
- Analyze staffing patterns: which roles are consistently adjusted
- Recommendation engine: suggest slot counts based on event type, day, capacity, presale data
- Seasonal staffing patterns
- Integration with ticket sales for real-time staffing adjustments

### Shift Swap Workflow

- Staff can request shift swap
- System finds eligible replacements (same role, available, no conflict)
- Push/email notifications to eligible staff
- Manager approval flow
- Auto-revalidation of labor law limits for replacement staff

### Notifications

- Use existing `notifications` table
- Shift assignment → notification to staff
- Shift change → notification to affected staff
- Shift reminder (24h before event)
- Swap request → notification to eligible staff
- Unfilled shift alert to manager (if no one assigned 48h before event)

### Multi-Venue Staffing

- Staff may work across multiple venues (if same company)
- Template slots could reference venue-specific sub-locations
- Cross-venue conflict detection (same staff, different venue, same night)
- Combined dashboard for multi-venue managers

---

## Commit Strategy

```
feat(schema): add sub_location_id to shifts, clock columns
feat(validations): add shared Zod schemas for shifts, availability, templates
feat(api): rewrite shifts API with Zod validation + conflict detection + sub_location_id
feat(api): add shift templates CRUD + apply API
feat(ui): build event-driven timeline with drag-to-create shifts
feat(ui): rewrite shift scheduling page with new timeline + form dialog + sub-location selector
feat(ui): add staff self-service my-shifts page
feat(ui): add shift template manager (list, create, edit, apply)
feat(nav): add "My Shifts" navigation link
feat(dashboard): update dashboard with new shift data shape
test: add unit tests for shift/availability/template validations
test: add integration tests for shifts, availability, templates
test: add e2e tests for scheduling flow, templates, my-shifts
chore: lint + knip cleanup, remove old code
```

---

## Execution Order (Recommended)

**Day 1-2:** Phase 1 (Schema + Validations)
**Day 3-4:** Phase 2 (API Rework)
**Day 5-8:** Phase 3 (UI Rework — biggest effort)
**Day 9-10:** Phase 4 (Staff Self-Service)
**Day 11-12:** Phase 5 (Templates)
**Day 13-14:** Phase 6 (Polish, Testing, Bug Fixes)

**Parallel opportunities:**

- Phase 1 (schema) and Phase 2 (API) are naturally sequential
- Phase 3 (UI) can start once Phase 1 (validations) + Phase 2 basics are done
- Phase 4 (Staff Self-Service) can run parallel with Phase 5 (Templates) in the second week
- Phase 6 (Testing) happens continuously, with focused effort at the end
