// Performances CRUD API - Single Performance
// Phase 2.3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

// GET /api/performances/[id] - Get single performance
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "EVENTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { data, error } = await supabase
			.from("performances")
			.select(`
        *,
        artists:artist_id (
          id,
          name,
          city,
          genre,
          contact_email
        )
      `)
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Performance not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching performance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/performances/[id] - Update performance
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;
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

		// Resolve times from time_slot_id if provided
		let resolvedStartTime = start_time;
		let resolvedEndTime = end_time;
		const resolvedTimeSlotId =
			time_slot_id !== undefined ? time_slot_id : undefined;

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

		// If updating direct times, check for overlap
		if (resolvedStartTime && resolvedEndTime && !time_slot_id) {
			const { data: current } = await supabase
				.from("performances")
				.select("event_id")
				.eq("id", id)
				.single();

			if (current?.event_id) {
				const { data: existing } = await supabase
					.from("performances")
					.select("*")
					.eq("event_id", current.event_id)
					.neq("id", id);

				if (existing && existing.length > 0) {
					const newStart = resolvedStartTime || "00:00:00";
					const newEnd = resolvedEndTime || "23:59:59";

					const hasOverlap = existing.some(
						(p: { start_time: string; end_time: string }) => {
							return newStart < p.end_time && newEnd > p.start_time;
						},
					);

					if (hasOverlap) {
						return NextResponse.json(
							{ error: "Time overlap detected with existing performance" },
							{ status: 409 },
						);
					}
				}
			}
		}

		const updateData: Record<string, unknown> = {};
		if (event_id !== undefined) updateData.event_id = event_id;
		if (artist_id !== undefined) updateData.artist_id = artist_id;
		if (resolvedStartTime !== undefined)
			updateData.start_time = resolvedStartTime;
		if (resolvedEndTime !== undefined) updateData.end_time = resolvedEndTime;
		if (stage !== undefined) updateData.stage = stage;
		if (order_index !== undefined) updateData.order_index = order_index;
		if (resolvedTimeSlotId !== undefined)
			updateData.time_slot_id = resolvedTimeSlotId;

		const { data, error } = await supabase
			.from("performances")
			.update(updateData)
			.eq("id", id)
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

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating performance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/performances/[id] - Delete performance
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { error } = await supabase.from("performances").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting performance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
