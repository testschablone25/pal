-- Booking Agencies for artists (many-to-many)
-- Agencies differ from labels — they represent booking/talent agencies
-- An artist can have multiple agencies

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_agencies (
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  PRIMARY KEY (artist_id, agency_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_artist_agencies_artist ON artist_agencies(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_agencies_agency ON artist_agencies(agency_id);

-- RLS
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_agencies ENABLE ROW LEVEL SECURITY;

-- Policies for agencies
CREATE POLICY "Anyone can view agencies" ON agencies
  FOR SELECT USING (true);

CREATE POLICY "Admins, managers and booking can manage agencies" ON agencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );

-- Policies for artist_agencies
CREATE POLICY "Anyone can view artist agencies" ON artist_agencies
  FOR SELECT USING (true);

CREATE POLICY "Admins, managers and booking can manage artist agencies" ON artist_agencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );
