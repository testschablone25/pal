-- Shift Scheduling Rework: Add sub_location_id to shifts
-- 2026-06-09
--
-- Links shifts to the existing venue_sub_locations table (KERN, ORB, ORBIT, etc.)
-- No new table needed — venue_sub_locations was created in 2026-04-29 migration.

-- ============================
-- 1. Add sub_location_id to shifts
-- ============================
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS sub_location_id UUID REFERENCES venue_sub_locations(id);
CREATE INDEX IF NOT EXISTS idx_shifts_sub_location_id ON shifts(sub_location_id);

-- ============================
-- 2. Add clock columns (for future clock-in/out)
-- ============================
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clocked_in_at TIMESTAMPTZ;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clocked_out_at TIMESTAMPTZ;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS actual_break_minutes INT;
