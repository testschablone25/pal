import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

export async function GET(request: Request) {
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
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

  // Get ALL user roles (multi-role support)
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  // Map to array of role strings
  const userRoles = roleData?.map(r => r.role) || [];

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
    .in('status', ['todo', 'in_progress', 'review'])
    .order('priority', { ascending: false });

  // Get shifts and colleagues if staff
  let shifts: unknown[] = [];
  let colleagues: unknown[] = [];
  let events: unknown[] = [];

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
      const event = (shift as Record<string, unknown>).events as Record<string, unknown> | undefined;
      if (event && !eventMap.has(event.id)) {
        eventMap.set(event.id, event);
      }
    }
    events = Array.from(eventMap.values());

    // Get colleagues
    if (shifts.length > 0) {
      const eventIds = [...new Set(shifts.map(s => (s as Record<string, unknown>).event_id as string))];
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
    userRoles, // Now returns array of roles instead of single userRole
    staffRecord,
    tasks: tasks || [],
    shifts,
    colleagues,
    events,
  });
}
