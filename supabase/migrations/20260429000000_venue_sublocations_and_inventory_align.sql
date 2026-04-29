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

-- ============================
-- 6. Seed PAL venues with sub-locations
-- ============================
INSERT INTO venues (id, name, address, capacity, venue_type) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'PHOXXI Green Area', 'Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg', 5000, 'venue'),
  ('a0000000-0000-4000-8000-000000000002', 'Deichtor-Hallen', 'Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg', 2000, 'storage'),
  ('a0000000-0000-4000-8000-000000000003', 'Berliner Bahnhof', 'Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg', 3000, 'venue'),
  ('a0000000-0000-4000-8000-000000000004', 'PAL Club GmbH & Co. KG', 'Hammerbrookstr. 43, 20097 Hamburg', 1500, 'venue'),
  ('a0000000-0000-4000-8000-000000000005', 'Fruchthof', NULL, 4000, 'mixed'),
  ('a0000000-0000-4000-8000-000000000006', 'PAL Office', 'Grindelhof 35a, 20146 Hamburg', 50, 'office'),
  ('a0000000-0000-4000-8000-000000000007', 'Orbit Cafe', 'Hammerbrookstr. 43, 20097 Hamburg', 100, 'venue')
ON CONFLICT (id) DO NOTHING;

-- Seed sub-locations
INSERT INTO venue_sub_locations (venue_id, name, description) VALUES
  -- PAL Club has KERN, ORB, ORBIT
  ('a0000000-0000-4000-8000-000000000004', 'KERN', 'Main dancefloor / club area'),
  ('a0000000-0000-4000-8000-000000000004', 'ORB', 'Second room / ambient area'),
  ('a0000000-0000-4000-8000-000000000004', 'ORBIT', 'Third room / bar/lounge area'),
  -- PHOXXI is openair
  ('a0000000-0000-4000-8000-000000000001', 'Openair', 'Outdoor festival area'),
  -- Fruchthof is openair
  ('a0000000-0000-4000-8000-000000000005', 'Openair', 'Outdoor area at Fruchthof')
ON CONFLICT (venue_id, name) DO NOTHING;

-- ============================
-- 7. Seed PAL inventory items
-- ============================
INSERT INTO items (id, name, category, serial_number, current_location) VALUES
  -- DJ & Audio Equipment
  ('b0000000-0000-4000-8000-000000000001', 'CDJ 3000 inkl. Case', 'dj_audio', 'CDJ3K-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000002', 'CDJ 3000 inkl. Case', 'dj_audio', 'CDJ3K-002', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000003', 'CDJ 2000 NXS 2 inkl. Case', 'dj_audio', 'CDJ2K-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000004', 'XONE 96 inkl. Case', 'dj_audio', 'XONE96-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000005', 'XONE 96', 'dj_audio', 'XONE96-002', 'Deichtor-Hallen'),
  ('b0000000-0000-4000-8000-000000000006', 'Technics SL 1210 MK7 inkl. Needle', 'dj_audio', 'TECH-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000007', 'Technics SL 1210 MK7 inkl. Needle', 'dj_audio', 'TECH-002', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000008', 'Scarlett 4i4 Oli', 'dj_audio', 'SCAR-001', 'PAL Club GmbH & Co. KG'),
  -- Lighting Equipment
  ('b0000000-0000-4000-8000-000000000009', 'AKAI APC 40 MK2', 'lighting', 'AKAI-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000010', 'Novation Maschine Kontrol', 'lighting', 'NOV-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000011', 'APELABS inkl. Case', 'lighting', 'APE-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000012', 'APELABS inkl. Case', 'lighting', 'APE-002', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000013', 'APELABS', 'lighting', 'APE-003', 'Fruchthof'),
  ('b0000000-0000-4000-8000-000000000014', 'Moving Head NTSC', 'lighting', 'MH-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000015', 'Strobe Tigerstrobe', 'lighting', 'STROBE-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000016', 'Halogen-Ersatz ORB', 'lighting', 'HAL-ORB-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000017', 'Ground Fog', 'lighting', 'GFOG-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000018', 'Captain D Fog', 'lighting', 'CFOG-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000019', 'Tour Hazer 2', 'lighting', 'HAZE-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000020', 'EUROLITE Beam KERN', 'lighting', 'BEAM-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000021', 'Lazer', 'lighting', 'LAZER-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000022', 'Washlight', 'lighting', 'WASH-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000023', 'PAR 16', 'lighting', 'PAR16-001', 'Fruchthof'),
  -- PA & SOUND
  ('b0000000-0000-4000-8000-000000000024', 'PAL HORN', 'pa_sound', 'HORN-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000025', 'SANDEL & LARSSON TOP', 'pa_sound', 'SLTOP-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000026', 'PAL SUB STACK', 'pa_sound', 'SUBSTACK-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000027', 'KLING FREITAG CR1216', 'pa_sound', 'KF1216-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000028', 'VOID VENU 6', 'pa_sound', 'VOID6-001', 'Orbit Cafe'),
  ('b0000000-0000-4000-8000-000000000029', 'KLING FREITAG BS 1', 'pa_sound', 'KFBS1-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000030', 'SSNAKE', 'pa_sound', 'SNAKE-001', 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000031', 'SSNAKE', 'pa_sound', 'SNAKE-002', 'Deichtor-Hallen'),
  ('b0000000-0000-4000-8000-000000000032', 'FOHHN ROAD TOP', 'pa_sound', 'FOHHNTOP-001', 'Fruchthof'),
  ('b0000000-0000-4000-8000-000000000033', 'FÖÖN SUB', 'pa_sound', 'FSUB-001', 'Fruchthof'),
  ('b0000000-0000-4000-8000-000000000034', 'FÖÖN TOP', 'pa_sound', 'FTOP-001', 'Fruchthof'),
  ('b0000000-0000-4000-8000-000000000035', 'KLING FREITAG SW115', 'pa_sound', 'KFSW115-001', 'Fruchthof'),
  ('b0000000-0000-4000-8000-000000000036', 'SONOS', 'pa_sound', 'SONOS-001', 'PAL Office'),
  -- Infrastructure & Signal
  ('b0000000-0000-4000-8000-000000000037', 'Splitter', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000038', 'Adapter', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000039', 'XLR', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000040', 'PowerCON', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000041', 'Speakon', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000042', 'Stromverteilung', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000043', 'Turntable Chinch', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000044', 'CDJ Chinch', 'infrastructure', NULL, 'PAL Club GmbH & Co. KG'),
  -- Venue & Misc
  ('b0000000-0000-4000-8000-000000000045', 'Sofa', 'venue_misc', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000046', 'Ventilator', 'venue_misc', NULL, 'PAL Club GmbH & Co. KG'),
  ('b0000000-0000-4000-8000-000000000047', 'Sitzkübel', 'venue_misc', NULL, 'PAL Club GmbH & Co. KG')
ON CONFLICT (id) DO NOTHING;
