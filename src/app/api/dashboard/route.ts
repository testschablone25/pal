import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';

export async function GET(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get user_id from query params (passed from client)
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id', tasks: [], shifts: [], colleagues: [], events: [] });
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found', tasks: [], shifts: [], colleagues: [], events: [] });
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  // Get staff record
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('*')
    .eq('profile_id', userId)
    .single();

  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, events(name, date)')
    .eq('assignee_id', userId)
    .in('status', ['todo', 'in_progress', 'pending_approval'])
    .order('priority', { ascending: false });

  // Get shifts and colleagues if staff
  let shifts: any[] = [];
  let colleagues: any[] = [];
  let events: any[] = [];

  if (staffRecord) {
    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*, events(id, name, date, door_time, end_time, status)')
      .eq('staff_id', staffRecord.id)
      .gte('end_time', new Date().toISOString())
      .order('start_time');

    shifts = shiftsData || [];

    // Extract unique events
    const eventMap = new Map();
    for (const shift of shifts) {
      const event = shift.events;
      if (event && !eventMap.has(event.id)) {
        eventMap.set(event.id, event);
      }
    }
    events = Array.from(eventMap.values());

    // Get colleagues
    if (shifts.length > 0) {
      const eventIds = [...new Set(shifts.map(s => s.event_id))];
      const { data: colleagueData } = await supabase
        .from('shifts')
        .select('*, events(name, date), staff(id, role, profiles(full_name, email))')
        .in('event_id', eventIds)
        .neq('staff_id', staffRecord.id);

      colleagues = colleagueData || [];
    }
  }

  return NextResponse.json({
    profile,
    userRole: roleData?.role || null,
    staffRecord,
    tasks: tasks || [],
    shifts,
    colleagues,
    events,
  });
}
