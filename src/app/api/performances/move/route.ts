// Performance Move API
// Phase 2.5 - Move a performance to a different time slot (supports multiple per slot)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

export async function PUT(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();
		const { performance_id, time_slot_id } = body;

		if (!performance_id) {
			return NextResponse.json(
				{ error: "performance_id is required" },
				{ status: 400 },
			);
		}

		if (!time_slot_id) {
			return NextResponse.json(
				{ error: "time_slot_id is required" },
				{ status: 400 },
			);
		}

		// Get the target time slot
		const { data: targetSlot, error: slotError } = await supabase
			.from("time_slots")
			.select("id, start_time, end_time")
			.eq("id", time_slot_id)
			.single();

		if (slotError || !targetSlot) {
			return NextResponse.json(
				{ error: "Time slot not found" },
				{ status: 404 },
			);
		}

		// Move the performance to the new slot (multiple performances per slot allowed)
		const { data, error } = await supabase
			.from("performances")
			.update({
				time_slot_id: targetSlot.id,
				start_time: targetSlot.start_time,
				end_time: targetSlot.end_time,
			})
			.eq("id", performance_id)
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
		console.error("Error moving performance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
