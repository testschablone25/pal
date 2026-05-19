// Migration: add agencies and artist_agencies tables
// Run: npx dotenv -e .env.local -- npx tsx scripts/run-migration-agencies.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SQL = `
-- Booking Agencies for artists (many-to-many)
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

CREATE INDEX IF NOT EXISTS idx_artist_agencies_artist ON artist_agencies(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_agencies_agency ON artist_agencies(agency_id);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view agencies" ON agencies
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admins, managers and booking can manage agencies" ON agencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );

CREATE POLICY IF NOT EXISTS "Anyone can view artist agencies" ON artist_agencies
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admins, managers and booking can manage artist agencies" ON artist_agencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'booking')
    )
  );
`;

async function run() {
	if (!supabaseUrl || !supabaseServiceKey) {
		console.error("Missing Supabase credentials in environment");
		process.exit(1);
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	console.log("Running migration: add agencies + artist_agencies tables...");

	const { error } = await supabase.rpc("exec_sql", { sql: SQL });

	if (error) {
		console.error("Migration via RPC failed:", error.message);
		console.log("\nTrying direct SQL execution via raw query...");

		// Try executing SQL via raw query as fallback
		const { error: rawError } = await supabase
			.from("_sql_exec")
			.insert({ query: SQL })
			.select()
			.single();

		if (rawError) {
			console.log("\n⚠️  Could not auto-apply migration.");
			console.log(
				"\nPlease run this SQL in the Supabase Dashboard → SQL Editor:\n",
			);
			console.log(SQL);
			process.exit(1);
		}
	}

	console.log("✅ Migration applied successfully!");

	// Verify tables exist
	const { data: agencies } = await supabase
		.from("agencies")
		.select("count")
		.limit(1);
	console.log("  agencies table: ready", agencies ? "✅" : "❌");

	const { data: junction } = await supabase
		.from("artist_agencies")
		.select("count")
		.limit(1);
	console.log("  artist_agencies table: ready", junction ? "✅" : "❌");
}

run().catch(console.error);
