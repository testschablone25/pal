-- Labels for artists (many-to-many)
-- Labels can have multiple artists, artists can have multiple labels

CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_labels (
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (artist_id, label_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_artist_labels_artist ON artist_labels(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_labels_label ON artist_labels(label_id);

-- RLS
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_labels ENABLE ROW LEVEL SECURITY;

-- Policies for labels
CREATE POLICY "Anyone can view labels" ON labels
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage labels" ON labels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );

-- Policies for artist_labels
CREATE POLICY "Anyone can view artist labels" ON artist_labels
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage artist labels" ON artist_labels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );
