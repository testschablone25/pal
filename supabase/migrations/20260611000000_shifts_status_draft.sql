-- Shift Scheduling: Add "draft" status to shifts CHECK constraint
-- 2026-06-11
--
-- The Zod schema (shift.ts) uses shiftStatusEnum with "draft", "scheduled",
-- "confirmed", "completed", "cancelled". The DB constraint was missing "draft".

ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_status_check
  CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled'));
