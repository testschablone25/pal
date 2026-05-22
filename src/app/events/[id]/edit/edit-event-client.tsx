"use client";

import { useRouter } from "next/navigation";
import { EventForm } from "@/components/event-form";

interface EditEventClientProps {
	event: {
		id: string;
		name: string;
		date: string;
		venue_id: string | null;
		door_time: string | null;
		end_time: string | null;
		status: string;
		max_capacity: number | null;
	};
}

export function EditEventClient({ event }: EditEventClientProps) {
	const router = useRouter();

	return (
		<EventForm
			event={event}
			mode="edit"
			onSuccess={() => {
				router.push(`/events/${event.id}`);
			}}
		/>
	);
}
