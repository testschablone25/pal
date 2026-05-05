"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditEventPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.id as string;
	const [event, setEvent] = useState<Record<string, unknown> | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			const data = await response.json();
			setEvent(data);
		} catch (error) {
			console.error("Failed to fetch event:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto px-4 py-8">
				<PageSkeleton rows={3} />
			</div>
		);
	}

	if (!event) {
		return (
			<div className="max-w-3xl mx-auto px-4 py-8">
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="py-12 text-center">
						<p className="text-zinc-400">Event not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8">
			<EventForm
				event={event as unknown as EventFormEvent}
				mode="edit"
				onSuccess={() => router.push(`/events/${eventId}`)}
			/>
		</div>
	);
}

interface EventFormEvent {
	id: string;
	name: string;
	date: string;
	venue_id: string | null;
	door_time: string | null;
	end_time: string | null;
	status: string;
	max_capacity: number | null;
}
