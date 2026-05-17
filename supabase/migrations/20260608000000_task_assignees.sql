-- Junction table for task multi-assignee support
-- Enables multiple staff members to be assigned to a single task
-- Backward compatible: existing assignee_id column on tasks still works

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile_id ON task_assignees(profile_id);

-- Enable RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as task_items)
CREATE POLICY "Anyone can view task assignees" ON task_assignees FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task assignees" ON task_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete task assignees" ON task_assignees FOR DELETE USING (true);

-- Update tasks RLS policy to check task_assignees instead of only single assignee_id
DROP POLICY IF EXISTS "Assignee can update tasks" ON tasks;
CREATE POLICY "Assignee can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = id AND profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
  );
