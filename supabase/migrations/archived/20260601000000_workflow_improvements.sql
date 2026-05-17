-- Workflow Improvements: QR codes, goal locations, sub-tasks
-- 2026-06-01

-- ============================
-- 1. Add QR token to items
-- ============================
ALTER TABLE items ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;

-- Backfill existing items with generated QR tokens
UPDATE items SET qr_token = gen_random_uuid()::text WHERE qr_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_qr_token ON items(qr_token);

-- ============================
-- 2. Enhance task_items junction
-- ============================
ALTER TABLE task_items ADD COLUMN IF NOT EXISTS goal_sub_location_id UUID
  REFERENCES venue_sub_locations(id) ON DELETE SET NULL;

ALTER TABLE task_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_task_items_goal_sub_location ON task_items(goal_sub_location_id);

-- ============================
-- 3. Add parent_task_id to tasks
-- ============================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID
  REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- ============================
-- 4. RLS policies for new columns
-- ============================
-- task_items is already covered by existing policies.
-- tasks RLS already covers updates.
-- items RLS already covers updates.
-- No new policies needed for existing tables.
