/**
 * Assign shifts to staff@pal.test (Tom Hartmann) and other staff
 * to test the "Im Dienst mit mir" colleagues feature
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function assignShifts() {
  console.log('📅 Assigning shifts to staff@pal.test and colleagues...\n');

  // 1. Get staff records
  const { data: staff } = await supabase
    .from('staff')
    .select(`
      id, role,
      profiles (email, full_name)
    `);

  const staffMap = new Map();
  for (const s of staff || []) {
    const email = (s.profiles as any)?.email;
    if (email) {
      staffMap.set(email, { id: s.id, role: s.role, name: (s.profiles as any)?.full_name });
    }
    // Also store by role for finding colleagues
    staffMap.set(s.role + '_' + (s.profiles as any)?.full_name?.split(' ')[0], { id: s.id, role: s.role, name: (s.profiles as any)?.full_name });
  }

  const tomHartmann = staffMap.get('staff@pal.test');
  console.log(`👤 Tom Hartmann (staff@pal.test): ${tomHartmann ? '✓ Found' : '✗ Not found'} - ID: ${tomHartmann?.id}`);

  // 2. Get events
  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, door_time, end_time')
    .order('date');

  console.log(`\n📅 Events: ${events?.length || 0}`);

  // 3. Delete existing shifts for Tom and related staff to rebuild
  if (tomHartmann) {
    await supabase.from('shifts').delete().eq('staff_id', tomHartmann.id);
    console.log(`\n🗑️ Cleared existing shifts for Tom Hartmann`);
  }

  // 4. Define shift assignments for each event
  // Tom Hartmann (door) + Nina Petersen (security) + Felix Bauer (cloakroom) at same events
  const colleagueRoles = ['security', 'cloakroom', 'vip'];

  for (const event of events || []) {
    console.log(`\n  📅 ${event.name} (${event.date})`);

    const doorTime = event.door_time || '22:00';
    const timePart = doorTime.includes(':') ? doorTime.substring(0, 5) : '22:00';
    const eventDate = new Date(`${event.date}T${timePart}:00`);

    // Tom Hartmann - Door shift
    if (tomHartmann) {
      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() - 1); // 1 hour before door
      
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + 6); // 6 hours after door

      const { error } = await supabase.from('shifts').insert({
        event_id: event.id,
        staff_id: tomHartmann.id,
        role: 'door',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      });

      console.log(`    ✓ Tom Hartmann (door): ${startTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${endTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`);
    }

    // Find and add colleagues at same events
    // Nina Petersen (security)
    const nina = staffMap.get('security_Nina');
    if (nina) {
      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() - 1);
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + 7);

      await supabase.from('shifts').insert({
        event_id: event.id,
        staff_id: nina.id,
        role: 'security',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      });
      console.log(`    ✓ Nina Petersen (security): ${startTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${endTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`);
    }

    // Felix Bauer (cloakroom)
    const felix = staffMap.get('cloakroom_Felix');
    if (felix) {
      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() - 1);
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + 6);

      await supabase.from('shifts').insert({
        event_id: event.id,
        staff_id: felix.id,
        role: 'cloakroom',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      });
      console.log(`    ✓ Felix Bauer (cloakroom): ${startTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${endTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`);
    }

    // Marcus Weber (bar) - also has a profile
    const marcus = staffMap.get('admin@pal.test');
    if (marcus) {
      const startTime = new Date(eventDate);
      startTime.setHours(startTime.getHours() - 2);
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + 6);

      await supabase.from('shifts').insert({
        event_id: event.id,
        staff_id: marcus.id,
        role: 'bar',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      });
      console.log(`    ✓ Marcus Weber (bar): ${startTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${endTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`);
    }
  }

  // 5. Verify
  console.log('\n\n🔍 Verification - Tom Hartmann shifts:');
  const { data: tomShifts } = await supabase
    .from('shifts')
    .select(`
      *,
      events (name, date)
    `)
    .eq('staff_id', tomHartmann?.id)
    .order('start_time');

  for (const shift of tomShifts || []) {
    const event = shift.events as any;
    console.log(`  - ${event?.name} (${event?.date}) | ${shift.role} | ${new Date(shift.start_time).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${new Date(shift.end_time).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`);
  }

  // 6. Verify colleagues
  console.log('\n🔍 Verification - Colleagues (shifts at same events as Tom):');
  const eventIds = tomShifts?.map(s => s.event_id) || [];
  
  const { data: colleagueShifts } = await supabase
    .from('shifts')
    .select(`
      *,
      events (name, date),
      staff (
        id, role,
        profiles (full_name, email)
      )
    `)
    .in('event_id', eventIds)
    .neq('staff_id', tomHartmann?.id)
    .order('start_time');

  // Group by event
  const byEvent: Record<string, any[]> = {};
  for (const shift of colleagueShifts || []) {
    const eventName = (shift.events as any)?.name || 'Unknown';
    if (!byEvent[eventName]) byEvent[eventName] = [];
    byEvent[eventName].push(shift);
  }

  for (const [eventName, shifts] of Object.entries(byEvent)) {
    console.log(`\n  ${eventName}:`);
    for (const shift of shifts) {
      const staff = shift.staff as any;
      const profile = staff?.profiles as any;
      console.log(`    - ${profile?.full_name || 'Unknown'} (${staff?.role})`);
    }
  }

  const uniqueColleagues = new Set(colleagueShifts?.map(s => (s.staff as any)?.profiles?.full_name));
  console.log(`\n✅ Tom Hartmann will see ${uniqueColleagues.size} colleagues in "Im Dienst mit mir"!`);

  // 7. Add tasks assigned to Tom Hartmann
  console.log('\n📋 Adding tasks for Tom Hartmann...');

  if (tomHartmann?.id) {
    // Get Tom's profile_id
    const { data: staffData } = await supabase
      .from('staff')
      .select('profile_id')
      .eq('id', tomHartmann.id)
      .single();

    const profileId = staffData?.profile_id;
    
    // Get first event ID for task association
    const firstEventId = events?.[0]?.id;

    // Delete existing tasks for Tom
    await supabase.from('tasks').delete().eq('assignee_id', profileId);

    const tasks = [
      { title: 'Eisdusche für Bar vorbereiten', priority: 'high', status: 'todo', event_id: firstEventId },
      { title: 'Gläser sortieren und auslegen', priority: 'medium', status: 'todo', event_id: firstEventId },
      { title: 'Kassenbestand prüfen', priority: 'high', status: 'in_progress', event_id: firstEventId },
      { title: 'Müll rausbringen nach Event', priority: 'low', status: 'todo', event_id: null },
      { title: 'Bartheken-Checkliste durchgehen', priority: 'medium', status: 'review', event_id: firstEventId },
      { title: 'Neue Kollegen einarbeiten', priority: 'medium', status: 'todo', event_id: null },
    ];

    for (const task of tasks) {
      await supabase.from('tasks').insert({
        ...task,
        assignee_id: profileId,
      });
      console.log(`  ✓ ${task.title} [${task.priority}] (${task.status})`);
    }

    console.log(`\n✅ ${tasks.length} tasks assigned to Tom Hartmann!`);
  }

  console.log('\n🎉 All done! Refresh the dashboard to see changes.');
}

assignShifts().catch(console.error);
