import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c295dnlqcmhpdWtrbHhqcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4NjM5MCwiZXhwIjoyMDg5OTYyMzkwfQ.ysvNV81rBkFdYEonu9yj6T3R14kwyiqxuKqCMJKPksQ';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ahfFFYMTd3pepNNsVDcTKA_6XDCgSqR';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('sb-access-token')?.value || cookieStore.get('sb-access-token-auth-api')?.value;
  
  // Create client with anon key for user auth check
  const supabaseAnon = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseAnonKey);
  
  // Create client with service key for data queries (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get user from auth token
  let user = null;
  if (authToken) {
    const { data: { user: authUser } } = await supabaseAnon.auth.getUser(authToken);
    user = authUser;
  }
  
  if (!user) {
    // Fallback: try to get user from all cookies
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes('access-token') || cookie.name.includes('auth')) {
        const { data: { user: authUser } } = await supabaseAnon.auth.getUser(cookie.value);
        if (authUser) {
          user = authUser;
          break;
        }
      }
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', tasks: [], shifts: [], colleagues: [], events: [] });
  }

  // Get profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user role
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // Get staff record
  const { data: staffRecord } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  // Get tasks (bypass RLS with service key, filter by user)
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, events(name, date)')
    .eq('assignee_id', user.id)
    .in('status', ['todo', 'in_progress', 'review'])
    .order('priority', { ascending: false });

  // Get shifts and colleagues if staff
  let shifts: any[] = [];
  let colleagues: any[] = [];
  let events: any[] = [];

  if (staffRecord) {
    const { data: shiftsData } = await supabaseAdmin
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
      const { data: colleagueData } = await supabaseAdmin
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
