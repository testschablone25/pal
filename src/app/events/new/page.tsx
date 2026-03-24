'use client';

import { EventForm } from '@/components/event-form';

export default function NewEventPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Event</h1>
        <p className="text-zinc-400 mt-2">
          Schedule a new night at your club
        </p>
      </div>
      <EventForm mode="create" />
    </div>
  );
}