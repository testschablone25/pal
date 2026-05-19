// Shifts CRUD API — Single Shift — Phase 2 Rework
// Zod validation + conflict detection + sub_location_id support

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";
import { shiftUpdateSchema } from "@/lib/validations/shift";


// GET /api/shifts/[id] - Get single shift
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "SHIFTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { data, error } = await supabase
			.from("shifts")
			.select(`
				*,
				staff:staff_id (
					id,
					role,
					contract_type,
					profiles:profile_id (
						id,
						full_name,
						email
					)
				),
				venue_sub_locations:sub_location_id (
					id,
					name,
					description
				),
				events:event_id (
					id,
					name,
					date,
					door_time,
					end_time
				)
			`)
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Shift not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching shift:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/shifts/[id] - Update shift
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "SHIFTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;
		const body = await request.json();

		// Zod validation
		const parsed = shiftUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const { sub_location_id, ...updateData } = parsed.data;

		// If start_time or end_time changed, check for conflicts
		if (updateData.start_time || updateData.end_time || updateData.staff_id) {
			// Fetch current shift to get values for fields not being updated
			const { data: current, error: fetchError } = await supabase
				.from("shifts")
				.select("staff_id, start_time, end_time, event_id")
				.eq("id", id)
				.single();

			if (fetchError) {
				if (fetchError.code === "PGRST116") {
					return NextResponse.json(
						{ error: "Shift not found" },
						{ status: 404 },
					);
				}
				console.error("Error fetching shift for conflict check:", fetchError);
			}

			if (current) {
				const conflictStaffId = updateData.staff_id || current.staff_id;
				const conflictStartTime = updateData.start_time || current.start_time;
				const conflictEndTime = updateData.end_time || current.end_time;
				const conflictEventId = current.event_id;

				const { data: conflictingShifts, error: conflictError } = await supabase
					.from("shifts")
					.select("id, start_time, end_time, role")
					.eq("staff_id", conflictStaffId)
					.eq("event_id", conflictEventId)
					.neq("id", id)
					.neq("status", "cancelled")
					.lte("start_time", conflictEndTime)
					.gte("end_time", conflictStartTime);

				if (conflictError) {
					console.error("Conflict check query failed:", conflictError);
				} else if (conflictingShifts && conflictingShifts.length > 0) {
					return NextResponse.json(
						{
							error: "Shift conflict detected",
							conflictingShifts,
						},
						{ status: 409 },
					);
				}
			}
		}

		const payload: Record<string, unknown> = { ...updateData };
		if ("sub_location_id" in parsed.data) {
			payload.sub_location_id = sub_location_id || null;
		}

		const { data, error } = await supabase
			.from("shifts")
			.update(payload)
			.eq("id", id)
			.select(`
				*,
				staff:staff_id (
					id,
					role,
					contract_type,
					profiles:profile_id (
						id,
						full_name,
						email
					)
				),
				venue_sub_locations:sub_location_id (
					id,
					name,
					description
				),
				events:event_id (
					id,
					name,
					date,
					door_time,
					end_time
				)
			`)
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating shift:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/shifts/[id] - Delete shift
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "SHIFTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { error } = await supabase.from("shifts").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting shift:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
