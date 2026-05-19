// Time Slots API
// Phase 2.5 - Running Order Timeslots

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

// GET /api/time-slots - List time slots for an event
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const searchParams = request.nextUrl.searchParams;
		const eventId = searchParams.get("event_id");

		if (!eventId) {
			return NextResponse.json(
				{ error: "event_id query parameter is required" },
				{ status: 400 },
			);
		}

		// Fetch time slots with their assigned performance + artist
		const { data: allSlots, error: slotsError } = await supabase
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
			.eq("event_id", eventId)
			.order("slot_index", { ascending: true });

		if (slotsError) {
			return NextResponse.json({ error: slotsError.message }, { status: 500 });
		}

		return NextResponse.json({ time_slots: allSlots });
	} catch (error) {
		console.error("Error fetching time slots:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/time-slots - Create a single time slot
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();
		const { event_id, label, start_time, end_time, slot_index } = body;

		if (!event_id || !start_time || !end_time) {
			return NextResponse.json(
				{ error: "event_id, start_time, and end_time are required" },
				{ status: 400 },
			);
		}

		// Calculate duration in minutes
		const [startH, startM] = start_time.split(":").map(Number);
		const [endH, endM] = end_time.split(":").map(Number);
		const startMinutes = startH * 60 + startM;
		const endMinutes = endH * 60 + endM;
		const duration = endMinutes - startMinutes;

		if (duration <= 0) {
			return NextResponse.json(
				{ error: "end_time must be after start_time" },
				{ status: 400 },
			);
		}

		// Check for overlap with existing slots
		const { data: existingSlots } = await supabase
			.from("time_slots")
			.select("*, id, start_time, end_time, slot_index")
			.eq("event_id", event_id);

		const hasOverlap = (existingSlots ?? []).some((s) => {
			const existingStart = timeToMinutes(s.start_time);
			const existingEnd = timeToMinutes(s.end_time);
			return startMinutes < existingEnd && endMinutes > existingStart;
		});

		if (hasOverlap) {
			return NextResponse.json(
				{ error: "Time overlap detected with existing slot" },
				{ status: 409 },
			);
		}

		// Determine slot_index if not provided
		let resolvedIndex = slot_index;
		if (resolvedIndex === undefined || resolvedIndex === null) {
			const maxIndex = Math.max(
				-1,
				...(existingSlots ?? []).map((s) => s.slot_index ?? 0),
			);
			resolvedIndex = maxIndex + 1;
		}

		const { data, error } = await supabase
			.from("time_slots")
			.insert({
				event_id,
				label: label || null,
				start_time,
				end_time,
				slot_index: resolvedIndex,
				duration_minutes: duration,
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating time slot:", error);
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
