'use client';

import { CalendarView } from '@/components/calendar-view';

export default function EventsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Events</h1>
        <p className="text-zinc-400 mt-2">
          Manage your nightclub events and nights
        </p>
      </div>
      <CalendarView />
    </div>
  );
}