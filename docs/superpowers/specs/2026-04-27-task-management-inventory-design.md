# PAL Task Management & Inventory System

**Date:** 2026-04-27
**Status:** Design Approved
**Project:** PAL Nightclub Booking & Guest Management System

---

## 1. Purpose

Extend the existing task management system with full workflow capabilities (status transitions, approvals, blocking, history audit trail) and introduce a complete inventory system for tracking equipment, its location history, and rentals to other venues.

---

## 2. Database Schema

### 2.1 Enhanced `tasks` table

```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_approval', 'done', 'cancelled'));

ALTER TABLE tasks ADD COLUMN created_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN due_date DATE;
ALTER TABLE tasks ADD COLUMN scheduled_date DATE;
ALTER TABLE tasks ADD COLUMN needs_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN blocked_reason TEXT;
ALTER TABLE tasks ALTER COLUMN event_id DROP NOT NULL;
```

### 2.2 New `task_history` table

```sql
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  from_status TEXT,
  to_status TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'status_change', 'blocked', 'unblocked',
    'approved', 'rejected', 'edited'
  )),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
```

RLS: SELECT for authenticated users involved with the task (assignee, creator, admin/manager). INSERT via application layer (service-role API).

### 2.3 New `items` table

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sound', 'lighting', 'dj', 'furniture', 'bar', 'misc')),
  serial_number TEXT UNIQUE,
  brand TEXT,
  model TEXT,
  condition_enum TEXT CHECK (condition_enum IN ('new', 'good', 'fair', 'poor', 'broken')),
  condition_notes TEXT,
  current_location TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_serial ON items(serial_number);
