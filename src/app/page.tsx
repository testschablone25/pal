'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, endOfWeek, isToday, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  User,
  Calendar,
  ClipboardList,
  Users,
  Clock,
  MapPin,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserRole {
  role: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  event_id: string | null;
  assignee_id: string | null;
  events?: { name: string; date: string } | null;
}

interface Event {
  id: string;
  name: string;
  date: string;
  door_time: string | null;
  end_time: string | null;
  status: string;
}

interface Shift {
  id: string;
  event_id: string;
  staff_id: string;
  role: string;
  start_time: string;
  end_time: string;
  events?: { name: string; date: string } | null;
  staff?: {
    id: string;
    role: string;
    profiles?: { full_name: string | null; email: string | null } | null;
  } | null;
}

interface StaffRecord {
  id: string;
  profile_id: string | null;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffRecord, setStaffRecord] = useState<StaffRecord | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [colleagues, setColleagues] = useState<Shift[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // 2. Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData || { id: user.id, email: user.email!, full_name: null });

      // 3. Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setUserRole(roleData?.role || null);

      // 4. Get staff record (if user is staff)
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      setStaffRecord(staffData);

      // 5. Get tasks assigned to user
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          events (name, date)
        `)
        .eq('assignee_id', user.id)
        .in('status', ['todo', 'in_progress', 'review'])
        .order('priority', { ascending: false });

      setTasks(tasksData || []);

      // 6. Get this week's events
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date');

      setEvents(eventsData || []);

      // 7. Get user's shifts (if staff)
      let userShifts: Shift[] = [];
      if (staffData) {
        const { data: shiftsData } = await supabase
          .from('shifts')
          .select(`
            *,
            events (name, date)
          `)
          .eq('staff_id', staffData.id)
          .gte('end_time', now.toISOString())
          .order('start_time')
          .limit(10);

        userShifts = shiftsData || [];
        setShifts(userShifts);

        // 8. Get colleagues for upcoming shifts
        if (userShifts.length > 0) {
          const eventIds = [...new Set(userShifts.map(s => s.event_id))];
          const { data: colleagueShifts } = await supabase
            .from('shifts')
            .select(`
              *,
              events (name, date),
              staff (
                id,
                role,
                profiles (full_name, email)
              )
            `)
            .in('event_id', eventIds)
            .neq('staff_id', staffData.id)
            .order('start_time');

          setColleagues(colleagueShifts || []);
        }
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-zinc-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Circle className="h-4 w-4 text-blue-500 fill-blue-500/20" />;
      default: return <Circle className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'manager': return 'bg-purple-600';
      case 'promoter': return 'bg-blue-600';
      case 'artist': return 'bg-pink-600';
      case 'staff': return 'bg-green-600';
      default: return 'bg-zinc-600';
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group tasks by today vs this week
  const todayTasks = tasks.filter(t => {
    if (!t.events?.date) return false;
    return isToday(parseISO(t.events.date));
  });

  const weekTasks = tasks.filter(t => {
    if (!t.events?.date) return false;
    const taskDate = parseISO(t.events.date);
    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return !isToday(taskDate) && taskDate <= weekEnd;
  });

  // Get today's shifts
  const todayShifts = shifts.filter(s => {
    if (!s.events?.date) return false;
    return isToday(parseISO(s.events.date));
  });

  // Get upcoming shifts (not today)
  const upcomingShifts = shifts.filter(s => {
    if (!s.events?.date) return false;
    return !isToday(parseISO(s.events.date));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-zinc-900" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600/20 rounded-xl">
              <LayoutDashboard className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Moin, {profile?.full_name || profile?.email?.split('@')[0]}!
              </h1>
              <p className="text-zinc-400">
                {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="border-zinc-800">
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-violet-600">
                <AvatarFallback className="bg-violet-600/20 text-violet-400 text-xl">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">
                  {profile?.full_name || 'No Name Set'}
                </h2>
                <p className="text-zinc-400">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {userRole && (
                    <Badge className={getRoleBadgeColor(userRole)}>
                      {userRole}
                    </Badge>
                  )}
                  {staffRecord && (
                    <Badge variant="outline" className="border-zinc-700">
                      {staffRecord.role}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-zinc-400">
                <p>Mitglied seit</p>
                <p className="text-white">{format(new Date(), 'dd.MM.yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tasks Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-violet-400" />
                Meine Aufgaben
              </CardTitle>
              <Link href="/workflow">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  Alle ansehen <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine offenen Aufgaben</p>
                  <p className="text-sm">Du bist auf dem Laufenden!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Today's tasks */}
                  {todayTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-violet-400 mb-2">Heute</h4>
                      <div className="space-y-2">
                        {todayTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                            {getStatusIcon(task.status)}
                            <span className="flex-1 text-sm text-white truncate">{task.title}</span>
                            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Week tasks */}
                  {weekTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Diese Woche</h4>
                      <div className="space-y-2">
                        {weekTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg">
                            {getStatusIcon(task.status)}
                            <span className="flex-1 text-sm text-zinc-300 truncate">{task.title}</span>
                            <span className="text-xs text-zinc-500">
                              {task.events?.date ? format(parseISO(task.events.date), 'dd.MM') : ''}
                            </span>
                          </div>
                        ))}
                        {weekTasks.length > 3 && (
                          <p className="text-xs text-zinc-500 text-center">
                            +{weekTasks.length - 3} weitere
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events This Week */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-400" />
                Parties diese Woche
              </CardTitle>
              <Link href="/events">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  Kalender <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine Events diese Woche</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map(event => {
                    const eventDate = parseISO(event.date);
                    const isEventToday = isToday(eventDate);
                    return (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                          isEventToday ? 'bg-violet-600/20 border border-violet-600/30' : 'bg-zinc-800/50 hover:bg-zinc-800'
                        }`}>
                          <div className={`text-center min-w-[50px] ${isEventToday ? 'text-violet-400' : 'text-zinc-400'}`}>
                            <div className="text-2xl font-bold">{format(eventDate, 'dd')}</div>
                            <div className="text-xs uppercase">{format(eventDate, 'MMM')}</div>
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-medium ${isEventToday ? 'text-white' : 'text-zinc-200'}`}>
                              {event.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Clock className="h-3 w-3" />
                              <span>{event.door_time} - {event.end_time}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isEventToday && (
                              <Badge className="bg-violet-600">Heute</Badge>
                            )}
                            <Badge variant="outline" className={
                              event.status === 'published' ? 'border-green-600 text-green-400' : 'border-yellow-600 text-yellow-400'
                            }>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Shift */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-400" />
                Mein Schichtplan
              </CardTitle>
              <Link href="/staff/shifts">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  Schichten <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!staffRecord ? (
                <div className="text-center py-6 text-zinc-500">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Kein Staff-Profil verknüpft</p>
                </div>
              ) : todayShifts.length === 0 && upcomingShifts.length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine anstehenden Schichten</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Today's shifts */}
                  {todayShifts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-400 mb-2">Heute</h4>
                      <div className="space-y-2">
                        {todayShifts.map(shift => (
                          <div key={shift.id} className="p-3 bg-green-600/10 border border-green-600/20 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white">{shift.events?.name}</span>
                              <Badge className="bg-green-600">{shift.role}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming shifts */}
                  {upcomingShifts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Anstehend</h4>
                      <div className="space-y-2">
                        {upcomingShifts.slice(0, 2).map(shift => (
                          <div key={shift.id} className="p-2 bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-white">{shift.events?.name}</span>
                              <span className="text-xs text-zinc-500">
                                {shift.events?.date ? format(parseISO(shift.events.date), 'dd.MM') : ''}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400">
                              {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colleagues */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                Im Dienst mit mir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {colleagues.length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine Kollegen für anstehende Schichten</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by event */}
                  {[...new Set(colleagues.map(c => c.event_id))].slice(0, 2).map(eventId => {
                    const eventColleagues = colleagues.filter(c => c.event_id === eventId);
                    const eventName = eventColleagues[0]?.events?.name || 'Unknown';
                    const eventDate = eventColleagues[0]?.events?.date;
                    const isEventToday = eventDate ? isToday(parseISO(eventDate)) : false;

                    return (
                      <div key={eventId} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${isEventToday ? 'text-violet-400' : 'text-zinc-300'}`}>
                            {eventName}
                          </span>
                          {isEventToday && <Badge className="bg-violet-600 text-xs">Heute</Badge>}
                          <span className="text-zinc-500 text-xs">
                            {eventDate ? format(parseISO(eventDate), 'dd.MM') : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {eventColleagues.map(colleague => {
                            const name = colleague.staff?.profiles?.full_name || colleague.staff?.profiles?.email?.split('@')[0] || 'Unknown';
                            return (
                              <div key={colleague.id} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-zinc-700">
                                    {getInitials(name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-zinc-300">{name}</span>
                                <Badge variant="outline" className="text-xs border-zinc-700">
                                  {colleague.staff?.role}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {colleagues.length > 6 && (
                    <p className="text-xs text-zinc-500 text-center pt-2">
                      +{colleagues.length - 6} weitere Kollegen
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Link href="/door">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Tür
                </Button>
              </Link>
              <Link href="/events/new">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Neues Event
                </Button>
              </Link>
              <Link href="/workflow">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Aufgaben
                </Button>
              </Link>
              <Link href="/staff/availability">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Verfügbarkeit
                </Button>
              </Link>
              <Link href="/artists/new">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Neuer Künstler
                </Button>
              </Link>
              <Link href="/guest-lists">
                <Button variant="outline" className="w-full border-zinc-800 justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Guest Lists
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
