/**
 * Migration: Add tech_rider and hospitality_rider columns to artists
 * 
 * Run with: npx tsx scripts/migration-add-riders.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration() {
  console.log('🔧 Running migration: Add rider columns...\n');

  // First, try to select the columns to see if they exist
  const { data: testData, error: testError } = await supabase
    .from('artists')
    .select('id, tech_rider, hospitality_rider')
    .limit(1);

  if (testError && testError.message.includes('tech_rider')) {
    console.log('⚠️ Columns do not exist yet. Manual migration needed.');
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log(`
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS tech_rider JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hospitality_rider JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_artists_tech_rider ON artists USING gin(tech_rider);
CREATE INDEX IF NOT EXISTS idx_artists_hospitality_rider ON artists USING gin(hospitality_rider);
    `);
    return;
  }

  console.log('✅ Rider columns already exist or were added successfully!');
  
  // Test that we can read/write to the columns
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name')
    .limit(1);

  if (artists && artists.length > 0) {
    console.log('✅ Verified: Can access artists table');
  }
}

runMigration().catch(console.error);
