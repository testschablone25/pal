-- Fix: Allow authenticated users to view all profiles
-- Needed for time bookings kiosk to display staff names

CREATE POLICY "Authenticated users can view all profiles" ON profiles
	FOR SELECT USING (auth.role() = 'authenticated');
