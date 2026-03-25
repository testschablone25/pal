'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
  door_time: string | null;
  end_time: string | null;
}

interface StaffMember {
  id: string;
  role: string;
  contract_type: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface Shift {
  id: string;
  event_id: string;
  staff_id: string;
  role: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  staff?: StaffMember;
}

interface Availability {
  id: string;
  staff_id: string;
  date: string;
  available: boolean;
  reason: string | null;
}

const shiftSchema = z.object({
  staff_id: z.string().min(1, 'Staff member is required'),
  role: z.string().min(1, 'Role is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  break_minutes: z.number().min(0),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

const STAFF_ROLES = [
  'Bar Staff',
  'Security',
  'Door Staff',
  'Cloakroom',
  'Cleaner',
  'Manager',
  'Sound Engineer',
  'Lighting',
  'VIP Host',
  'Runner',
];

const ROLE_COLORS: Record<string, string> = {
  'Bar Staff': 'bg-purple-600',
  'Security': 'bg-red-600',
  'Door Staff': 'bg-orange-600',
  'Cloakroom': 'bg-cyan-600',
  'Cleaner': 'bg-gray-600',
  'Manager': 'bg-yellow-600',
  'Sound Engineer': 'bg-pink-600',
  'Lighting': 'bg-indigo-600',
  'VIP Host': 'bg-rose-600',
  'Runner': 'bg-teal-600',
};

export default function ShiftsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      staff_id: '',
      role: '',
      start_time: '',
      end_time: '',
      break_minutes: 0,
      status: 'scheduled',
    },
  });

  useEffect(() => {
    fetchEvents();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchShifts();
      fetchAvailability();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events?status=published');
      const data = await response.json();
      setEvents(data.events || []);
      if (data.events?.length > 0 && !selectedEventId) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await fetch(`/api/shifts?event_id=${selectedEventId}`);
      const data = await response.json();
      setShifts(data.shifts || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) return;

      const response = await fetch(`/api/availability?date_from=${selectedEvent.date}&date_to=${selectedEvent.date}`);
      const data = await response.json();
      setAvailability(data.availability || []);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };

  const onSubmit = async (values: ShiftFormValues) => {
    if (!selectedEventId) return;

    setSaving(true);
    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) throw new Error('Event not found');

      const startDateTime = `${selectedEvent.date}T${values.start_time}:00`;
      const endDateTime = `${selectedEvent.date}T${values.end_time}:00`;

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEventId,
          staff_id: values.staff_id,
          role: values.role,
          start_time: startDateTime,
          end_time: endDateTime,
          break_minutes: values.break_minutes,
          status: values.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create shift');
      }

