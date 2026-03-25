-- Relax RLS for public-facing tables
-- Artists, events, venues should be publicly readable

-- Artists: everyone can read
CREATE POLICY "Anyone can view artists" ON artists
  FOR SELECT USING (true);

-- Venues: everyone can read
CREATE POLICY "Anyone can view venues" ON venues
  FOR SELECT USING (true);

-- Events: everyone can read published events
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (status = 'published' OR status = 'draft');

-- Performances: everyone can read
CREATE POLICY "Anyone can view performances" ON performances
  FOR SELECT USING (true);
