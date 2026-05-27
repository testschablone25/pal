// Time Booking — Clock Out
// POST /api/time-bookings/clock-out
// Accepts { staff_id } in request body. Finds the target staff member's
// latest open booking and closes it. Any authenticated user can do this
// (kiosk model).

import { NextRequest, NextResponse } from "next/server";
import {
	authenticate,
	getAuthenticatedClient,
	getAdminClient,
} from "@/lib/api-auth";

export async function POST(request: NextRequest) {
	try {
		const auth = await authenticate(request);
		if (!auth.authorized) return auth.response!;

		const supabase = getAuthenticatedClient(request);
		const admin = getAdminClient();

		const body = await request.json();
		const { staff_id: targetStaffId } = body;

		if (!targetStaffId) {
			return NextResponse.json(
				{ error: "staff_id is required" },
				{ status: 400 },
			);
		}

		const now = new Date().toISOString();
		const tb = "time_bookings" as const;

		// Find the open booking for this staff member
		const { data: openBooking, error: findError } = await supabase
			.from(tb)
			.select("id")
			.eq("staff_id", targetStaffId)
			.is("clocked_out_at", null)
			.order("clocked_in_at", { ascending: false })
			.maybeSingle();

		if (findError) {
			return NextResponse.json({ error: findError.message }, { status: 500 });
		}

		if (!openBooking) {
			return NextResponse.json(
				{ error: "No active time booking found for this staff member." },
				{ status: 400 },
			);
		}

		// Close it
		const { data, error } = await admin
			.from(tb)
			.update({ clocked_out_at: now } as never)
			.eq("id", (openBooking as { id: string }).id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error clocking out:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
