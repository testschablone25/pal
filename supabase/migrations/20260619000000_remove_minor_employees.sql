-- Remove minor employee support (only 18+ staff)
-- Drop is_minor column and remove 'minor' from contract_type enum

-- Note: Postgres doesn't support removing enum values directly.
-- We recreate the enum without 'minor' using a cast-through-text approach.

-- 1. Drop is_minor column
ALTER TABLE staff DROP COLUMN IF EXISTS is_minor;

-- 2. Recreate contract_type enum without 'minor'
-- First, find columns using the enum
ALTER TABLE staff ALTER COLUMN contract_type TYPE TEXT;

-- Drop the old enum type
DROP TYPE IF EXISTS contract_type;

-- Create new enum without 'minor'
CREATE TYPE contract_type AS ENUM ('permanent', 'freelance');

-- Cast back to the new enum
ALTER TABLE staff ALTER COLUMN contract_type TYPE contract_type USING contract_type::contract_type;
