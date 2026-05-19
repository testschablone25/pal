// Performances CRUD API
// Phase 2.3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

// GET /api/performances - List performances with optional filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);
		const searchParams = request.nextUrl.searchParams;
		const eventId = searchParams.get("event_id");
		const artistId = searchParams.get("artist_id");

		let query = supabase
			.from("performances")
			.select(`
        *,
        artists:artist_id (
          id,
          name,
          city,
          genre,
          fee,
          contact_email
        )
      `)
			.order("order_index", { ascending: true })
			.order("start_time", { ascending: true });

		if (eventId) {
			query = query.eq("event_id", eventId);
		}
		if (artistId) {
			query = query.eq("artist_id", artistId);
		}

		const { data, error } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ performances: data });
	} catch (error) {
		console.error("Error fetching performances:", error);
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

function timesOverlap(
	startA: string,
	endA: string,
	startB: string,
	endB: string,
): boolean {
	const aStart = timeToMinutes(startA);
	let aEnd = timeToMinutes(endA);
	const bStart = timeToMinutes(startB);
	let bEnd = timeToMinutes(endB);

	// Handle cross-midnight: if end < start, add 24*60 to end
	if (aEnd < aStart) aEnd += 1440;
	if (bEnd < bStart) bEnd += 1440;

	return aStart < bEnd && aEnd > bStart;
}

// POST /api/performances - Create a new performance
// DELETE /api/performances - Bulk delete performances (by event_id)
export async function DELETE(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
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

		const { error } = await supabase
			.from("performances")
			.delete()
			.eq("event_id", eventId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting performances:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();

		const {
			event_id,
			artist_id,
			start_time,
			end_time,
			stage,
			order_index,
			time_slot_id,
		} = body;

		// Resolve times from time_slot_id if provided (overrides direct start/end times)
		let resolvedStartTime = start_time;
		let resolvedEndTime = end_time;
		const resolvedTimeSlotId = time_slot_id || null;

		if (time_slot_id) {
			const { data: slot } = await supabase
				.from("time_slots")
				.select("start_time, end_time")
				.eq("id", time_slot_id)
				.single();

			if (!slot) {
				return NextResponse.json(
					{ error: "Time slot not found" },
					{ status: 404 },
				);
			}

			resolvedStartTime = slot.start_time;
			resolvedEndTime = slot.end_time;
		}

		// Validate required fields
		if (!event_id || !artist_id || !resolvedStartTime || !resolvedEndTime) {
			return NextResponse.json(
				{
					error:
						"event_id, artist_id, and either start_time/end_time or time_slot_id are required",
				},
				{ status: 400 },
			);
		}

		// Check for time overlap with existing performances for this event
		// (skip if using timeslot since slots are non-overlapping by design)
		if (!time_slot_id) {
			const { data: existingPerformances } = await supabase
				.from("performances")
				.select("*")
				.eq("event_id", event_id);

			type PerfRow = {
				id: string;
				start_time: string;
				end_time: string;
				order_index: number;
			};

			const perfRows = (existingPerformances ?? []) as PerfRow[];

			if (perfRows.length > 0) {
				const hasOverlap = perfRows.some((p) => {
					return timesOverlap(
						resolvedStartTime,
						resolvedEndTime,
						p.start_time,
						p.end_time,
					);
				});

				if (hasOverlap) {
					return NextResponse.json(
						{ error: "Time overlap detected with existing performance" },
						{ status: 409 },
					);
				}
			}
		}

		const { data, error } = await supabase
			.from("performances")
			.insert({
				event_id,
				artist_id,
				start_time: resolvedStartTime,
				end_time: resolvedEndTime,
				stage: stage || "main",
				order_index: order_index ?? 0,
				time_slot_id: resolvedTimeSlotId,
			})
			.select(
				`
				*,
				artists:artist_id (
					id,
					name,
					city,
					genre
				)
			`,
			)
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating performance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
