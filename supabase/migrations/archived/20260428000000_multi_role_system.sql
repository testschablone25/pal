-- Multi-Role System Migration
-- Adds new roles and converts to multi-role architecture

-- Step 1: Drop ALL existing policies that depend on the role column or user_roles table
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Admin full access on events" ON events;
DROP POLICY IF EXISTS "Event staff can manage guest entries" ON guest_entries;
DROP POLICY IF EXISTS "Assignee can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admin full access on user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can update roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Managers can view all roles" ON user_roles;

-- Step 2: Temporarily disable RLS on user_roles to avoid recursion during migration
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 3: Create new enum type with all roles
CREATE TYPE app_role_new AS ENUM (
  'admin',
  'manager',
  'booking',
  'social-media',
  'night-management',
  'label',
  'staff',
  'tech',
  'tech-lead',
  'gastro',
  'backoffice',
  'awareness',
  'azubi'
);

-- Step 4: Add a temporary column with the new type
ALTER TABLE user_roles ADD COLUMN role_new app_role_new;

-- Step 5: Migrate existing roles to new roles
UPDATE user_roles SET role_new = 
  CASE role::TEXT
    WHEN 'admin' THEN 'admin'::app_role_new
    WHEN 'manager' THEN 'manager'::app_role_new
    WHEN 'promoter' THEN 'social-media'::app_role_new
    WHEN 'artist' THEN 'label'::app_role_new
    WHEN 'staff' THEN 'staff'::app_role_new
    WHEN 'booker' THEN 'booking'::app_role_new
    WHEN 'guest' THEN 'azubi'::app_role_new
    ELSE 'azubi'::app_role_new
  END;

-- Step 6: Set NOT NULL after migration
ALTER TABLE user_roles ALTER COLUMN role_new SET NOT NULL;

-- Step 7: Drop unique constraint on old column
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Step 8: Drop old column and rename new one
ALTER TABLE user_roles DROP COLUMN role;
ALTER TABLE user_roles RENAME COLUMN role_new TO role;

-- Step 9: Drop old enum and rename new one
DROP TYPE app_role;
ALTER TYPE app_role_new RENAME TO app_role;

-- Step 10: Recreate the unique constraint
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE(user_id, role);

-- Step 11: Re-enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 12: Create simple RLS policies for user_roles that don't cause recursion
-- Users can read their own roles (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Service role has full access (for API routes using service key)
-- No policy needed - service role bypasses RLS

-- Step 13: Recreate RLS policies for other tables

-- Admin/Manager full access on profiles
CREATE POLICY "Admin full access on profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Event managers can manage events
CREATE POLICY "Event managers can manage events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'backoffice', 'booking', 'social-media', 'night-management')
    )
  );

-- Staff can view events
CREATE POLICY "Staff can view events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Door staff can manage guest entries
CREATE POLICY "Door staff can manage guest entries" ON guest_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'night-management', 'awareness', 'staff')
    )
  );

-- Task assignee can update their tasks
CREATE POLICY "Assignee can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice')
    )
  );

-- Add comment for documentation
COMMENT ON TYPE app_role IS 'User roles: admin (super-user), manager, booking, social-media, night-management, label, staff, tech, tech-lead, gastro, backoffice, awareness, azubi';
