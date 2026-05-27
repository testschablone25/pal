// Time Booking — Edit (Manager Correction)
// PUT /api/time-bookings/[id] — managers can edit clocked_in_at, clocked_out_at, notes

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAdminClient } from "@/lib/api-auth";
import { timeBookingUpdateSchema } from "@/lib/validations/timeBooking";

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TIME_BOOKINGS_MANAGE");
		if (!auth.authorized) return auth.response!;
		const admin = getAdminClient();

		const { id } = await params;
		const body = await request.json();

		const parsed = timeBookingUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const updates = parsed.data;

		const { data, error } = await admin
			.from("time_bookings" as const)
			.update({
				...updates,
				corrected_by: auth.userId,
			} as never)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Time booking not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating time booking:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
