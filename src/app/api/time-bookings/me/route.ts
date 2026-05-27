// Time Booking — My Status
// GET /api/time-bookings/me — returns the current user's active booking status

import { NextRequest, NextResponse } from "next/server";
import { authenticate, getAdminClient } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
	try {
		const auth = await authenticate(request);
		if (!auth.authorized) return auth.response!;

		const admin = getAdminClient();

		// Find staff record
		const { data: staffRecord } = await admin
			.from("staff")
			.select("id")
			.eq("profile_id", auth.userId as string)
			.maybeSingle();

		if (!staffRecord) {
			return NextResponse.json({ hasStaffProfile: false }, { status: 404 });
		}

		const staffId = (staffRecord as { id: string }).id;

		// Find open booking
		const { data: openBooking } = await admin
			.from("time_bookings" as const)
			.select("id, clocked_in_at, clocked_out_at")
			.eq("staff_id", staffId)
			.is("clocked_out_at", null)
			.maybeSingle();

		return NextResponse.json({
			hasStaffProfile: true,
			staffId,
			isClockedIn: !!openBooking,
			activeBooking: openBooking
				? {
						id: (openBooking as { id: string }).id,
						clocked_in_at: (openBooking as { clocked_in_at: string })
							.clocked_in_at,
					}
				: null,
		});
	} catch (error) {
		console.error("Error fetching time booking status:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
