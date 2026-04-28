# Task Management & Inventory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the task system with approval workflows, blocking, full audit history, and build a complete inventory system with location tracking and rental management.

**Architecture:** Two subsystems. Tasks gets enhanced schema + new approval/block/history APIs + updated Kanban UI. Inventory is a new independent module with items, location history, and rentals. They connect via a `task_items` junction table.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (service-role API pattern), Tailwind CSS 4, shadcn/ui, dnd-kit, react-hook-form + zod.

---

## File Structure

### Database
- Create: `supabase/migrations/20260427000000_tasks_enhancement_inventory.sql`

### API Routes (Tasks — Modified)
- Modify: `src/app/api/tasks/route.ts` — handle new fields, created_by, history logging
- Modify: `src/app/api/tasks/[id]/route.ts` — handle new fields, log edits
- Modify: `src/app/api/tasks/[id]/status/route.ts` — log status changes, update valid statuses

### API Routes (Tasks — New)
- Create: `src/app/api/tasks/[id]/approve/route.ts` — approve task (admin/manager)
- Create: `src/app/api/tasks/[id]/reject/route.ts` — reject with reason
- Create: `src/app/api/tasks/[id]/block/route.ts` — toggle blocked flag
- Create: `src/app/api/tasks/[id]/history/route.ts` — get task_history

### API Routes (Items — New)
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[id]/route.ts`
- Create: `src/app/api/items/[id]/location-history/route.ts`

### API Routes (Rentals — New)
- Create: `src/app/api/rentals/route.ts`
- Create: `src/app/api/rentals/[id]/route.ts`
- Create: `src/app/api/rentals/[id]/return/route.ts`

### UI Components (Tasks — Modified)
- Modify: `src/components/task-form.tsx` — event picker, approval checkbox, dates, items
- Modify: `src/components/task-card.tsx` — blocked indicator, approval badge, due date
- Modify: `src/components/task-detail-dialog.tsx` — history tab, approval UI, linked items

### UI Components (Tasks — New)
- Create: `src/components/task-history-timeline.tsx` — reusable timeline component

### UI Components (Inventory — New)
- Create: `src/components/inventory-list.tsx`
- Create: `src/components/inventory-form.tsx`
- Create: `src/components/inventory-detail.tsx`
- Create: `src/components/checkin-checkout-modal.tsx`

### UI Components (Rentals — New)
- Create: `src/components/rentals-list.tsx`
- Create: `src/components/rental-form.tsx`

### Pages
- Modify: `src/app/workflow/page.tsx` — update columns, filters, styling
- Create: `src/app/inventory/page.tsx`
- Create: `src/app/inventory/[id]/page.tsx`
- Create: `src/app/rentals/page.tsx`
- Modify: `src/app/page.tsx` — dashboard widgets
- Modify: `src/components/nav-bar.tsx` — add inventory + rentals

### Auth
- Modify: `src/proxy.ts` — add inventory/rentals to protected routes

### Tests
- Create: `src/test/unit/task-approval.test.ts`
- Create: `src/test/unit/inventory-checkin.test.ts`
- Create: `src/test/unit/rental-status.test.ts`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260427000000_tasks_enhancement_inventory.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- PAL Task Management & Inventory Enhancement
-- 2026-04-27

-- ============================
-- 1. Enhance tasks table
-- ============================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_approval', 'done', 'cancelled'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS needs_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE tasks ALTER COLUMN event_id DROP NOT NULL;

UPDATE tasks SET status = 'pending_approval' WHERE status = 'review';

-- ============================
-- 2. Create task_history table
-- ============================

CREATE TABLE IF NOT EXISTS task_history (
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

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view task history" ON task_history
  FOR SELECT USING (true);
CREATE POLICY "System can insert task history" ON task_history
  FOR INSERT WITH CHECK (true);

-- ============================
-- 3. Create items table
-- ============================

CREATE TABLE IF NOT EXISTS items (
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

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_serial ON items(serial_number);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update items" ON items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete items" ON items FOR DELETE USING (true);

-- ============================
-- 4. Create item_location_history table
-- ============================

CREATE TABLE IF NOT EXISTS item_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out', 'transfer', 'rental_out', 'rental_return')),
  moved_by UUID NOT NULL REFERENCES profiles(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_loc_history_item ON item_location_history(item_id);
ALTER TABLE item_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view location history" ON item_location_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert location history" ON item_location_history FOR INSERT WITH CHECK (true);

-- ============================
-- 5. Create rentals table
-- ============================

CREATE TABLE IF NOT EXISTS rentals (
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

CREATE INDEX IF NOT EXISTS idx_rentals_item ON rentals(item_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rentals" ON rentals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rentals" ON rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rentals" ON rentals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rentals" ON rentals FOR DELETE USING (true);

-- ============================
-- 6. Create task_items junction table
-- ============================

CREATE TABLE IF NOT EXISTS task_items (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  PRIMARY KEY (task_id, item_id)
);

ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view task items" ON task_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task items" ON task_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete task items" ON task_items FOR DELETE USING (true);

-- ============================
-- 7. Update task RLS policies
-- ============================

DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
CREATE POLICY "Anyone can create tasks" ON tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Assignee can update tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ============================
-- 8. Update task_comments policies
-- ============================

DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
CREATE POLICY "Anyone can view task comments" ON task_comments FOR SELECT USING (true);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase migration up`
Expected: New tables created, existing tasks altered, `review` status migrated to `pending_approval`

