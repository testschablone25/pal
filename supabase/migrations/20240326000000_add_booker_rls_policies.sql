-- Add booker role to existing RLS policies
-- Booker manages artist bookings, performances, and travel logistics

-- Update events policy: booker can manage events (for booking-related work)
CREATE POLICY "Booker can manage events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'booker'
    )
  );

-- Artists: booker can insert/update (manage bookings)
-- Note: SELECT is already public via "Anyone can view artists"
CREATE POLICY "Booker can manage artists" ON artists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booker')
    )
  );

CREATE POLICY "Booker can update artists" ON artists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booker')
    )
  );

-- Performances: booker can manage (set times, assign artists)
CREATE POLICY "Booker can manage performances" ON performances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booker')
    )
  );

CREATE POLICY "Booker can update performances" ON performances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booker')
    )
  );

-- Tasks: booker can view and update tasks assigned to them
CREATE POLICY "Booker can view own tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = assignee_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'booker')
  );

CREATE POLICY "Booker can update own tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'booker')
  );
