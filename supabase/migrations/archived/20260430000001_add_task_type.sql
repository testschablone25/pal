-- Add task_type column to tasks table
-- PAL nightclub-specific task types: 2026-04-30

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT;

-- Add CHECK constraint for valid types
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check
  CHECK (task_type IN (
    'setup',
    'teardown',
    'repair',
    'maintenance',
    'logistics',
    'procurement',
    'tech_check',
    'crew',
    'booking',
    'cleanup',
    'safety',
    'inventory',
    'catering',
    'transportation',
    'documentation'
  ));

CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