- [ ] **Step 3: Generate TypeScript types**

Run: `npx supabase gen types typescript --linked > src/lib/database.types.ts`
Expected: Updated `database.types.ts` with all new tables and columns

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260427000000_tasks_enhancement_inventory.sql src/lib/database.types.ts
git commit -m "feat(db): add task workflow enhancement and inventory tables"
```

---

### Task 2: Update Task GET/POST API

**Files:**
- Modify: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Add new query params to GET (blocked, needs_approval, search, my_created)**

Edit `/home/glibber/Dev/pal-master/src/app/api/tasks/route.ts`. After line 21 (`const userId = ...`), add:

```typescript
const blocked = searchParams.get('blocked');
const needsApproval = searchParams.get('needs_approval');
const search = searchParams.get('search');
const myCreated = searchParams.get('my_created');
```

Update the select at line 24-39 to include `creator` relation:

```typescript
let query = supabase
  .from('tasks')
  .select(`
    *,
    assignee:assignee_id (
      id, full_name, email, avatar_url
    ),
    event:event_id (
      id, name, date
    ),
    creator:created_by (
      id, full_name, email, avatar_url
    ),
    comments:task_comments(count)
  `, { count: 'exact' })
```

Add filters after line 58:

```typescript
if (blocked === 'true') {
  query = query.eq('blocked', true);
}
if (needsApproval === 'true') {
  query = query.eq('needs_approval', true);
}
if (search) {
  query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
}
if (myCreated === 'true' && userId) {
  query = query.eq('created_by', userId);
}
```

- [ ] **Step 2: Update POST handler**

Replace the destructuring block (lines 96-103) with:

```typescript
const {
  title,
  description,
  status,
  priority,
  assignee_id,
  event_id,
  due_date,
  scheduled_date,
  needs_approval,
  created_by,
  item_ids,
} = body;
```

Update the insert (lines 113-136):

```typescript
const { data: taskData, error: taskError } = await supabase
  .from('tasks')
  .insert({
    title,
    description,
    status: status || 'todo',
    priority: priority || 'medium',
    assignee_id,
    event_id: event_id || null,
    due_date: due_date || null,
    scheduled_date: scheduled_date || null,
    needs_approval: needs_approval || false,
    created_by,
  })
  .select(`
    *,
    assignee:assignee_id (
      id, full_name, email, avatar_url
    ),
    event:event_id (
      id, name, date
    ),
    creator:created_by (
      id, full_name, email, avatar_url
    )
  `)
  .single();

if (taskError) {
  return NextResponse.json({ error: taskError.message }, { status: 400 });
}

// Link items if provided
if (item_ids && item_ids.length > 0 && taskData) {
  await supabase.from('task_items').insert(
    item_ids.map((item_id: string) => ({
      task_id: taskData.id,
      item_id,
    }))
  );
}

// Log task creation
await supabase.from('task_history').insert({
  task_id: taskData.id,
  changed_by: created_by,
  from_status: null,
  to_status: taskData.status,
  change_type: 'created',
});

return NextResponse.json({ ...taskData, comment_count: 0, item_ids: item_ids || [] }, { status: 201 });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat(api): update tasks API with new fields, filters, and item links"
```

---

### Task 3: Update Single Task API (PUT/GET/DELETE)

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Update GET to include creator + linked items**

Replace the select block (lines 19-34) with:

```typescript
const { data, error } = await supabase
  .from('tasks')
  .select(`
    *,
    assignee:assignee_id (
      id, full_name, email, avatar_url
    ),
    event:event_id (
      id, name, date
    ),
    creator:created_by (
      id, full_name, email, avatar_url
    ),
    comments:task_comments(count),
    task_items (
      item_id,
      items (*)
    )
  `)
  .eq('id', id)
  .single();
