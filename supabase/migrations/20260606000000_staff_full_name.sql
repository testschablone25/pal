-- Staff: add full_name column so staff without PAL accounts can be created
-- without needing a shadow profile (which requires an auth.users entry).

ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill existing staff names from their linked profiles
UPDATE staff
SET full_name = profiles.full_name
FROM profiles
WHERE staff.profile_id = profiles.id
  AND staff.full_name IS NULL;