      setShiftDialogOpen(false);
      form.reset();
      fetchShifts();
    } catch (error) {
      console.error('Error creating shift:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (shift: Shift) => {
    setShiftToDelete(shift);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!shiftToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/shifts/${shiftToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete shift');
      }

      setDeleteDialogOpen(false);
      setShiftToDelete(null);
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
    } finally {
      setDeleting(false);
    }
  };

  const isStaffUnavailable = (staffId: string) => {
    return availability.some(a => a.staff_id === staffId && !a.available);
  };

  const getAvailabilityReason = (staffId: string) => {
    const avail = availability.find(a => a.staff_id === staffId && !a.available);
    return avail?.reason;
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getTimePosition = (dateTime: string) => {
    const date = new Date(dateTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Timeline spans 18:00 to 06:00 (12 hours)
    let hourOffset = hours - 18;
    if (hourOffset < 0) hourOffset += 24;
    const totalMinutes = hourOffset * 60 + minutes;
    return (totalMinutes / (12 * 60)) * 100;
  };

  const getTimeWidth = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return (diffMinutes / (12 * 60)) * 100;
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Generate timeline hours (18:00 to 06:00)
  const timelineHours = [];
  for (let i = 18; i < 24; i++) {
    timelineHours.push(`${i}:00`);
  }
  for (let i = 0; i < 6; i++) {
    timelineHours.push(`${i.toString().padStart(2, '0')}:00`);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Shift Scheduling</h1>
        <p className="text-zinc-400 mt-2">
          Plan and assign staff shifts for events
        </p>
      </div>

      {/* Event Selector */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm text-zinc-400 mb-2 block">Select Event</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full md:w-[300px]">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setShiftDialogOpen(true)}
              disabled={!selectedEventId}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-zinc-800" />
            ))}
          </CardContent>
        </Card>
      ) : !selectedEventId ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Select an event to view and manage shifts</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Event Info */}
          {selectedEvent && (
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-zinc-400">Event</p>
                    <p className="text-white font-medium">{selectedEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Date</p>
                    <p className="text-white font-medium">
                      {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {selectedEvent.door_time && (
                    <div>
                      <p className="text-sm text-zinc-400">Door Time</p>
                      <p className="text-white font-medium">{selectedEvent.door_time}</p>
                    </div>
                  )}
                  {selectedEvent.end_time && (
                    <div>
                      <p className="text-sm text-zinc-400">End Time</p>
                      <p className="text-white font-medium">{selectedEvent.end_time}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-zinc-400">Total Shifts</p>
                    <p className="text-white font-medium">{shifts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline View */}
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline View
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Timeline Header */}
              <div className="relative mb-4">
                <div className="flex border-b border-zinc-800 pb-2">
                  <div className="w-48 flex-shrink-0"></div>
                  <div className="flex-1 relative h-8">
                    {timelineHours.map((hour, i) => (
                      <div
                        key={hour}
                        className="absolute text-xs text-zinc-500"
                        style={{ left: `${(i / 12) * 100}%` }}
                      >
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shift Bars */}
              {shifts.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  No shifts scheduled for this event
                </div>
              ) : (
                <div className="space-y-2">
                  {shifts.map((shift) => {
                    const left = getTimePosition(shift.start_time);
                    const width = getTimeWidth(shift.start_time, shift.end_time);
                    const colorClass = ROLE_COLORS[shift.role] || 'bg-zinc-600';

                    return (
                      <div key={shift.id} className="flex items-center group">
                        <div className="w-48 flex-shrink-0 pr-4">
                          <p className="text-sm text-white truncate">
                            {shift.staff?.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-zinc-400">{shift.role}</p>
                        </div>
                        <div className="flex-1 relative h-12 bg-zinc-950 rounded">
                          <div
                            className={`absolute h-full ${colorClass} rounded opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              minWidth: '60px',
                            }}
                          >
                            <span className="text-xs text-white truncate">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-600/10"
                            onClick={() => handleDeleteClick(shift)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">Role Colors</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_COLORS).map(([role, colorClass]) => (
                    <div key={role} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${colorClass}`}></div>
                      <span className="text-xs text-zinc-400">{role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shifts List */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">All Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  No shifts scheduled. Click "Add Shift" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => {
                    const isUnavailable = isStaffUnavailable(shift.staff_id);
                    const unavailReason = getAvailabilityReason(shift.staff_id);

                    return (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-4 bg-zinc-950 rounded-lg border border-zinc-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded ${ROLE_COLORS[shift.role] || 'bg-zinc-600'}`}></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">
                                {shift.staff?.profiles?.full_name || 'Unknown Staff'}
                              </p>
                              {isUnavailable && (
                                <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/50">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Unavailable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-zinc-400">
                              {shift.role} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              {shift.break_minutes > 0 && ` • ${shift.break_minutes}min break`}
                            </p>
                            {isUnavailable && unavailReason && (
                              <p className="text-xs text-amber-400 mt-1">Reason: {unavailReason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              shift.status === 'confirmed'
                                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50'
                                : shift.status === 'completed'
                                ? 'bg-blue-600/20 text-blue-400 border-blue-600/50'
                                : shift.status === 'cancelled'
                                ? 'bg-red-600/20 text-red-400 border-red-600/50'
                                : 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50'
                            }
                          >
                            {shift.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                            onClick={() => handleDeleteClick(shift)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Shift</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Schedule a staff member for {selectedEvent?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {staff.map((member) => {
                          const unavailable = isStaffUnavailable(member.id);
                          return (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                {member.profiles?.full_name || 'Unknown'}
                                {unavailable && (
                                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          className="bg-zinc-950 border-zinc-800"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          className="bg-zinc-950 border-zinc-800"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="break_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        className="bg-zinc-950 border-zinc-800"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShiftDialogOpen(false)}
                  className="border-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Shift
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Shift</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this shift? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
