import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', tasks: [], shifts: [], colleagues: [], events: [] }, { status: 401 });
  }

  // 1. Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 2. Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // 3. Get staff record
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  // 4. Get tasks (using service role bypass)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, events(name, date)')
    .eq('assignee_id', user.id)
    .in('status', ['todo', 'in_progress', 'review']);

  // 5. Get shifts and colleagues if staff
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
