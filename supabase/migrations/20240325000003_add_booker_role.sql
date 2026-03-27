-- Add 'booker' role to app_role enum
-- Booker handles flight bookings, travel logistics, artist contracts

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'booker';
