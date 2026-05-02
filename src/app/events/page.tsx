"use client";

import { CalendarView } from "@/components/calendar-view";

export default function EventsPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
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
