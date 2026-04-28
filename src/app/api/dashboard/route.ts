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
    .in('status', ['todo', 'in_progress', 'pending_approval'])
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

  // Get blocked tasks count
  const { count: blockedCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('blocked', true)
    .eq('assignee_id', userId);

  // Get pending approvals count
  const { count: pendingApprovalCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval');

  // Get active rentals count
  const { count: activeRentalsCount } = await supabase
    .from('rentals')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'overdue']);

  // Get tasks due this week
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { count: dueThisWeek } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .gte('due_date', today)
    .lte('due_date', weekEndStr)
    .eq('assignee_id', userId);

  return NextResponse.json({
    profile,
    userRoles, // Now returns array of roles instead of single userRole
    staffRecord,
    tasks: tasks || [],
    shifts,
    colleagues,
    events,
    blockedCount: blockedCount || 0,
    pendingApprovalCount: pendingApprovalCount || 0,
    activeRentalsCount: activeRentalsCount || 0,
    dueThisWeek: dueThisWeek || 0,
  });
}
