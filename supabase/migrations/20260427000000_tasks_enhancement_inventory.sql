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

-- Backfill created_by for existing tasks (use assignee_id as fallback)
UPDATE tasks SET created_by = assignee_id WHERE created_by IS NULL AND assignee_id IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_task_history_change_type ON task_history(change_type);
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
CREATE INDEX IF NOT EXISTS idx_item_loc_history_moved_by ON item_location_history(moved_by);
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
CREATE INDEX IF NOT EXISTS idx_rentals_rented_to ON rentals(rented_to);
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

DROP POLICY IF EXISTS "Users can add task comments" ON task_comments;
CREATE POLICY "Anyone can add task comments" ON task_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- ============================
-- 9. Add update_updated_at triggers for new tables
-- ============================

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
