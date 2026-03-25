/**
 * Seed PAL database with test data
 * 
 * Run with: npx tsx scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test venue ID (we'll create or use existing)
let venueId: string;

// Test data
const artists = [
  { name: 'Charlotte de Witte', city: 'Ghent', fee: 15000, genre: 'Techno', bio: 'Belgian techno queen, known for dark, driving beats.' },
  { name: 'Amelie Lens', city: 'Brussels', fee: 12000, genre: 'Techno', bio: 'Rising star in the techno scene with high-energy sets.' },
  { name: 'Nina Kraviz', city: 'Moscow', fee: 18000, genre: 'Techno', bio: 'Russian techno DJ and producer, трип label founder.' },
  { name: 'Ben Klock', city: 'Berlin', fee: 14000, genre: 'Techno', bio: 'Berghain resident, master of hypnotic techno.' },
  { name: 'Dax J', city: 'London', fee: 5000, genre: 'Techno', bio: 'UK techno artist known for industrial sounds.' },
  { name: 'I Hate Models', city: 'Paris', fee: 8000, genre: 'Techno', bio: 'French producer blending techno with industrial and trance.' },
  { name: '999999999', city: 'Italy', fee: 7000, genre: 'Techno', bio: 'Italian techno duo known for powerful, rhythmic sets.' },
  { name: 'Alignment', city: 'France', fee: 6000, genre: 'Techno', bio: 'French techno producer with a dark, driving sound.' },
];

const events = [
  { name: 'PAL First Encounters', date: '2026-04-04', door_time: '22:00', end_time: '06:00', status: 'published', max_capacity: 800 },
  { name: 'Techno Friday', date: '2026-04-11', door_time: '23:00', end_time: '07:00', status: 'published', max_capacity: 800 },
  { name: 'Deep Sunday', date: '2026-04-12', door_time: '20:00', end_time: '04:00', status: 'published', max_capacity: 600 },
  { name: 'Industrial Night', date: '2026-04-18', door_time: '23:00', end_time: '07:00', status: 'draft', max_capacity: 800 },
  { name: 'SNAG 1Y Anniversary', date: '2026-04-25', door_time: '22:00', end_time: '08:00', status: 'draft', max_capacity: 1000 },
];

const staffRoles = ['bar', 'security', 'door', 'vip', 'cloakroom', 'sound', 'light'];
const contractTypes = ['permanent', 'freelance', 'minor'];

const staffMembers = [
  { full_name: 'Max Müller', role: 'bar', contract_type: 'permanent', hourly_rate: 18 },
  { full_name: 'Sophie Schmidt', role: 'bar', contract_type: 'permanent', hourly_rate: 18 },
  { full_name: 'Jan Weber', role: 'security', contract_type: 'freelance', hourly_rate: 22 },
  { full_name: 'Lisa Braun', role: 'security', contract_type: 'freelance', hourly_rate: 22 },
  { full_name: 'Tom Fischer', role: 'door', contract_type: 'permanent', hourly_rate: 20 },
  { full_name: 'Anna Hoffmann', role: 'vip', contract_type: 'permanent', hourly_rate: 19 },
  { full_name: 'Felix Klein', role: 'cloakroom', contract_type: 'freelance', hourly_rate: 15 },
  { full_name: 'Mia Wagner', role: 'sound', contract_type: 'permanent', hourly_rate: 25 },
  { full_name: 'Luca Becker', role: 'light', contract_type: 'permanent', hourly_rate: 24 },
  { full_name: 'Emilia Schulz', role: 'bar', contract_type: 'minor', hourly_rate: 15, is_minor: true },
];

async function seedDatabase() {
  console.log('🌱 Seeding PAL database...\n');

  // 1. Create or get venue
  console.log('📍 Setting up venue...');
  const { data: existingVenue } = await supabase
    .from('venues')
    .select('id')
    .eq('name', 'PAL Nightclub')
    .single();

  if (existingVenue) {
    venueId = existingVenue.id;
    console.log(`  → Using existing venue: ${venueId}`);
  } else {
    const { data: newVenue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: 'PAL Nightclub',
        address: 'Reeperbahn 1, 20359 Hamburg',
        capacity: 800,
      })
      .select('id')
      .single();

    if (venueError) {
      console.error('  → Error creating venue:', venueError.message);
      return;
    }
    venueId = newVenue!.id;
    console.log(`  → Created venue: ${venueId}`);
  }

  // 2. Create artists
  console.log('\n🎤 Creating artists...');
  const artistIds: Record<string, string> = {};
  
  for (const artist of artists) {
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('id')
      .eq('name', artist.name)
      .single();

    if (existingArtist) {
      artistIds[artist.name] = existingArtist.id;
      console.log(`  → Artist already exists: ${artist.name}`);
    } else {
      const { data: newArtist, error } = await supabase
        .from('artists')
        .insert(artist)
        .select('id')
        .single();

      if (error) {
        console.error(`  → Error creating ${artist.name}:`, error.message);
      } else {
        artistIds[artist.name] = newArtist!.id;
        console.log(`  → Created: ${artist.name} (${artist.genre})`);
      }
    }
  }

  // 3. Create events
  console.log('\n📅 Creating events...');
  const eventIds: Record<string, string> = {};

  for (const event of events) {
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id')
      .eq('name', event.name)
      .eq('date', event.date)
      .single();

    if (existingEvent) {
      eventIds[event.name] = existingEvent.id;
      console.log(`  → Event already exists: ${event.name}`);
    } else {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          ...event,
          venue_id: venueId,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  → Error creating ${event.name}:`, error.message);
      } else {
        eventIds[event.name] = newEvent!.id;
        console.log(`  → Created: ${event.name} (${event.date})`);
      }
    }
  }

  // 4. Create performances for first event
  console.log('\n🎵 Creating performances...');
  const firstEventId = eventIds['PAL First Encounters'];
  if (firstEventId) {
    const performances = [
      { artist_name: 'Dax J', start_time: '22:00', end_time: '00:00', stage: 'main', order_index: 0 },
      { artist_name: 'I Hate Models', start_time: '00:00', end_time: '02:00', stage: 'main', order_index: 1 },
      { artist_name: '999999999', start_time: '02:00', end_time: '04:00', stage: 'main', order_index: 2 },
      { artist_name: 'Charlotte de Witte', start_time: '04:00', end_time: '06:00', stage: 'main', order_index: 3 },
    ];

    for (const perf of performances) {
      const artistId = artistIds[perf.artist_name];
      if (!artistId) continue;

      const { data: existingPerf } = await supabase
        .from('performances')
        .select('id')
        .eq('event_id', firstEventId)
        .eq('artist_id', artistId)
        .single();

      if (existingPerf) {
        console.log(`  → Performance already exists: ${perf.artist_name}`);
      } else {
        const { error } = await supabase
          .from('performances')
          .insert({
            event_id: firstEventId,
            artist_id: artistId,
            start_time: perf.start_time,
            end_time: perf.end_time,
            stage: perf.stage,
            order_index: perf.order_index,
          });

        if (error) {
          console.error(`  → Error creating performance:`, error.message);
        } else {
          console.log(`  → Created: ${perf.artist_name} (${perf.start_time} - ${perf.end_time})`);
        }
      }
    }
  }

  // 5. Create staff
  console.log('\n👷 Creating staff...');
  const staffIds: string[] = [];

  // Get test user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email');

  const testUserIds = (profiles || [])
    .filter(p => p.email?.endsWith('@pal.test'))
    .map(p => p.id);

  for (let i = 0; i < staffMembers.length; i++) {
    const staff = staffMembers[i];
    const profileId = testUserIds[i] || null;

    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existingStaff) {
      staffIds.push(existingStaff.id);
      console.log(`  → Staff already exists for profile ${i}`);
    } else {
      const { data: newStaff, error } = await supabase
        .from('staff')
        .insert({
          profile_id: profileId,
          role: staff.role,
          contract_type: staff.contract_type,
          hourly_rate: staff.hourly_rate,
          is_minor: staff.is_minor || false,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  → Error creating staff:`, error.message);
      } else {
        staffIds.push(newStaff!.id);
        console.log(`  → Created: ${staff.full_name} (${staff.role})`);
      }
    }
  }

  // 6. Create shifts for first event
  console.log('\n⏰ Creating shifts...');
  if (firstEventId && staffIds.length > 0) {
    const shiftTemplates = [
      { role: 'bar', start_offset: -2, end_offset: 6, staff_index: 0 },  // 20:00 - 04:00
      { role: 'bar', start_offset: -2, end_offset: 6, staff_index: 1 },
      { role: 'security', start_offset: -1, end_offset: 7, staff_index: 2 },  // 21:00 - 05:00
      { role: 'security', start_offset: -1, end_offset: 7, staff_index: 3 },
      { role: 'door', start_offset: -1, end_offset: 6, staff_index: 4 },  // 21:00 - 04:00
      { role: 'vip', start_offset: -1, end_offset: 5, staff_index: 5 },  // 21:00 - 03:00
      { role: 'cloakroom', start_offset: -1, end_offset: 6, staff_index: 6 },  // 21:00 - 04:00
      { role: 'sound', start_offset: -3, end_offset: 7, staff_index: 7 },  // 19:00 - 05:00
      { role: 'light', start_offset: -3, end_offset: 7, staff_index: 8 },  // 19:00 - 05:00
    ];

    const eventDate = new Date('2026-04-04T22:00:00');

    for (const shift of shiftTemplates) {
      const staffId = staffIds[shift.staff_index];
      if (!staffId) continue;

      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() + shift.start_offset);
      
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + shift.end_offset);

      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('event_id', firstEventId)
        .eq('staff_id', staffId)
        .single();

      if (existingShift) {
        console.log(`  → Shift already exists for staff ${shift.staff_index}`);
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert({
            event_id: firstEventId,
            staff_id: staffId,
            role: shift.role,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
          });

        if (error) {
          console.error(`  → Error creating shift:`, error.message);
        } else {
          console.log(`  → Created ${shift.role} shift for staff ${shift.staff_index}`);
        }
      }
    }
  }

  // 7. Create availability
  console.log('\n📆 Creating availability...');
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  for (const staffId of staffIds.slice(0, 6)) {
    // Create availability for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Random availability (80% available)
      const available = Math.random() > 0.2;

      const { data: existingAvail } = await supabase
        .from('availability')
        .select('id')
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .single();

      if (!existingAvail) {
        await supabase
          .from('availability')
          .insert({
            staff_id: staffId,
            date: dateStr,
            available,
            reason: available ? null : 'Personal commitment',
          });
      }
    }
    console.log(`  → Created availability for staff member`);
  }

  // 8. Create guest lists
  console.log('\n👥 Creating guest lists...');
  if (firstEventId) {
    const { data: existingGL } = await supabase
      .from('guest_lists')
      .select('id')
      .eq('event_id', firstEventId)
      .eq('name', 'Promoter Guest List')
      .single();

    let guestListId: string | null = null;

    if (existingGL) {
      guestListId = existingGL.id;
      console.log(`  → Guest list already exists`);
    } else {
      const { data: newGL, error } = await supabase
        .from('guest_lists')
        .insert({
          event_id: firstEventId,
          name: 'Promoter Guest List',
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  → Error creating guest list:`, error.message);
      } else {
        guestListId = newGL!.id;
        console.log(`  → Created guest list`);
      }
    }

    // Add some guests
    if (guestListId) {
      const guests = [
        { guest_name: 'Alex Promoter', category: 'guestlist', plus_ones: 2 },
        { guest_name: 'VIP Guest 1', category: 'guestlist', plus_ones: 0 },
        { guest_name: 'VIP Guest 2', category: 'guestlist', plus_ones: 1 },
        { guest_name: 'Artist Friend', category: 'guestlist', plus_ones: 3 },
      ];

      for (const guest of guests) {
        const { data: existingGuest } = await supabase
          .from('guest_entries')
          .select('id')
          .eq('guest_list_id', guestListId)
          .eq('guest_name', guest.guest_name)
          .single();

        if (!existingGuest) {
          await supabase
            .from('guest_entries')
            .insert({
              guest_list_id: guestListId,
              ...guest,
            });
        }
      }
      console.log(`  → Added ${guests.length} guests to list`);
    }
  }

  console.log('\n✅ Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`  - ${Object.keys(artistIds).length} artists`);
  console.log(`  - ${Object.keys(eventIds).length} events`);
  console.log(`  - ${staffIds.length} staff members`);
  console.log(`  - Shifts and availability created`);
}

seedDatabase().catch(console.error);
