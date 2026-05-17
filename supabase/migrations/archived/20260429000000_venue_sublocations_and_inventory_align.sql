-- Venue Sub-Locations & Inventory Category Alignment
-- 2026-04-29
--
-- Adds:
-- 1. venue_sub_locations table (floors/areas/zones per venue)
-- 2. venue_type column to venues
-- 3. sub_location_id FK on items
-- 4. Updated item categories to match PAL's real-world taxonomy

-- ============================
-- 1. Add venue_type to venues
-- ============================
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type TEXT
  CHECK (venue_type IN ('venue', 'storage', 'office', 'mixed'));

-- ============================
-- 2. Create venue_sub_locations table
-- ============================
CREATE TABLE IF NOT EXISTS venue_sub_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_venue_sub_locations_venue_id ON venue_sub_locations(venue_id);
ALTER TABLE venue_sub_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue sub-locations" ON venue_sub_locations
  FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage sub-locations" ON venue_sub_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================
-- 3. Add sub_location_id to items (replace current_location free-text with FK)
-- ============================
ALTER TABLE items ADD COLUMN IF NOT EXISTS sub_location_id UUID
  REFERENCES venue_sub_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_sub_location_id ON items(sub_location_id);

-- ============================
-- 4. Update items.category to PAL categories
-- ============================
-- Drop old constraint first so we can update values
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;

-- Migrate existing items from old categories to new ones
UPDATE items SET category = 'pa_sound' WHERE category = 'sound';
UPDATE items SET category = 'dj_audio' WHERE category = 'dj';
UPDATE items SET category = 'venue_misc' WHERE category IN ('furniture', 'bar', 'misc');
-- 'lighting' stays the same
-- Catch any null/empty categories
UPDATE items SET category = 'venue_misc' WHERE category IS NULL OR category = '';

-- Add new constraint with PAL categories
ALTER TABLE items ADD CONSTRAINT items_category_check
  CHECK (category IN ('dj_audio', 'lighting', 'pa_sound', 'infrastructure', 'venue_misc'));

-- ============================
-- 5. RLS policy for items sub_location updates
-- ============================
-- Items already have "Anyone can update" policy, but ensure sub_location_id
-- is covered by the existing policy. The existing policy is:
--   CREATE POLICY "Anyone can update items" ON items FOR UPDATE USING (true);
-- This already grants update access, so no additional policy needed.

-- Seed data (venues, sub-locations, inventory items) moved to scripts/seed-pal-data.ts