```

RLS: All operations for any authenticated user (to be restricted later).

### 2.4 New `item_location_history` table

```sql
CREATE TABLE item_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out', 'transfer', 'rental_out', 'rental_return')),
  moved_by UUID NOT NULL REFERENCES profiles(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_item_loc_history_item ON item_location_history(item_id);
```

### 2.5 New `rentals` table

```sql
CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rented_to TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  rental_date DATE NOT NULL,
  expected_return DATE NOT NULL,
  actual_return DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rentals_item ON rentals(item_id);
CREATE INDEX idx_rentals_status ON rentals(status);
```

### 2.6 New `task_items` junction table

```sql
CREATE TABLE task_items (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  PRIMARY KEY (task_id, item_id)
);
```

### 2.7 RLS Policy Updates

| Table | Policy |
|---|---|
| `tasks` | SELECT: any authenticated user. INSERT: any authenticated user. UPDATE status: only assignee OR admin/manager. UPDATE non-status: creator OR assignee OR admin/manager. DELETE: admin/manager. |
| `task_history` | SELECT: any authenticated user. INSERT via service-role API. |
| `items` | All operations for any authenticated user. |
| `item_location_history` | INSERT via API, SELECT for any auth user. |
| `rentals` | All operations for any authenticated user. |
| `task_items` | All operations for any authenticated user. |

---

## 3. Status Workflow

```
                    blocked flag (red)
                    ↓
  todo ──→ in_progress ──→ pending_approval ──→ done
                    ↑            │    │
                    └────────────┘    │
                    reject + reason  approve

  cancelled ← any status
```

- Tasks with `needs_approval = false`: `todo → in_progress → done`
- Tasks with `needs_approval = true`: `todo → in_progress → pending_approval → done`
- `blocked` is a boolean flag + reason on in_progress tasks. Informational/highlighting only.
- Rejection moves task from `pending_approval` back to `in_progress`, requires reason.
- Every status transition logs a `task_history` row.

---

## 4. Task History & Audit Log

Every status change, approval, rejection, block toggle, and task edit logs a row in `task_history`.

Change types:
- `created` — task was created
- `status_change` — task moved between statuses
- `blocked` — blocked flag set to true
- `unblocked` — blocked flag set to false
- `approved` — admin/manager approved from pending_approval
- `rejected` — admin/manager rejected with reason
- `edited` — task fields were modified

Displayed in task detail dialog as chronological feed.

---

## 5. API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks with filters (status, priority, assignee, event, blocked, search) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get single task with history + items |
| PUT | `/api/tasks/[id]` | Update task fields |
| DELETE | `/api/tasks/[id]` | Delete task |
| PATCH | `/api/tasks/[id]/status` | Status-only update (Kanban drag-drop) |
| PATCH | `/api/tasks/[id]/approve` | Approve task (admin/manager only) |
| PATCH | `/api/tasks/[id]/reject` | Reject task with reason (admin/manager only) |
| PATCH | `/api/tasks/[id]/block` | Toggle blocked flag |
| GET | `/api/tasks/[id]/history` | Get task history |
| GET/POST | `/api/tasks/[id]/comments` | Comments (existing) |
| GET/POST | `/api/items` | List / create items |
| GET/PUT/DELETE | `/api/items/[id]` | Single item CRUD |
| GET | `/api/items/[id]/location-history` | Location timeline |
| POST | `/api/items/[id]/check-in` | Check in item to location |
| POST | `/api/items/[id]/check-out` | Check out item from location |
| GET/POST | `/api/rentals` | List / create rentals |
| PUT | `/api/rentals/[id]/return` | Mark rental as returned |
| GET/PUT/DELETE | `/api/rentals/[id]` | Single rental CRUD |

---

## 6. UI Components & Pages

### 6.1 Enhanced Task Form
- Event picker (calendar dropdown, future events only, "No event" default)
- Needs approval checkbox
- Due date + scheduled date date pickers
- Inventory items multi-select
- Auto-set `created_by` from auth

### 6.2 Enhanced Task Card
- Blocked indicator (red left border + ⚠ icon)
- Approval badge ("🛡️ Needs approval")
- Due date badge (red = overdue, amber = today, grey = future)

### 6.3 Enhanced Task Detail Dialog
- Edit tab (all fields)
- Comments tab (existing)
- History tab (chronological task_history feed)
- Approval section (pending_approval + admin/manager user)
- Linked items section

### 6.4 Kanban Board
- 5 columns: TODO | IN PROGRESS | PENDING APPROVAL | DONE | CANCELLED
- PENDING APPROVAL hidden when empty
- Blocked tasks render with red styling
- Filters: priority, assignee, event, search, "My Tasks", "Blocked", "Needs Approval"

### 6.5 Inventory List (`/inventory`)
- Table: name, category badge, serial number, condition badge, current location
- Search + category filter
- "Add Item" button → create dialog
- Click row → detail page

### 6.6 Inventory Detail (`/inventory/[id]`)
- All item fields displayed
- Location timeline
- Check-in/Check-out form
- Linked tasks
- Active rental status + return action

### 6.7 Rentals (`/rentals`)
- Tabs: Active / Past
- Overdue highlighted in red
- "New Rental" form
- "Mark as Returned" action

### 6.8 Dashboard Widgets
- Blocked tasks count
- Pending approvals count (admin/manager only)
- Overdue rentals count
- Tasks due this week

### 6.9 Navigation
- Add `/inventory` and `/rentals` to nav-bar.tsx

---

## 7. Implementation Sequence

### Day 1 — Database & API Foundation
1. New migration: all table alterations and new tables
2. Migrate existing tasks (`review` → `pending_approval`)
3. Update task API routes
4. New approval/rejection/block/history API routes
5. New items API routes
6. New rentals API routes

### Day 2 — Enhanced Task UI
1. Update task-form.tsx (event picker, approval, dates, items)
2. Update task-card.tsx (blocked, approval, due date badges)
3. Update task-detail-dialog.tsx (history tab, approval UI, linked items)
4. Update Kanban board (pending_approval column, blocked styling)

### Day 3 — Inventory UI
1. Inventory list page with search/filter
2. Inventory create/edit form
3. Inventory detail page with location timeline
4. Check-in/check-out modal

### Day 4 — Rentals, Dashboard & Polish
1. Rentals list + create UI
2. Dashboard widgets
3. Navigation update
4. Notifications (in-app pending approval count)

### Day 5 — Testing & Verification
1. Unit tests for all new logic
2. E2E tests for critical flows
3. Lint, knip, jscpd
4. Production build verification

---

## 8. Out of Scope (Deferred)

- QR code generation and scanning for inventory items
- Telegram notifications
- Specific role-based access restrictions (permissions model TBD with stakeholders)
