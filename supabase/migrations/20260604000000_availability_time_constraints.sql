-- Add time constraints and notes to availability
-- Allows partial-day availability: "available from 12:00" or "only available until 16:00"

ALTER TABLE availability ADD COLUMN IF NOT EXISTS available_from TIME;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS available_until TIME;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS notes TEXT;
