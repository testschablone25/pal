// Time Booking — Clock In
// POST /api/time-bookings/clock-in
// Accepts { staff_id } in request body. Any authenticated user can clock in
// any staff member (kiosk model). Auto-closes any existing open booking
// for that staff member first.

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

		// Verify the staff record exists
		const { data: staffRecord } = await admin
			.from("staff")
			.select("id")
			.eq("id", targetStaffId)
			.maybeSingle();

		if (!staffRecord) {
			return NextResponse.json(
				{ error: "Staff member not found." },
				{ status: 404 },
			);
		}

		const now = new Date().toISOString();
		const tb = "time_bookings" as const;

		// If this staff member has an open booking, close it first
		const { data: openBooking } = await supabase
			.from(tb)
			.select("id")
			.eq("staff_id", targetStaffId)
			.is("clocked_out_at", null)
			.maybeSingle();

		if (openBooking) {
			await admin
				.from(tb)
				.update({ clocked_out_at: now } as never)
				.eq("id", (openBooking as { id: string }).id);
		}

		// Create new time booking
		const { data, error } = await admin
			.from(tb)
			.insert({ staff_id: targetStaffId, clocked_in_at: now } as never)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Fetch with relations for response
		const { data: enriched } = await admin
			.from(tb)
			.select(
				`
				*,
				staff:staff_id (
					id,
					role,
					profiles:profile_id (
						full_name
					)
				)
			`,
			)
			.eq("id", (data as { id: string }).id)
			.single();

		return NextResponse.json(enriched ?? data, { status: 201 });
	} catch (error) {
		console.error("Error clocking in:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
