// Time Slots Regenerate API
// Phase 2.5 - Regenerates equidistant slots from event door_time → end_time
// and merges existing performances into the nearest slots.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();
		const { event_id, duration_minutes, clear_assignments } = body;

		if (!event_id) {
			return NextResponse.json(
				{ error: "event_id is required" },
				{ status: 400 },
			);
		}

		const resolvedDuration = duration_minutes || 60;

		// Get event times
		const { data: event, error: eventError } = await supabase
			.from("events")
			.select("door_time, end_time")
			.eq("id", event_id)
			.single();

		if (eventError || !event) {
			return NextResponse.json({ error: "Event not found" }, { status: 404 });
		}

		if (!event.door_time || !event.end_time) {
			return NextResponse.json(
				{
					error:
						"Event must have door_time and end_time set to generate time slots",
				},
				{ status: 400 },
			);
		}

		// If clear_assignments is true, unlink all performances from their slots
		// so they become "ready to be artist assigned".
		if (clear_assignments) {
			await supabase
				.from("performances")
				.update({ time_slot_id: null })
				.eq("event_id", event_id);
		}

		// Call the database function to regenerate slots
		const { error: fnError } = await supabase.rpc("generate_event_time_slots", {
			p_event_id: event_id,
			p_duration_minutes: resolvedDuration,
		});

		if (fnError) {
			return NextResponse.json({ error: fnError.message }, { status: 500 });
		}

		// Merge existing performances into nearest slots (only if NOT clearing)
		if (!clear_assignments) {
			const { data: performances } = await supabase
				.from("performances")
				.select("id, start_time")
				.eq("event_id", event_id)
				.order("start_time", { ascending: true });

			if (performances && performances.length > 0) {
				const { data: slots } = await supabase
					.from("time_slots")
					.select("id, start_time, end_time")
					.eq("event_id", event_id)
					.order("slot_index", { ascending: true });

				if (slots && slots.length > 0) {
					const takenSlotIds = new Set<string>();

					for (const perf of performances) {
						let nearestSlot: (typeof slots)[0] | null = null;
						let minDiff = Infinity;
						const perfMinutes = timeToMinutes(perf.start_time);

						for (const slot of slots) {
							if (takenSlotIds.has(slot.id)) continue;
							const slotMinutes = timeToMinutes(slot.start_time);
							const diff = Math.abs(perfMinutes - slotMinutes);
							if (diff < minDiff) {
								minDiff = diff;
								nearestSlot = slot;
							}
						}

						if (nearestSlot) {
							takenSlotIds.add(nearestSlot.id);
							await supabase
								.from("performances")
								.update({
									time_slot_id: nearestSlot.id,
									start_time: nearestSlot.start_time,
									end_time: nearestSlot.end_time,
								})
								.eq("id", perf.id);
						}
					}
				}
			}
		}

		// Return the regenerated slots with their performances
		const { data: finalSlots, error: finalError } = await supabase
			.from("time_slots")
			.select(
				`
				*,
				performances (
					id,
					artist_id,
					stage,
					order_index,
					artists:artist_id (
						id,
						name,
						city,
						genre
					)
				)
			`,
			)
			.eq("event_id", event_id)
			.order("slot_index", { ascending: true });

		if (finalError) {
			return NextResponse.json({ error: finalError.message }, { status: 500 });
		}

		return NextResponse.json({ time_slots: finalSlots });
	} catch (error) {
		console.error("Error regenerating time slots:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

function timeToMinutes(t: string): number {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + m;
}
