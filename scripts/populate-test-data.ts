/**
 * Comprehensive test data population script
 * 
 * - Updates test users with real Hamburg names
 * - Links all staff to proper profiles
 * - Creates shifts for ALL events
 * - Ensures proper data relationships
 * 
 * Run with: npx tsx scripts/populate-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Real Hamburg-style names for test users
const testUsers = [
  { email: 'admin@pal.test', full_name: 'Marcus Weber', role: 'admin' },
  { email: 'manager@pal.test', full_name: 'Sophia Schneider', role: 'manager' },
  { email: 'promoter@pal.test', full_name: 'Jan-Ole Fischer', role: 'promoter' },
  { email: 'artist@pal.test', full_name: 'Leopold Faerberboeck', role: 'artist' },
  { email: 'staff@pal.test', full_name: 'Tom Hartmann', role: 'staff' },
  { email: 'guest@pal.test', full_name: 'Lena Krüger', role: 'guest' },
];

// Real staff members with Hamburg names
const staffData = [
  { full_name: 'Marcus Weber', email: 'admin@pal.test', role: 'bar', contract_type: 'permanent', hourly_rate: 18 },
  { full_name: 'Sophia Schneider', email: 'manager@pal.test', role: 'bar', contract_type: 'permanent', hourly_rate: 18 },
  { full_name: 'Jan-Ole Fischer', email: 'promoter@pal.test', role: 'security', contract_type: 'freelance', hourly_rate: 22 },
  { full_name: 'Tom Hartmann', email: 'staff@pal.test', role: 'door', contract_type: 'permanent', hourly_rate: 20 },
  { full_name: 'Nina Petersen', email: null, role: 'security', contract_type: 'freelance', hourly_rate: 22 },
  { full_name: 'Lena Krüger', email: 'guest@pal.test', role: 'vip', contract_type: 'permanent', hourly_rate: 19 },
  { full_name: 'Felix Bauer', email: null, role: 'cloakroom', contract_type: 'freelance', hourly_rate: 15 },
  { full_name: 'Mia Hoffmann', email: null, role: 'sound', contract_type: 'permanent', hourly_rate: 25 },
  { full_name: 'Luca Richter', email: null, role: 'light', contract_type: 'permanent', hourly_rate: 24 },
  { full_name: 'Emilia Schulz', email: null, role: 'bar', contract_type: 'minor', hourly_rate: 15, is_minor: true },
  { full_name: 'Kai Neumann', email: null, role: 'security', contract_type: 'freelance', hourly_rate: 22 },
  { full_name: 'Anna Becker', email: null, role: 'cloakroom', contract_type: 'freelance', hourly_rate: 15 },
];

async function populateTestData() {
  console.log('🎯 Populating comprehensive test data...\n');

  // Step 1: Update user profiles with real names
  console.log('👤 Updating user profiles with real names...');
  for (const user of testUsers) {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      await supabase
        .from('profiles')
        .update({ full_name: user.full_name })
        .eq('id', existingUser.id);
      console.log(`  ✓ Updated: ${user.email} → ${user.full_name}`);
    }
  }

  // Step 2: Get all profiles and events for linking
  console.log('\n📊 Fetching existing data...');
  const { data: profiles } = await supabase.from('profiles').select('id, email');
  const { data: events } = await supabase.from('events').select('id, name, date, door_time, end_time').order('date');
  const { data: existingStaff } = await supabase.from('staff').select('id, profile_id, role');

  const profileMap = new Map(profiles?.map(p => [p.email, p.id]) || []);
  const eventMap = new Map(events?.map(e => [e.name, e]) || []);

  console.log(`  - ${profiles?.length || 0} profiles`);
  console.log(`  - ${events?.length || 0} events`);
  console.log(`  - ${existingStaff?.length || 0} existing staff records`);

  // Step 3: Update/create staff records with proper profile links
  console.log('\n👷 Setting up staff records...');
  
  // First, delete existing staff to rebuild cleanly
  await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('availability').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  → Cleared existing staff and shifts');

  // Create new staff records
  const staffIds: Record<string, string> = {};
  
  for (const staff of staffData) {
    const profileId = staff.email ? profileMap.get(staff.email) : null;
    
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
      console.error(`  ✗ Error creating ${staff.full_name}:`, error.message);
    } else {
      staffIds[staff.full_name] = newStaff!.id;
      console.log(`  ✓ Created: ${staff.full_name} (${staff.role}) ${profileId ? '→ linked to profile' : '→ no profile'}`);
    }
  }

  // Step 4: Create shifts for ALL events
  console.log('\n⏰ Creating shifts for all events...');
  
  for (const event of events || []) {
    console.log(`\n  📅 ${event.name} (${event.date})`);

    // Parse date and time properly
    const dateStr = event.date; // e.g., "2026-04-04"
    const doorTime = event.door_time || '22:00'; // e.g., "22:00" or "22:00:00"
    const timePart = doorTime.includes(':') ? doorTime.substring(0, 5) : '22:00';
    const eventDate = new Date(`${dateStr}T${timePart}:00`);

    // Staff assignments per event type
    const shiftAssignments = [
      // Bar staff (2)
      { staff_name: 'Marcus Weber', role: 'bar', start_offset: -2, end_offset: 6 },  // 20:00 - 04:00
      { staff_name: 'Sophia Schneider', role: 'bar', start_offset: -2, end_offset: 6 },
      { staff_name: 'Emilia Schulz', role: 'bar', start_offset: 0, end_offset: 4 },  // 22:00 - 02:00 (minor hours)
      
      // Security (3)
      { staff_name: 'Jan-Ole Fischer', role: 'security', start_offset: -1, end_offset: 7 },  // 21:00 - 05:00
      { staff_name: 'Nina Petersen', role: 'security', start_offset: -1, end_offset: 7 },
      { staff_name: 'Kai Neumann', role: 'security', start_offset: 0, end_offset: 6 },  // 22:00 - 04:00
      
      // Door (1)
      { staff_name: 'Tom Hartmann', role: 'door', start_offset: -1, end_offset: 6 },  // 21:00 - 04:00
      
      // VIP (1)
      { staff_name: 'Lena Krüger', role: 'vip', start_offset: -1, end_offset: 5 },  // 21:00 - 03:00
      
      // Cloakroom (2 - rotating)
      { staff_name: 'Felix Bauer', role: 'cloakroom', start_offset: -1, end_offset: 6 },
      { staff_name: 'Anna Becker', role: 'cloakroom', start_offset: 1, end_offset: 5 },  // 23:00 - 03:00
      
      // Sound & Light (2)
      { staff_name: 'Mia Hoffmann', role: 'sound', start_offset: -3, end_offset: 7 },  // 19:00 - 05:00
      { staff_name: 'Luca Richter', role: 'light', start_offset: -3, end_offset: 7 },
    ];

    // Create shifts for this event
    for (const shift of shiftAssignments) {
      const staffId = staffIds[shift.staff_name];
      if (!staffId) continue;

      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() + shift.start_offset);
      
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + shift.end_offset);

      // Check for existing shift
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('event_id', event.id)
        .eq('staff_id', staffId)
        .single();

      if (!existingShift) {
        await supabase
          .from('shifts')
          .insert({
            event_id: event.id,
            staff_id: staffId,
            role: shift.role,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
          });
      }
    }
    console.log(`  → Created ${shiftAssignments.length} shifts`);
  }

  // Step 5: Create availability for next 14 days
  console.log('\n📆 Creating availability calendar...');
  const today = new Date();

  for (const staffName of Object.keys(staffIds)) {
    const staffId = staffIds[staffName];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Most days available (85%), weekends more likely available
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const available = isWeekend ? Math.random() > 0.1 : Math.random() > 0.15;

      const { data: existing } = await supabase
        .from('availability')
        .select('id')
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .single();

      if (!existing) {
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
  }
  console.log(`  → Created availability for ${Object.keys(staffIds).length} staff × 14 days`);

  // Step 6: Verify data integrity
  console.log('\n🔍 Verifying data integrity...');
  
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: staffCount } = await supabase.from('staff').select('*', { count: 'exact', head: true });
  const { count: shiftCount } = await supabase.from('shifts').select('*', { count: 'exact', head: true });
  const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
  const { count: availCount } = await supabase.from('availability').select('*', { count: 'exact', head: true });

  // Check staff without profiles
  const { data: staffWithoutProfiles } = await supabase
    .from('staff')
    .select('id')
    .is('profile_id', null);

  // Check shifts per event
  const { data: shiftsPerEvent } = await supabase
    .from('shifts')
    .select('event_id, events(name)');

  console.log(`\n📊 Data Summary:`);
  console.log(`  - ${profileCount} user profiles`);
  console.log(`  - ${staffCount} staff members (${staffWithoutProfiles?.length || 0} without profiles)`);
  console.log(`  - ${eventCount} events`);
  console.log(`  - ${shiftCount} shifts across all events`);
  console.log(`  - ${availCount} availability entries`);

  // List shifts by event
  console.log('\n📋 Shifts by Event:');
  const eventShifts: Record<string, number> = {};
  for (const s of shiftsPerEvent || []) {
    const eventName = (s.events as any)?.name || 'Unknown';
    eventShifts[eventName] = (eventShifts[eventName] || 0) + 1;
  }
  for (const [name, count] of Object.entries(eventShifts)) {
    console.log(`  - ${name}: ${count} shifts`);
  }

  console.log('\n✅ Test data population complete!');
}

populateTestData().catch(console.error);
