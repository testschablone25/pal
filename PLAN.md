# Venues Module Enhancement Plan

## Context

The `/venues` page currently shows a basic card grid with venue name, address, capacity, venue type, and sub-locations. CRUD works via dialogs. We're transforming this into a **Venue Hub** — a central place to see everything at each venue: tasks, staff, events, inventory, and warnings.

**Data relationships already in DB:**

- `events.venue_id` → `venues.id`
- `tasks.event_id` → `events.venue_id` → `venues.id`
- `shifts.event_id` → `events.venue_id` → `venues.id`
- `items.sub_location_id` → `venue_sub_locations.venue_id` → `venues.id`

---

## Features (Confirmed)

1. **Clickable/Expandable cards** — Accordion inline expansion with tabbed detail view
2. **Tasks at venue** — Via events AND direct venue_id link
3. **Staff at venue** — Shifts with staff details
4. **Urgent task warnings** — Red border + warning icon on card; dedicated section in expanded view
5. **Inline capacity editing** — Click capacity number to edit on card
6. **Events overview** — Upcoming/past events in expanded view
7. **Inventory summary** — Items at venue grouped by sub-location
8. **Venue contacts/notes** — Contact fields + notes on venue
9. **Direct task-to-venue linking** — `venue_id` on tasks table
10. **Sub-location capacity** — Per-area capacity breakdown

---

## Approach

### 1. Database Migration

```sql
-- a) Add venue_id to tasks (for tasks not tied to an event)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_venue_id ON tasks(venue_id);

-- b) Add capacity to sub-locations
ALTER TABLE venue_sub_locations ADD COLUMN IF NOT EXISTS capacity INT;

-- c) Add notes and contact fields to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_email TEXT;
```

### 2. Backend: Enhanced Venues API

**`GET /api/venues`** — Return each venue with aggregated stats:

```json
{
  "venues": [{
    "id", "name", "address", "capacity", "venue_type",
    "notes", "contact_name", "contact_phone", "contact_email",
    "sub_locations": [...],
    "open_task_count": 3,
    "urgent_task_count": 1,
    "upcoming_events_count": 2,
    "staff_count": 5,
    "inventory_count": 12
  }]
}
```

**`GET /api/venues/[id]`** — Full detail view data:

```json
{
  "id", "name", "address", "capacity", "venue_type", "notes", "contact_*",
  "sub_locations": [{ ..., "capacity": 200 }],
  "events": [{ "id", "name", "date", "status", "door_time", "end_time" }],
  "tasks": [{ "id", "title", "status", "priority", "assignee": {...}, "due_date" }],
  "staff_shifts": [{ "id", "staff": {...}, "role", "start_time", "end_time", "event": {...} }],
  "inventory": [{ "id", "name", "category", "sub_location": {...}, "condition_enum" }],
  "stats": { "open_tasks", "urgent_tasks", "total_inventory", "total_staff" }
}
```

**`PUT /api/venues/[id]`** — Accept new fields (notes, contacts)

**New: `PUT /api/venues/[id]/sublocations/[subId]`** — Update sub-location capacity

**`POST /api/tasks`** — Accept optional `venue_id` field for direct venue linking

**`GET /api/tasks`** — Support filtering by `venue_id` directly (not just via events)

### 3. Frontend: Refactored Venues Page

Card grid with:

- **Red left border + ⚠️ icon** on cards with urgent tasks
- **Open task count badge** on each card
- **Staff count + inventory count** shown as secondary stats
- **Inline capacity editing** — click the capacity number → input appears
- Click to expand (accordion inline below the card)

Expanded view with **6 tabs**:
| Tab | Content |
|-----|---------|
| **Overview** | Venue notes, contacts, sub-location list with capacities |
| **Tasks** | Open tasks grouped by status (todo, in_progress), urgent tasks highlighted at top |
| **Staff** | Upcoming shifts with staff name, role, times, event |
| **Events** | Upcoming events (list) + recent events |
| **Inventory** | Items grouped by sub-location with counts + condition badges |
| **Settings** | Edit form: name, address, type, capacity, notes, contacts |

---

## Files to Modify

