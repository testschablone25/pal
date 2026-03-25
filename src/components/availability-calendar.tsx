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
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Calendar, Check, X, Loader2 } from 'lucide-react';

interface StaffMember {
  id: string;
  role: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface Availability {
  id: string;
  staff_id: string;
  date: string;
  available: boolean;
  reason: string | null;
}

interface AvailabilityCalendarProps {
  staffId?: string;
}

export function AvailabilityCalendar({ staffId }: AvailabilityCalendarProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffId || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchAvailability();
    }
  }, [selectedStaffId, currentDate]);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      setStaff(data.staff || []);
      if (data.staff?.length > 0 && !selectedStaffId) {
        setSelectedStaffId(data.staff[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const response = await fetch(
        `/api/availability?staff_id=${selectedStaffId}&date_from=${startDate}&date_to=${endDate}`
      );
      const data = await response.json();
      setAvailability(data.availability || []);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    const existing = availability.find(
      a => a.staff_id === selectedStaffId && a.date === date
    );
    setReason(existing?.reason || '');
    setDialogOpen(true);
  };

  const handleSaveAvailability = async (available: boolean) => {
    if (!selectedStaffId || !selectedDate) return;

    setSaving(true);
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          date: selectedDate,
          available,
          reason: available ? null : reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save availability');
      }

      setDialogOpen(false);
      setReason('');
      fetchAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async () => {
    if (!selectedStaffId || !selectedDate) return;

    const existing = availability.find(
      a => a.staff_id === selectedStaffId && a.date === selectedDate
    );

    if (!existing) {
      setDialogOpen(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/availability/${existing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete availability');
      }

      setDialogOpen(false);
      setReason('');
      fetchAvailability();
    } catch (error) {
      console.error('Error deleting availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const getAvailabilityForDate = (date: string) => {
    return availability.find(
      a => a.staff_id === selectedStaffId && a.date === date
    );
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedStaffMember = staff.find(s => s.id === selectedStaffId);

  return (
    <div className="space-y-6">
      {/* Staff Selector */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm text-zinc-400 mb-2 block">Select Staff Member</label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full md:w-[300px]">
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.profiles?.full_name || 'Unknown'} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStaffMember && (
              <Badge className="bg-violet-600/20 text-violet-400 border-violet-600/50">
                {selectedStaffMember.role}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Availability Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white font-medium min-w-[150px] text-center">
                {monthName}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <Skeleton key={i} className="h-20 bg-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm text-zinc-400 font-medium py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before the first day of the month */}
                {[...Array(startingDay)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-20"></div>
                ))}

                {/* Days of the month */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const avail = getAvailabilityForDate(dateStr);
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(dateStr)}
                      className={`h-20 p-2 rounded-lg border transition-all text-left hover:border-violet-600/50 ${
                        isToday ? 'border-violet-600' : 'border-zinc-800'
                      } ${
                        avail?.available === true
                          ? 'bg-emerald-600/20 border-emerald-600/50'
                          : avail?.available === false
                          ? 'bg-red-600/20 border-red-600/50'
                          : 'bg-zinc-950 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-medium ${
                          isToday ? 'text-violet-400' : 'text-zinc-300'
                        }`}>
                          {day}
                        </span>
                        {avail && (
                          <div className={`p-1 rounded ${
                            avail.available
                              ? 'bg-emerald-600/30'
                              : 'bg-red-600/30'
                          }`}>
                            {avail.available ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <X className="h-3 w-3 text-red-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {avail && !avail.available && avail.reason && (
                        <p className="text-xs text-zinc-400 mt-1 truncate">
                          {avail.reason}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-600/20 border border-emerald-600/50"></div>
                  <span className="text-sm text-zinc-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-600/20 border border-red-600/50"></div>
                  <span className="text-sm text-zinc-400">Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-zinc-950 border border-zinc-800"></div>
                  <span className="text-sm text-zinc-400">Not Set</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Availability Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Set Availability
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Reason (if unavailable)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Vacation, Personal day, Sick leave..."
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteAvailability}
              disabled={saving}
              className="border-zinc-800"
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSaveAvailability(false)}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Unavailable
              </Button>
              <Button
                onClick={() => handleSaveAvailability(true)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Available
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
