/**
 * Add performances to all events and create artist documents/riders
 * 
 * Run with: npx tsx scripts/add-performances-and-docs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Lineups for each event (realistic for PAL Hamburg)
const eventLineups: Record<string, { name: string; start: string; end: string; stage: string }[]> = {
  'PAL First Encounters': [
    { name: 'Danya', start: '22:00', end: '00:00', stage: 'main' },
    { name: 'Carluschka', start: '00:00', end: '01:30', stage: 'main' },
    { name: 'Amotik', start: '01:30', end: '03:00', stage: 'main' },
    { name: 'Grace Dahl', start: '03:00', end: '04:30', stage: 'main' },
    { name: 'FJAAK', start: '04:30', end: '06:00', stage: 'main' },
  ],
  'Techno Friday': [
    { name: 'Hello Sasy', start: '23:00', end: '01:00', stage: 'main' },
    { name: 'Pernox', start: '01:00', end: '02:30', stage: 'main' },
    { name: 'Worthmann', start: '02:30', end: '04:00', stage: 'main' },
    { name: 'Bobbie', start: '04:00', end: '06:00', stage: 'main' },
    { name: 'Jesse de Haan', start: '06:00', end: '07:00', stage: 'main' },
  ],
  'Deep Sunday': [
    { name: 'House of Margo', start: '20:00', end: '22:00', stage: 'main' },
    { name: 'Zulu Nine One', start: '22:00', end: '00:00', stage: 'main' },
    { name: 'Akiim', start: '00:00', end: '01:30', stage: 'main' },
    { name: 'Danya', start: '01:30', end: '03:00', stage: 'main' },
    { name: 'Leopold Faerberboeck', start: '03:00', end: '04:00', stage: 'main' },
  ],
  'Industrial Night': [
    { name: 'DJ Babyblade', start: '23:00', end: '01:00', stage: 'main' },
    { name: 'Coco Honig', start: '01:00', end: '02:30', stage: 'main' },
    { name: 'Anton Jonathan', start: '02:30', end: '04:00', stage: 'main' },
    { name: 'Vincent Neumann', start: '04:00', end: '05:30', stage: 'main' },
    { name: 'Bconscious', start: '05:30', end: '07:00', stage: 'main' },
  ],
  'SNAG 1Y Anniversary': [
    { name: 'DJ Source', start: '23:00', end: '01:00', stage: 'main' },
    { name: 'T.Playboi', start: '01:00', end: '02:30', stage: 'main' },
    { name: 'Carluschka', start: '02:30', end: '04:00', stage: 'main' },
    { name: 'Amotik', start: '04:00', end: '05:30', stage: 'main' },
    { name: 'FJAAK', start: '05:30', end: '08:00', stage: 'main' },
  ],
};

// Artist details for updating records
const artistDetails: Record<string, { 
  city: string; 
  fee: number; 
  genre: string; 
  bio: string;
  contact_email: string;
  contact_phone: string;
}> = {
  'Bobbie': { city: 'Hamburg', fee: 3500, genre: 'Acid / Industrial / Techno', bio: 'PAL resident since 2014. Queen of Darkness. Known for acid, electro, techno, wave and industrial sets that tell a story over 4 hours.', contact_email: 'bobbie@pal-hamburg.de', contact_phone: '+49 40 1234567' },
  'Leopold Faerberboeck': { city: 'Hamburg', fee: 4000, genre: 'Techno', bio: 'PAL resident DJ and booker since the early days. Deep, hypnotic techno with a dark edge.', contact_email: 'leopold@pal-hamburg.de', contact_phone: '+49 40 2345678' },
  'FJAAK': { city: 'Hamburg', fee: 18000, genre: 'Techno', bio: 'Hamburgs techno boy band. Monkeytown Records artists. FJAAK deliver relentless, high-energy techno that has made them one of Germanys most sought-after live acts.', contact_email: 'booking@fjaak.com', contact_phone: '+49 40 3456789' },
  'Amotik': { city: 'Berlin', fee: 6000, genre: 'Techno', bio: 'Berlin-based DJ known for hypnotic, driving techno. Releases on Ilian Tape and his own Amotik label.', contact_email: 'booking@amotik.com', contact_phone: '+49 30 4567890' },
  'Danya': { city: 'Hamburg', fee: 3000, genre: 'Techno', bio: 'Hamburg local, SNAG resident. Deep, groovy techno with industrial influences.', contact_email: 'danya@pal-hamburg.de', contact_phone: '+49 40 4567890' },
  'KH-1': { city: 'Hamburg', fee: 2500, genre: 'Techno', bio: 'Hamburg local DJ and producer. Rising talent in the local scene with a focus on peak-time techno.', contact_email: 'kh1@pal-hamburg.de', contact_phone: '+49 40 5678901' },
  'Coco Honig': { city: 'Hamburg', fee: 2800, genre: 'Techno / EBM', bio: 'Hamburg-based DJ with eclectic techno style mixing EBM, industrial and acid influences.', contact_email: 'coco@pal-hamburg.de', contact_phone: '+49 40 6789012' },
  'Pernox': { city: 'Hamburg', fee: 2200, genre: 'Techno', bio: 'Hamburg local, rising talent. Known for fast, relentless techno sets.', contact_email: 'pernox@pal-hamburg.de', contact_phone: '+49 40 7890123' },
  'Worthmann': { city: 'Hamburg', fee: 2800, genre: 'Techno / Dub Techno', bio: 'Hamburg DJ and visual artist. Creates immersive techno experiences with accompanying visuals.', contact_email: 'worthmann@pal-hamburg.de', contact_phone: '+49 40 8901234' },
  'House of Margo': { city: 'Hamburg', fee: 2200, genre: 'Techno / House', bio: 'Hamburg collective and DJ duo. Known for warm, groovy techno and house.', contact_email: 'margo@pal-hamburg.de', contact_phone: '+49 40 9012345' },
  'Zulu Nine One': { city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg-based DJ. Fast, energetic techno with trance influences.', contact_email: 'zulu@pal-hamburg.de', contact_phone: '+49 40 0123456' },
  'Carluschka': { city: 'Hamburg', fee: 2500, genre: 'Minimal Dub / Acid', bio: 'Hamburg DJ specializing in minimal dub and acid. Deep, hypnotic selections that pull you into another dimension.', contact_email: 'carluschka@pal-hamburg.de', contact_phone: '+49 40 1111111' },
  'Akiim': { city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg local DJ. Up-and-coming talent with a focus on hard, driving techno.', contact_email: 'akiim@pal-hamburg.de', contact_phone: '+49 40 2222222' },
  'Grace Dahl': { city: 'Berlin', fee: 5000, genre: 'Techno', bio: 'Berlin-based DJ known for energetic, floor-filling techno sets. Regular at Tresor and Berghain.', contact_email: 'booking@gracedahl.com', contact_phone: '+49 30 3333333' },
  'Hello Sasy': { city: 'Hamburg', fee: 2200, genre: 'Techno', bio: 'Hamburg local DJ. Deep, atmospheric techno with a focus on mood and texture.', contact_email: 'hellosasy@pal-hamburg.de', contact_phone: '+49 40 4444444' },
  'Jesse de Haan': { city: 'Amsterdam', fee: 5500, genre: 'Industrial Techno', bio: 'Dutch DJ known for hard, industrial techno. Releases on CLR and Suara. Relentless energy.', contact_email: 'booking@jesse-dehaan.com', contact_phone: '+31 20 5555555' },
  'Anton Jonathan': { city: 'Hamburg', fee: 2200, genre: 'Techno', bio: 'Hamburg-based DJ. Dark, driving techno with industrial edge.', contact_email: 'anton@pal-hamburg.de', contact_phone: '+49 40 6666666' },
  'DJ Babyblade': { city: 'Hamburg', fee: 2000, genre: 'Hard Techno', bio: 'Hamburg local DJ. Known for hard, fast techno sets that push boundaries.', contact_email: 'babyblade@pal-hamburg.de', contact_phone: '+49 40 7777777' },
  'DJ Source': { city: 'Hamburg', fee: 2000, genre: 'Techno', bio: 'Hamburg local DJ. Veteran of the scene with deep knowledge of techno history.', contact_email: 'source@pal-hamburg.de', contact_phone: '+49 40 8888888' },
  'T.Playboi': { city: 'Hamburg', fee: 2200, genre: 'Techno / Trance', bio: 'Hamburg DJ blending techno with trance influences. High-energy, euphoric sets.', contact_email: 'playboi@pal-hamburg.de', contact_phone: '+49 40 9999999' },
  'Vincent Neumann': { city: 'Leipzig', fee: 4000, genre: 'Techno', bio: 'Leipzig-based DJ who played PAL reopening 2024. Known for deep, groovy techno.', contact_email: 'booking@vincentneumann.com', contact_phone: '+49 341 1111111' },
  'Bconscious': { city: 'Berlin', fee: 3500, genre: 'Techno / House', bio: 'Italian-born, Berlin-based DJ. Blends techno with house and disco influences for versatile, crowd-pleasing sets.', contact_email: 'bconscious@booking.com', contact_phone: '+49 30 2222222' },
};

async function addPerformancesAndDocs() {
  console.log('🎵 Adding performances and artist details...\n');

  // Step 1: Get artists and events
  console.log('📊 Fetching existing data...');
  const { data: artists } = await supabase.from('artists').select('id, name');
  const { data: events } = await supabase.from('events').select('id, name, date');

  const artistMap = new Map(artists?.map(a => [a.name, a.id]) || []);
  const eventMap = new Map(events?.map(e => [e.name, { id: e.id, date: e.date }]) || []);

  console.log(`  - ${artists?.length || 0} artists`);
  console.log(`  - ${events?.length || 0} events`);

  // Step 2: Update artist details
  console.log('\n🎤 Updating artist details...');
  for (const [name, details] of Object.entries(artistDetails)) {
    const artistId = artistMap.get(name);
    if (artistId) {
      await supabase
        .from('artists')
        .update(details)
        .eq('id', artistId);
      console.log(`  ✓ Updated: ${name}`);
    }
  }

  // Step 3: Clear existing performances and add new ones
  console.log('\n📅 Setting up running orders for all events...');
  await supabase.from('performances').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const [eventName, lineup] of Object.entries(eventLineups)) {
    const eventData = eventMap.get(eventName);
    if (!eventData) {
      console.log(`  ⚠ Event not found: ${eventName}`);
      continue;
    }

    console.log(`\n  📅 ${eventName} (${eventData.date})`);

    for (let i = 0; i < lineup.length; i++) {
      const perf = lineup[i];
      const artistId = artistMap.get(perf.name);

      if (!artistId) {
        console.log(`    ⚠ Artist not found: ${perf.name}`);
        continue;
      }

      const { error } = await supabase
        .from('performances')
        .insert({
          event_id: eventData.id,
          artist_id: artistId,
          start_time: perf.start,
          end_time: perf.end,
          stage: perf.stage,
          order_index: i,
        });

      if (error) {
        console.error(`    ✗ Error: ${perf.name} - ${error.message}`);
      } else {
        console.log(`    ✓ ${perf.name} (${perf.start} - ${perf.end})`);
      }
    }
  }

  // Step 4: Create artist documents (riders, contracts, etc.)
  console.log('\n📄 Creating artist document records...');

  // First ensure we have a documents column or table
  // We'll store document references in the artists table's documents JSONB field

  const artistDocuments: Record<string, { name: string; type: string; url: string }[]> = {
    'FJAAK': [
      { name: 'Technical Rider', type: 'rider', url: '/documents/fjaak-technical-rider.pdf' },
      { name: 'Hospitality Rider', type: 'rider', url: '/documents/fjaak-hospitality-rider.pdf' },
      { name: 'Booking Contract Template', type: 'contract', url: '/documents/fjaak-contract-template.pdf' },
      { name: 'Press Kit', type: 'promo', url: '/documents/fjaak-press-kit.zip' },
    ],
    'Bobbie': [
      { name: 'Technical Rider', type: 'rider', url: '/documents/bobbie-technical-rider.pdf' },
      { name: 'Artist Bio & Photos', type: 'promo', url: '/documents/bobbie-press-kit.zip' },
    ],
    'Amotik': [
      { name: 'Rider', type: 'rider', url: '/documents/amotik-rider.pdf' },
      { name: 'EPK', type: 'promo', url: '/documents/amotik-epk.pdf' },
    ],
    'Grace Dahl': [
      { name: 'Technical Rider', type: 'rider', url: '/documents/gracedahl-rider.pdf' },
      { name: 'Press Photos', type: 'promo', url: '/documents/gracedahl-photos.zip' },
      { name: 'Booking Contract', type: 'contract', url: '/documents/gracedahl-contract.pdf' },
    ],
    'Jesse de Haan': [
      { name: 'Technical Rider', type: 'rider', url: '/documents/jessedehaan-rider.pdf' },
      { name: 'Hospitality Rider', type: 'rider', url: '/documents/jessedehaan-hospitality.pdf' },
      { name: 'Press Kit', type: 'promo', url: '/documents/jessedehaan-press.zip' },
    ],
    'Vincent Neumann': [
      { name: 'Rider', type: 'rider', url: '/documents/vincentneumann-rider.pdf' },
      { name: 'EPK', type: 'promo', url: '/documents/vincentneumann-epk.pdf' },
    ],
    'Leopold Faerberboeck': [
      { name: 'PAL Resident Agreement', type: 'contract', url: '/documents/leopold-resident-agreement.pdf' },
    ],
    'Bconscious': [
      { name: 'Rider', type: 'rider', url: '/documents/bconscious-rider.pdf' },
      { name: 'Press Kit', type: 'promo', url: '/documents/bconscious-press.zip' },
    ],
  };

  for (const [artistName, docs] of Object.entries(artistDocuments)) {
    const artistId = artistMap.get(artistName);
    if (artistId) {
      await supabase
        .from('artists')
        .update({ documents: docs })
        .eq('id', artistId);
      console.log(`  ✓ ${artistName}: ${docs.length} documents`);
    }
  }

  // Step 5: Verify everything
  console.log('\n🔍 Verification...');
  const { data: allPerformances } = await supabase
    .from('performances')
    .select(`
      id,
      start_time,
      end_time,
      stage,
      artists(name),
      events(name, date)
    `)
    .order('start_time');

  // Group by event
  const performancesByEvent: Record<string, any[]> = {};
  for (const p of allPerformances || []) {
    const eventName = (p.events as any)?.name || 'Unknown';
    if (!performancesByEvent[eventName]) performancesByEvent[eventName] = [];
    performancesByEvent[eventName].push(p);
  }

  console.log('\n📊 Running Orders Summary:');
  for (const [eventName, perfs] of Object.entries(performancesByEvent)) {
    const eventDate = (perfs[0]?.events as any)?.date || '';
    console.log(`\n  📅 ${eventName} (${eventDate}) - ${perfs.length} performances`);
    for (const p of perfs) {
      console.log(`    ${(p.artists as any)?.name} | ${p.start_time} - ${p.end_time} | ${p.stage}`);
    }
  }

  console.log('\n✅ Performances and artist details complete!');
}

addPerformancesAndDocs().catch(console.error);
