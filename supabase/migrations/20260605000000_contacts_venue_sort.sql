-- Telephone Book + Venue Sorting
-- Adds:
--   1. is_pal_location flag to venues (PAL-owned vs external party host)
--   2. Permission for contacts feature

-- ============================
-- VENUES: Add PAL location flag
-- ============================

ALTER TABLE venues 
  ADD COLUMN IF NOT EXISTS is_pal_location BOOLEAN NOT NULL DEFAULT true;

-- Update existing venues: by default they're PAL locations
-- (no change needed due to DEFAULT true)

-- ============================
-- RLS: Allow update on is_pal_location for authorized roles
-- ============================

-- Anyone who can view venues can also see is_pal_location (already on SELECT)
-- Only admins/managers can update it (already covered by existing RLS for update)
-- No new RLS policy needed, the existing venue update policies cover it.
