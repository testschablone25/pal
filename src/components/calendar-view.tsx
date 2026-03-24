'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarComponent,
  CalendarProps,
} from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Calendar, List, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  status: string;
  venues: {
    name: string;
    capacity: number;
  } | null;
}

interface CalendarViewProps {
  onSelectEvent?: (event: Event) => void;
  venueId?: string;
}

type ViewMode = 'month' | 'week' | 'day';

export function CalendarView({ onSelectEvent, venueId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, venueId]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = viewMode === 'month' 
        ? format(startOfMonth(currentDate), 'yyyy-MM-dd')
        : format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const end = viewMode === 'month'
        ? format(endOfMonth(currentDate), 'yyyy-MM-dd')
        : format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const params = new URLSearchParams({
        date_from: start,
        date_to: end,
      });
      if (venueId) params.append('venue_id', venueId);

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-600';
      case 'draft':
        return 'bg-yellow-600';
      case 'cancelled':
        return 'bg-red-600';
      case 'completed':
        return 'bg-zinc-600';
      default:
        return 'bg-violet-600';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="space-y-2">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm text-zinc-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 rounded-lg border ${
                  isCurrentMonth 
                    ? 'bg-zinc-900 border-zinc-800' 
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                } ${isToday(day) ? 'ring-2 ring-violet-600' : ''}`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="block"
                    >
                      <div 
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getStatusColor(event.status)}`}
                        onClick={() => onSelectEvent?.(event)}
                      >
                        {event.name}
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-zinc-400">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Days header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-sm text-zinc-400"></div>
            {days.map((day) => (
              <div 
                key={day.toISOString()}
                className={`text-center py-2 ${isToday(day) ? 'text-violet-400' : ''}`}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8 gap-1">
            {/* Time column */}
            <div className="space-y-0">
              {hours.map((hour) => (
                <div key={hour} className="h-12 text-xs text-zinc-500 text-right pr-2">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => (
              <div key={day.toISOString()} className="space-y-0">
                {hours.map((hour) => {
                  const dayEvents = getEventsForDate(day);
                  // This is simplified - in production, you'd match events to hours
                  return (
                    <div 
                      key={hour}
                      className="h-12 border-t border-zinc-800 hover:bg-zinc-900/50"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM dd, yyyy')}
            </h2>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={navigatePrev}
                className="border-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="border-zinc-800"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateNext}
                className="border-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View mode toggle */}
            <div className="flex gap-1 bg-zinc-950 rounded-lg p-1">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className={viewMode === 'month' ? 'bg-violet-600' : ''}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' ? 'bg-violet-600' : ''}
              >
                Week
              </Button>
            </div>

            <Link href="/events/new">
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex gap-4 mb-4">
          <Badge className="bg-green-600">Published</Badge>
          <Badge className="bg-yellow-600">Draft</Badge>
          <Badge className="bg-red-600">Cancelled</Badge>
          <Badge className="bg-zinc-600">Completed</Badge>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-zinc-400">Loading...</div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
          </>
        )}
      </CardContent>
    </Card>
  );
}