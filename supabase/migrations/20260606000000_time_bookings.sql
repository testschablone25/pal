-- Time Bookings — Staff Clock In/Out
-- Standalone time tracking independent of shifts
-- 2026-06-06

-- ============================
-- TIME BOOKINGS TABLE
-- ============================

CREATE TABLE IF NOT EXISTS time_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  clocked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clocked_out_at TIMESTAMPTZ,
  notes TEXT,
  corrected_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_bookings_staff_id ON time_bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_time_bookings_clocked_in_at ON time_bookings(clocked_in_at);
CREATE INDEX IF NOT EXISTS idx_time_bookings_open ON time_bookings(staff_id) WHERE clocked_out_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_time_bookings_updated_at BEFORE UPDATE ON time_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================
-- ROW LEVEL SECURITY
-- ============================

ALTER TABLE time_bookings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can INSERT (clock in)
CREATE POLICY "Any authenticated user can clock in" ON time_bookings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Any authenticated user can UPDATE their own open booking (clock out)
CREATE POLICY "Users can clock out their own booking" ON time_bookings
  FOR UPDATE USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    AND clocked_out_at IS NULL
  );

-- Managers/admins can view all time bookings
CREATE POLICY "Managers/admins can view all time bookings" ON time_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'backoffice')
    )
  );

-- Individual staff can view their own time bookings
CREATE POLICY "Staff can view their own time bookings" ON time_bookings
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

-- Managers/admins can update all time bookings (corrections)
CREATE POLICY "Managers/admins can correct time bookings" ON time_bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'backoffice')
    )
  );
