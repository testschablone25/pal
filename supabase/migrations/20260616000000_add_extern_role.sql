-- Add 'extern' role to app_role enum
-- For temporary/external staff helping out for a day or event

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'extern';
