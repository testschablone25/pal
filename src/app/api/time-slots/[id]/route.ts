// Time Slot API - Single Slot
// Phase 2.5 - Running Order Timeslots

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

// GET /api/time-slots/[id] - Get single time slot
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
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Time slot not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching time slot:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/time-slots/[id] - Update time slot
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
		const { label, start_time, end_time, slot_index } = body;

		const updateData: Record<string, unknown> = {};

		if (label !== undefined) updateData.label = label;
		if (slot_index !== undefined) updateData.slot_index = slot_index;

		// If times change, recalculate duration and update linked performance times
		if (start_time !== undefined) {
			updateData.start_time = start_time;
		}
		if (end_time !== undefined) {
			updateData.end_time = end_time;
		}

		if (start_time !== undefined || end_time !== undefined) {
			// Get existing slot to fill missing time
			const { data: existing } = await supabase
				.from("time_slots")
				.select("start_time, end_time")
				.eq("id", id)
				.single();

			if (existing) {
				const resolvedStart = start_time ?? existing.start_time;
				const resolvedEnd = end_time ?? existing.end_time;

				const [sH, sM] = resolvedStart.split(":").map(Number);
				const [eH, eM] = resolvedEnd.split(":").map(Number);
				updateData.duration_minutes = eH * 60 + eM - (sH * 60 + sM);

				if ((updateData.duration_minutes as number) <= 0) {
					return NextResponse.json(
						{ error: "end_time must be after start_time" },
						{ status: 400 },
					);
				}

				// Update the linked performance's start/end times to match
				const { data: linkedPerf } = await supabase
					.from("performances")
					.select("id")
					.eq("time_slot_id", id)
					.single();

				if (linkedPerf) {
					await supabase
						.from("performances")
						.update({
							start_time: resolvedStart,
							end_time: resolvedEnd,
						})
						.eq("id", linkedPerf.id);
				}
			}
		}

		const { data, error } = await supabase
			.from("time_slots")
			.update(updateData)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating time slot:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/time-slots/[id] - Delete time slot
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "EVENTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		// Unlink any performance assigned to this slot
		await supabase
			.from("performances")
			.update({ time_slot_id: null })
			.eq("time_slot_id", id);

		const { error } = await supabase.from("time_slots").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting time slot:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