| #   | File                                                    | Change                                                                                  |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | `supabase/migrations/YYYYMMDD000000_venue_hub.sql`      | **New** — venue_id on tasks, capacity on sub_locations, notes/contact on venues         |
| 2   | `src/app/api/venues/route.ts`                           | **Major** — Enhanced GET with aggregated stats (tasks, events, staff, inventory counts) |
| 3   | `src/app/api/venues/[id]/route.ts`                      | **Major** — Enhanced GET with full detail, PUT with new fields                          |
| 4   | `src/app/api/venues/[id]/sublocations/[subId]/route.ts` | **New** — PUT to update sub-location (capacity)                                         |
| 5   | `src/app/api/tasks/route.ts`                            | **Minor** — Accept `venue_id` in POST, improve `venue_id` GET filter                    |
| 6   | `src/app/api/tasks/[id]/route.ts`                       | **Minor** — Include venue_id in task detail response                                    |
| 7   | `src/app/venues/page.tsx`                               | **Major rewrite** — Expandable cards, tabs, warnings, inline editing                    |
| 8   | `src/components/venue-expanded-view.tsx`                | **New** — Extracted tabbed detail component                                             |
| 9   | `src/app/workflow/page.tsx`                             | **Minor** — Support direct venue_id filtering for tasks                                 |

---

## Reuse

| Existing                        | Path                               | Usage                                  |
| ------------------------------- | ---------------------------------- | -------------------------------------- |
| `EmptyState`                    | `src/components/empty-state.tsx`   | Empty states in tabs                   |
| `PageSkeleton`                  | `src/components/page-skeleton.tsx` | Page loading state                     |
| `statusBadgeClass()`            | `src/lib/utils/index.ts`           | Task status/priority badges            |
| `useToast()`                    | `src/hooks/use-toast.ts`           | Success/error feedback                 |
| `cn()`                          | `src/lib/utils/index.ts`           | Tailwind class merging                 |
| `formatDateShort`, `formatTime` | `src/lib/dates.ts`                 | Date/time formatting                   |
| `Task` interface                | `src/components/task-card.tsx`     | Task type for venue tasks              |
| `TASK_TYPES`                    | `src/lib/i18n.tsx`                 | Task type labels                       |
| shadcn/ui components            | `src/components/ui/*`              | Tabs, Badge, Card, Dialog, Input, etc. |

---

## Steps

### Database

- [ ] **Step 1** — Create migration: `venue_id` on tasks, `capacity` on sub*locations, `notes`/`contact*\*` on venues

### Backend API

- [ ] **Step 2** — Enhance `GET /api/venues` to return aggregated stats per venue
- [ ] **Step 3** — Enhance `GET /api/venues/[id]` to return full detail (events, tasks, shifts, inventory, notes, contacts)
- [ ] **Step 4** — Update `PUT /api/venues/[id]` to accept new fields
- [ ] **Step 5** — Add `PUT /api/venues/[id]/sublocations/[subId]` for sub-location capacity update
- [ ] **Step 6** — Update `POST /api/tasks` to accept `venue_id`; improve `GET /api/tasks` venue_id filter

### Frontend

- [ ] **Step 7** — Refactor venue cards: warning indicators (red border + icon), task count badges, staff/inventory counts
- [ ] **Step 8** — Add inline capacity editing on cards
- [ ] **Step 9** — Implement accordion expansion (click card → expand below with tabs)
- [ ] **Step 10** — Create `VenueExpandedView` component with 6 tabs: Overview, Tasks, Staff, Events, Inventory, Settings
- [ ] **Step 11** — Implement Overview tab: notes, contacts, sub-locations with capacities
- [ ] **Step 12** — Implement Tasks tab: fetch venue tasks, group by status, highlight urgent
- [ ] **Step 13** — Implement Staff tab: fetch shifts for venue events, show staff details
- [ ] **Step 14** — Implement Events tab: fetch upcoming + past events at venue
- [ ] **Step 15** — Implement Inventory tab: fetch items by venue, group by sub-location
- [ ] **Step 16** — Implement Settings tab: edit form with name, address, type, capacity, notes, contacts

### Quality

- [ ] **Step 17** — Update workflow page to support direct venue_id task filtering
- [ ] **Step 18** — Run `npm run lint`, `npm run knip`, `npm run jscpd`, `npm run test:unit`, `npm run build`

---

## Verification

1. `npm run lint` — no errors
2. `npm run knip` — no unused code
3. `npm run jscpd` — under 10% duplication
4. `npm run test:unit` — all passing
5. `npm run build` — compiles successfully
6. Manual checks:
   - Cards with urgent tasks show red border + warning icon
   - Clicking a card expands it inline with tabbed view
   - Tasks tab shows tasks linked via events AND direct venue_id
   - Staff tab shows shifts with staff names and roles
   - Events tab shows upcoming/past events
   - Inventory tab shows items grouped by sub-location
   - Overview tab shows notes, contacts, sub-location capacities
   - Settings tab allows editing all venue fields
   - Capacity editing works inline on cards
   - Sub-location capacity can be edited in Overview tab
   - Creating a task with venue_id (no event) works and appears in venue task list
