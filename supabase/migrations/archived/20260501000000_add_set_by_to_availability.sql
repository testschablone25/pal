-- Add set_by column to track who set the availability (manager override)
ALTER TABLE availability ADD COLUMN set_by UUID REFERENCES staff(id);

-- Update RLS policy to allow staff to view and manage their own availability
-- and managers to view/manage all availability
CREATE POLICY "Staff can manage own availability" ON availability
  FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff WHERE profile_id = auth.uid() AND role IN ('manager', 'backoffice')
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff WHERE profile_id = auth.uid() AND role IN ('manager', 'backoffice')
    )
  );

-- Drop old policies if they exist and conflict
DROP POLICY IF EXISTS "Users can view availability" ON availability;
