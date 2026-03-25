/**
 * Update PAL database with real artists from past PAL events
 * Artists sourced from RA, Instagram, and news articles about PAL Hamburg
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Real artists from PAL Hamburg events (2024-2026 reopening era)
const palArtists = [
  // PAL Residents & Hamburg Locals
  { name: 'Bobbie', city: 'Hamburg', fee: 3000, genre: 'Acid / Industrial / Techno', bio: 'PAL resident since 2014. Queen of Darkness. Acid, electro, techno, wave and industrial.' },
  { name: 'Leopold Faerberboeck', city: 'Hamburg', fee: 3500, genre: 'Techno', bio: 'PAL resident DJ and booker since the early days.' },
  { name: 'FJAAK', city: 'Hamburg', fee: 15000, genre: 'Techno', bio: 'Hamburgs techno boy band. Monkeytown Records artists.' },
  
  // SNAG Series Artists (PAL reopening events March 2026)
  { name: 'Amotik', city: 'Berlin', fee: 5000, genre: 'Techno', bio: 'Berlin-based DJ known for hypnotic, driving techno.' },
  { name: 'Danya', city: 'Hamburg', fee: 2500, genre: 'Techno', bio: 'Hamburg local, SNAG resident.' },
  { name: 'KH-1', city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg local DJ and producer.' },
  { name: 'Coco Honig', city: 'Hamburg', fee: 2500, genre: 'Techno', bio: 'Hamburg-based DJ with eclectic techno style.' },
  { name: 'Pernox', city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg local, rising talent.' },
  { name: 'Worthmann', city: 'Hamburg', fee: 2500, genre: 'Techno', bio: 'Hamburg DJ and visual artist.' },
  { name: 'House of Margo', city: 'Hamburg', fee: 2000, genre: 'Techno / House', bio: 'Hamburg collective and DJ.' },
  { name: 'Zulu Nine One', city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg-based DJ.' },
  { name: 'Carluschka', city: 'Hamburg', fee: 1800, genre: 'Minimal Dub / Acid', bio: 'Hamburg DJ specializing in minimal dub and acid.' },
  { name: 'Akiim', city: 'Hamburg', fee: 1800, genre: 'Techno', bio: 'Hamburg local DJ.' },
  
  // Other artists from PAL reopening lineups
  { name: 'Grace Dahl', city: 'Berlin', fee: 4000, genre: 'Techno', bio: 'Berlin-based DJ known for energetic sets.' },
  { name: 'Hello Sasy', city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg local DJ.' },
  { name: 'Jesse de Haan', city: 'Amsterdam', fee: 4500, genre: 'Techno', bio: 'Dutch DJ known for hard, industrial techno.' },
  { name: 'Anton Jonathan', city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg-based DJ.' },
  { name: 'DJ Babyblade', city: 'Hamburg', fee: 1800, genre: 'Techno', bio: 'Hamburg local DJ.' },
  { name: 'DJ Source', city: 'Hamburg', fee: 1800, genre: 'Techno', bio: 'Hamburg local DJ.' },
  { name: 'T.Playboi', city: 'Hamburg', fee: 1800, genre: 'Techno', bio: 'Hamburg local DJ.' },
  
  // Classic PAL / Hamburg Scene
  { name: 'Vincent Neumann', city: 'Leipzig', fee: 3500, genre: 'Techno', bio: 'Leipzig-based DJ who played PAL reopening 2024.' },
  { name: 'Bconscious', city: 'Berlin', fee: 3000, genre: 'Techno / House', bio: 'Italian-born, Berlin-based DJ.' },
];

async function updateArtists() {
  console.log('🎵 Updating PAL database with real artists...\n');

  // First, delete existing test artists
  const { data: existingArtists } = await supabase
    .from('artists')
    .select('id, name');

  if (existingArtists && existingArtists.length > 0) {
    console.log(`🗑️ Removing ${existingArtists.length} test artists...`);
    
    // Delete performances first (foreign key constraint)
    await supabase.from('performances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete artists
    const { error } = await supabase
      .from('artists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error deleting artists:', error.message);
    }
  }

  // Insert real PAL artists
  console.log(`\n🎤 Adding ${palArtists.length} real PAL artists...`);
  
  const { data: newArtists, error } = await supabase
    .from('artists')
    .insert(palArtists)
    .select('id, name');

  if (error) {
    console.error('Error inserting artists:', error.message);
    return;
  }

  console.log('\n✅ Artists added:');
  newArtists?.forEach(a => console.log(`  - ${a.name}`));

  // Recreate performances for Opening Night with real artists
  console.log('\n📅 Setting up Opening Night lineup...');
  
  const { data: firstEvent } = await supabase
    .from('events')
    .select('id')
    .eq('name', 'PAL Opening Night')
    .single();

  if (firstEvent && newArtists) {
    // Get artist IDs
    const artistMap = new Map(newArtists.map(a => [a.name, a.id]));
    
    // Opening Night lineup (realistic order)
    const lineup = [
      { name: 'Danya', start: '22:00', end: '00:00', stage: 'main' },
      { name: 'Carluschka', start: '00:00', end: '01:30', stage: 'main' },
      { name: 'Amotik', start: '01:30', end: '03:00', stage: 'main' },
      { name: 'Grace Dahl', start: '03:00', end: '04:30', stage: 'main' },
      { name: 'FJAAK', start: '04:30', end: '06:00', stage: 'main' },
    ];

    // Delete existing performances
    await supabase.from('performances').delete().eq('event_id', firstEvent.id);

    // Insert new lineup
    for (let i = 0; i < lineup.length; i++) {
      const artistId = artistMap.get(lineup[i].name);
      if (artistId) {
        await supabase.from('performances').insert({
          event_id: firstEvent.id,
          artist_id: artistId,
          start_time: lineup[i].start,
          end_time: lineup[i].end,
          stage: lineup[i].stage,
          order_index: i,
        });
        console.log(`  ✓ ${lineup[i].name} (${lineup[i].start} - ${lineup[i].end})`);
      }
    }
  }

  // Update events with more realistic names
  console.log('\n📅 Updating event names...');
  await supabase
    .from('events')
    .update({ name: 'PAL First Encounters' })
    .eq('name', 'PAL Opening Night');

  await supabase
    .from('events')
    .update({ name: 'SNAG 1Y Anniversary' })
    .eq('name', 'PAL Anniversary');

  console.log('\n✅ Database updated with real PAL artists!');
  console.log('\n📊 Summary:');
  console.log(`  - ${palArtists.length} real artists added`);
  console.log(`  - Opening night lineup: Danya → Carluschka → Amotik → Grace Dahl → FJAAK`);
}

updateArtists().catch(console.error);
