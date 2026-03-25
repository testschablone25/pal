-- Add RLS policies for tasks and task_comments

-- Tasks: Users can view tasks assigned to them
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = assignee_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Tasks: Users can update tasks assigned to them
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Tasks: Admins and managers can insert tasks
CREATE POLICY "Admins can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Task Comments: Users can view comments on tasks they're assigned to
CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_comments.task_id AND assignee_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Task Comments: Users can add comments
CREATE POLICY "Users can add task comments" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
  );

-- Staff: Users can view staff records
CREATE POLICY "Users can view staff" ON staff
  FOR SELECT USING (true);

-- Shifts: Users can view all shifts
CREATE POLICY "Users can view shifts" ON shifts
  FOR SELECT USING (true);

-- Availability: Users can view all availability
CREATE POLICY "Users can view availability" ON availability
  FOR SELECT USING (true);