```

Update the return statement:

```typescript
return NextResponse.json({
  ...data,
  comment_count: data.comments?.[0]?.count || 0,
  comments: undefined,
  items: data.task_items?.map((ti: any) => ti.items) || [],
  task_items: undefined,
});
```

- [ ] **Step 2: Update PUT to handle new fields + log edits**

Replace the destructuring (lines 74-81):

```typescript
const body = await request.json();
const {
  title,
  description,
  status,
  priority,
  assignee_id,
  event_id,
  due_date,
  scheduled_date,
  needs_approval,
  blocked,
  blocked_reason,
  changed_by,
  item_ids,
} = body;
```

Before the update, fetch the existing task:

```typescript
const { data: existingTask } = await supabase
  .from('tasks')
  .select('*')
  .eq('id', id)
  .single();
```

Replace the update block (lines 83-108):

```typescript
const { data, error } = await supabase
  .from('tasks')
  .update({
    title,
    description,
    status,
    priority,
    assignee_id,
    event_id: event_id || null,
    due_date: due_date || null,
    scheduled_date: scheduled_date || null,
    needs_approval,
    blocked,
    blocked_reason,
  })
  .eq('id', id)
  .select(`
    *,
    assignee:assignee_id (
      id, full_name, email, avatar_url
    ),
    event:event_id (
      id, name, date
    ),
    creator:created_by (
      id, full_name, email, avatar_url
    ),
    comments:task_comments(count)
  `)
  .single();

if (error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}

// Log edit if fields changed
if (existingTask && changed_by) {
  const changedFields: string[] = [];
  if (existingTask.title !== data.title) changedFields.push('title');
  if (existingTask.description !== data.description) changedFields.push('description');
  if (existingTask.priority !== data.priority) changedFields.push('priority');
  if (existingTask.assignee_id !== data.assignee_id) changedFields.push('assignee_id');
  if (existingTask.event_id !== data.event_id) changedFields.push('event_id');
  if (existingTask.due_date !== data.due_date) changedFields.push('due_date');
  if (existingTask.scheduled_date !== data.scheduled_date) changedFields.push('scheduled_date');
  if (existingTask.needs_approval !== data.needs_approval) changedFields.push('needs_approval');

  if (changedFields.length > 0) {
    await supabase.from('task_history').insert({
      task_id: id,
      changed_by,
      from_status: existingTask.status,
      to_status: data.status,
      change_type: 'edited',
      reason: `Changed: ${changedFields.join(', ')}`,
    });
  }
}

