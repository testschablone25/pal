-- Venue Hub Enhancement
-- 2026-06-02
--
-- Adds:
-- 1. venue_id on tasks (for tasks not tied to an event)
-- 2. capacity on venue_sub_locations
-- 3. notes + contact fields on venues

-- ============================
-- 1. Add venue_id to tasks
-- ============================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_venue_id ON tasks(venue_id);

-- ============================
-- 2. Add capacity to venue_sub_locations
-- ============================
ALTER TABLE venue_sub_locations ADD COLUMN IF NOT EXISTS capacity INT;

-- ============================
-- 3. Add notes and contact fields to venues
-- ============================
ALTER TABLE venues ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_email TEXT;
