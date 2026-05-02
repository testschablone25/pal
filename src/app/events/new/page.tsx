"use client";

import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Create New Event</h1>
				<p className="text-zinc-400 mt-2">Schedule a new night at your club</p>
			</div>
			<EventForm mode="create" />
		</div>
	);
}