// Update task_items if provided
if (item_ids !== undefined) {
  await supabase.from('task_items').delete().eq('task_id', id);
  if (item_ids.length > 0) {
    await supabase.from('task_items').insert(
      item_ids.map((item_id: string) => ({ task_id: id, item_id }))
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat(api): update single task API with new fields, edit logging, item links"
```

---

### Task 4: Status-Only API + Approve/Reject/Block/History APIs

**Files:**
- Modify: `src/app/api/tasks/[id]/status/route.ts`
- Create: `src/app/api/tasks/[id]/approve/route.ts`
- Create: `src/app/api/tasks/[id]/reject/route.ts`
- Create: `src/app/api/tasks/[id]/block/route.ts`
- Create: `src/app/api/tasks/[id]/history/route.ts`

- [ ] **Step 1: Update status endpoint**

Edit the validStatuses array to remove `review` and add `pending_approval`:

```typescript
const validStatuses = ['todo', 'in_progress', 'pending_approval', 'done', 'cancelled'];
```

Add a `changed_by` field from the body and log history after the update succeeds:

After the `.single()` call and before the return, add:

```typescript
const { changed_by } = body;

if (changed_by) {
  await supabase.from('task_history').insert({
    task_id: id,
    changed_by: changed_by,
    from_status: data.status, // The API won't have the old state easily... we can read it first
    to_status: status,
    change_type: 'status_change',
  });
}
```

Better approach: read old status before update:

```typescript
const { data: oldTask } = await supabase
  .from('tasks')
  .select('status')
  .eq('id', id)
  .single();

// ... update code ...

if (oldTask && oldTask.status !== status && body.changed_by) {
  await supabase.from('task_history').insert({
    task_id: id,
    changed_by: body.changed_by,
    from_status: oldTask.status,
    to_status: status,
    change_type: 'status_change',
  });
}
```

- [ ] **Step 2: Create approve route**

Write file `src/app/api/tasks/[id]/approve/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approved_by } = body;

    if (!approved_by) {
      return NextResponse.json({ error: 'approved_by is required' }, { status: 400 });
    }

    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Task is not in pending_approval status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('task_history').insert({
      task_id: id,
      changed_by: approved_by,
      from_status: 'pending_approval',
      to_status: 'done',
      change_type: 'approved',
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error approving task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create reject route**

Write file `src/app/api/tasks/[id]/reject/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rejected_by, reason } = body;

    if (!rejected_by) {
      return NextResponse.json({ error: 'rejected_by is required' }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required for rejection' }, { status: 400 });
    }

    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Task is not in pending_approval status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'in_progress' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('task_history').insert({
      task_id: id,
      changed_by: rejected_by,
      from_status: 'pending_approval',
      to_status: 'in_progress',
      change_type: 'rejected',
      reason: reason.trim(),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error rejecting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create block route**

Write file `src/app/api/tasks/[id]/block/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { blocked, blocked_reason, changed_by } = body;

    if (blocked === undefined || !changed_by) {
      return NextResponse.json({ error: 'blocked and changed_by are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ blocked, blocked_reason: blocked ? blocked_reason : null })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('task_history').insert({
      task_id: id,
      changed_by,
      from_status: null,
      to_status: null,
      change_type: blocked ? 'blocked' : 'unblocked',
      reason: blocked ? blocked_reason : null,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error toggling block:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create history route**

Write file `src/app/api/tasks/[id]/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('task_history')
      .select(`
        *,
        changed_by:changed_by (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
  } catch (error) {
    console.error('Error fetching task history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tasks/[id]/status/route.ts src/app/api/tasks/[id]/approve/route.ts src/app/api/tasks/[id]/reject/route.ts src/app/api/tasks/[id]/block/route.ts src/app/api/tasks/[id]/history/route.ts
git commit -m "feat(api): add approval, rejection, block, and history APIs"
```

---

### Task 5: Create Items API Routes

**Files:**
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[id]/route.ts`
- Create: `src/app/api/items/[id]/location-history/route.ts`

- [ ] **Step 1: Create items list/create route**

Write file `src/app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('items')
      .select('*', { count: 'exact' })
      .order('name')
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,serial_number.ilike.%${search}%,brand.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [], total: count || 0 });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, serial_number, brand, model, condition_enum, condition_notes, current_location, notes, photo_url } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        name, category, serial_number, brand, model,
        condition_enum, condition_notes, current_location, notes, photo_url,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create single item CRUD route**

Write file `src/app/api/items/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch active rental if exists
    const { data: activeRental } = await supabase
      .from('rentals')
      .select('*')
      .eq('item_id', id)
      .in('status', ['active', 'overdue'])
      .maybeSingle();

    return NextResponse.json({ ...data, active_rental: activeRental || null });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, serial_number, brand, model, condition_enum, condition_notes, current_location, notes, photo_url } = body;

    const { data, error } = await supabase
      .from('items')
      .update({ name, category, serial_number, brand, model, condition_enum, condition_notes, current_location, notes, photo_url })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create location-history route**

Write file `src/app/api/items/[id]/location-history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('item_location_history')
      .select(`
        *,
        moved_by:moved_by (
          id, full_name, email
        )
      `)
      .eq('item_id', id)
      .order('timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
  } catch (error) {
    console.error('Error fetching location history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { location, action, moved_by } = body;

    if (!location || !action || !moved_by) {
      return NextResponse.json({ error: 'location, action, and moved_by are required' }, { status: 400 });
    }

    // Update the item's current_location
    const { error: updateError } = await supabase
      .from('items')
      .update({ current_location: location })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log the location change
    const { data, error } = await supabase
      .from('item_location_history')
      .insert({ item_id: id, location, action, moved_by })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error logging location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/items/route.ts src/app/api/items/\[id\]/route.ts src/app/api/items/\[id\]/location-history/route.ts
git commit -m "feat(api): add items CRUD and location history APIs"
```

---

### Task 6: Create Rentals API Routes

**Files:**
- Create: `src/app/api/rentals/route.ts`
- Create: `src/app/api/rentals/[id]/route.ts`
- Create: `src/app/api/rentals/[id]/return/route.ts`

- [ ] **Step 1: Create rentals list/create route**

Write file `src/app/api/rentals/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const itemId = searchParams.get('item_id');

    let query = supabase
      .from('rentals')
      .select(`
        *,
        items (*),
        creator:created_by (id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rentals: data || [] });
  } catch (error) {
    console.error('Error fetching rentals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, rented_to, contact_person, contact_phone, contact_email, rental_date, expected_return, notes, created_by } = body;

    if (!item_id || !rented_to || !rental_date || !expected_return) {
      return NextResponse.json({ error: 'item_id, rented_to, rental_date, and expected_return are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rentals')
      .insert({
        item_id, rented_to, contact_person, contact_phone, contact_email,
        rental_date, expected_return, notes, created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-log location change for rental
    if (data) {
      await supabase.from('item_location_history').insert({
        item_id,
        location: `Rented to: ${rented_to}`,
        action: 'rental_out',
        moved_by: created_by,
      });

      // Update item's current location
      await supabase.from('items').update({
        current_location: `Rented to: ${rented_to}`,
      }).eq('id', item_id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating rental:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create single rental route**

Write file `src/app/api/rentals/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('rentals')
      .select(`*, items (*), creator:created_by (id, full_name, email)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rental:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { item_id, rented_to, contact_person, contact_phone, contact_email, rental_date, expected_return, notes } = body;

    const { data, error } = await supabase
      .from('rentals')
      .update({ item_id, rented_to, contact_person, contact_phone, contact_email, rental_date, expected_return, notes })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating rental:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rental:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create return route**

Write file `src/app/api/rentals/[id]/return/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { return_location, returned_by } = body;

    if (!returned_by) {
      return NextResponse.json({ error: 'returned_by is required' }, { status: 400 });
    }

    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const finalLocation = return_location || 'Main Storage';
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('rentals')
      .update({ status: 'returned', actual_return: today })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log return in location history
    await supabase.from('item_location_history').insert({
      item_id: rental.item_id,
      location: finalLocation,
      action: 'rental_return',
      moved_by: returned_by,
    });

    // Update item location back
    await supabase.from('items').update({
      current_location: finalLocation,
    }).eq('id', rental.item_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error returning rental:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/rentals/route.ts src/app/api/rentals/\[id\]/route.ts src/app/api/rentals/\[id\]/return/route.ts
git commit -m "feat(api): add rentals CRUD and return APIs"
```

---

### Task 7: Update Task Form Component

**Files:**
- Modify: `src/components/task-form.tsx`

- [ ] **Step 1: Update schema and add new fields**

Edit task form to add: needs_approval checkbox, due_date, scheduled_date, item_ids multi-select, event date calendar picker.

Key changes to make:

1. Update the Zod schema at line 27-33 to include new fields
2. Add `items` to the profiles/events fetches
3. Add needs_approval checkbox
4. Replace event select with a calendar-enhanced dropdown
5. Add date inputs for due_date and scheduled_date
6. Add item multi-select

- [ ] **Step 2: Commit**

```bash
git add src/components/task-form.tsx
git commit -m "feat(ui): update task form with approval, dates, items selector, event calendar picker"
```

---

### Task 8: Update Task Card Component

**Files:**
- Modify: `src/components/task-card.tsx`

- [ ] **Step 1: Add blocked indicator, approval badge, due date badge**

Edit the Task interface to add new fields. Add a red left border when blocked. Add a shield badge when needs_approval. Add a due date badge with color coding.

- [ ] **Step 2: Commit**

```bash
git add src/components/task-card.tsx
git commit -m "feat(ui): add blocked indicator, approval badge, due date to task cards"
```

---

### Task 9: Update Task Detail Dialog

**Files:**
- Modify: `src/components/task-detail-dialog.tsx`
- Create: `src/components/task-history-timeline.tsx`

- [ ] **Step 1: Create history timeline component**

Write file `src/components/task-history-timeline.tsx` — renders a chronological feed of task_history entries from `/api/tasks/[id]/history`.

- [ ] **Step 2: Update dialog with history tab, approval/rejection UI, linked items**

Add tabs: Details | Comments | History. Add approval buttons when pending_approval + admin/manager. Add linked items section. Add block toggle button.

- [ ] **Step 3: Commit**

```bash
git add src/components/task-history-timeline.tsx src/components/task-detail-dialog.tsx
git commit -m "feat(ui): add history timeline, approval UI, linked items to task detail dialog"
```

---

### Task 10: Update Workflow / Kanban Page

**Files:**
- Modify: `src/app/workflow/page.tsx`

- [ ] **Step 1: Update columns, add new filters, blocked styling**

Replace COLUMNS to use: needs_refining removed, add pending_approval. Add filter options for "Blocked" and "Needs Approval". Style blocked cards red in the in_progress column. Show pending_approval column conditionally.

- [ ] **Step 2: Commit**

```bash
git add src/app/workflow/page.tsx
git commit -m "feat(ui): update Kanban with pending approval column, blocked styling, new filters"
```

---

### Task 11: Create Inventory UI

**Files:**
- Create: `src/components/inventory-list.tsx`
- Create: `src/components/inventory-form.tsx`
- Create: `src/components/inventory-detail.tsx`
- Create: `src/components/checkin-checkout-modal.tsx`
- Create: `src/app/inventory/page.tsx`
- Create: `src/app/inventory/[id]/page.tsx`

- [ ] **Step 1: Create inventory list component + page**

Create `src/components/inventory-list.tsx` — table with category badges, condition badges, search bar, category filter tabs, "Add Item" button. Create `src/app/inventory/page.tsx` wrapping it.

- [ ] **Step 2: Create inventory form**

Create `src/components/inventory-form.tsx` — form with name, category select, serial number, brand, model, condition select, condition notes textarea, current location, notes.

- [ ] **Step 3: Create inventory detail + location modal**

Create `src/components/inventory-detail.tsx` — display all fields, location timeline, active rental, linked tasks, check-in/check-out buttons. Create `src/components/checkin-checkout-modal.tsx` — location input, action selector, moved_by from auth.

Create `src/app/inventory/[id]/page.tsx` using the detail component.

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory-list.tsx src/components/inventory-form.tsx src/components/inventory-detail.tsx src/components/checkin-checkout-modal.tsx src/app/inventory/page.tsx src/app/inventory/\[id\]/page.tsx
git commit -m "feat(ui): add inventory list, detail, form, and location tracking UI"
```

---

### Task 12: Create Rentals UI

**Files:**
- Create: `src/components/rentals-list.tsx`
- Create: `src/components/rental-form.tsx`
- Create: `src/app/rentals/page.tsx`

- [ ] **Step 1: Create rentals list component**

Create `src/components/rentals-list.tsx` — tabs for Active/Past rentals, table with club name, item name, dates, status badge, overdue items in red.

- [ ] **Step 2: Create rental form**

Create `src/components/rental-form.tsx` — item selector (searchable), rented_to, contact info, dates, notes.

- [ ] **Step 3: Create rentals page**

Create `src/app/rentals/page.tsx` — uses RentalsList component.

- [ ] **Step 4: Commit**

```bash
git add src/components/rentals-list.tsx src/components/rental-form.tsx src/app/rentals/page.tsx
git commit -m "feat(ui): add rentals list, form, and page"
```

---

### Task 13: Update Dashboard + Navigation + Auth

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/components/nav-bar.tsx`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Update dashboard API**

Add to the dashboard API the counts for: blocked tasks count, pending approvals count, active rentals count, tasks due this week count.

- [ ] **Step 2: Update dashboard page**

Add widgets: Blocked tasks card, Pending approvals card (admin/manager only), Active rentals card, Tasks due this week widget.

- [ ] **Step 3: Update nav-bar**

Add inventory and rentals links.

- [ ] **Step 4: Update proxy.ts**

Add `/inventory` and `/rentals` to the protected routes list.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/api/dashboard/route.ts src/components/nav-bar.tsx src/proxy.ts
git commit -m "feat(ui): add dashboard widgets, nav links, and route protection for inventory/rentals"
```

---

### Task 14: Tests

**Files:**
- Create: `src/test/unit/task-approval.test.ts`
- Create: `src/test/unit/inventory-checkin.test.ts`
- Create: `src/test/unit/rental-status.test.ts`

- [ ] **Step 1: Write task approval unit test**

Test the approval/rejection status transition logic.

- [ ] **Step 2: Write inventory check-in/check-out unit test**

Test location history logging.

- [ ] **Step 3: Write rental status unit test**

Test overdue detection and status transitions.

- [ ] **Step 4: Run all tests**

Run: `npm run test:unit` — all tests should pass

- [ ] **Step 5: Run lint, knip, jscpd**

Run: `npm run lint && npm run knip && npm run jscpd` — all clean

- [ ] **Step 6: Run build**

Run: `npm run build` — verify production build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/test/unit/task-approval.test.ts src/test/unit/inventory-checkin.test.ts src/test/unit/rental-status.test.ts
git commit -m "test: add unit tests for task approval, inventory checkin, rental status"
```
