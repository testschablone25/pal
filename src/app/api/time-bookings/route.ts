// Time Bookings — List & Manual Entry
// GET /api/time-bookings — list with filters (staff see own, managers see all)
// POST /api/time-bookings — manual entry (managers only)

import { NextRequest, NextResponse } from "next/server";
import {
	authenticate,
	requireAuth,
	getAuthenticatedClient,
	getAdminClient,
} from "@/lib/api-auth";
import { timeBookingFilterSchema } from "@/lib/validations/timeBooking";

const tb = "time_bookings" as const;

// GET /api/time-bookings
export async function GET(request: NextRequest) {
	try {
		const auth = await authenticate(request);
		if (!auth.authorized) return auth.response!;
		const supabase = getAuthenticatedClient(request);
		const admin = getAdminClient();

		const searchParams = request.nextUrl.searchParams;

		// Parse filters
		const filterResult = timeBookingFilterSchema.safeParse({
			date_from: searchParams.get("date_from") || undefined,
			date_to: searchParams.get("date_to") || undefined,
			staff_id: searchParams.get("staff_id") || undefined,
			limit: searchParams.get("limit") || "100",
			offset: searchParams.get("offset") || "0",
		});

		if (!filterResult.success) {
			return NextResponse.json(
				{
					error: "Invalid filter parameters",
					details: filterResult.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const filters = filterResult.data;
		const isManager = auth.userRoles?.some((r) =>
			["admin", "manager", "backoffice"].includes(r),
		);

		// ?all=true returns all active clock-in statuses (for kiosk view)
		// Only returns staff_id + clocked_in_at — no personal data
		const allStatus = searchParams.get("all") === "true";
		if (allStatus) {
			const { data, error } = await admin
				.from(tb)
				.select("id, staff_id, clocked_in_at")
				.is("clocked_out_at", null);

			if (error) {
				return NextResponse.json({ error: error.message }, { status: 500 });
			}

			return NextResponse.json({ time_bookings: data || [] });
		}

		// If not a manager, force filter to own staff_id only
		let effectiveStaffId = filters.staff_id;
		if (!isManager) {
			const { data: staffRecord } = await admin
				.from("staff")
				.select("id")
				.eq("profile_id", auth.userId as string)
				.maybeSingle();
			effectiveStaffId = staffRecord
				? (staffRecord as { id: string }).id
				: undefined;
		}

		let query = supabase
			.from(tb)
			.select(
				`
				*,
				staff:staff_id (
					id,
					role,
					profiles:profile_id (
						id,
						full_name
					)
				),
				corrector:corrected_by (
					id,
					full_name
				)
			`,
				{ count: "exact" },
			)
			.order("clocked_in_at", { ascending: false })
			.range(filters.offset, filters.offset + filters.limit - 1);

		if (effectiveStaffId) {
			query = query.eq("staff_id", effectiveStaffId);
		}
		if (filters.date_from) {
			query = query.gte("clocked_in_at", filters.date_from);
		}
		if (filters.date_to) {
			query = query.lte("clocked_in_at", filters.date_to);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			time_bookings: data || [],
			total: count || 0,
			limit: filters.limit,
			offset: filters.offset,
		});
	} catch (error) {
		console.error("Error fetching time bookings:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/time-bookings — Manual entry (managers only)
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "TIME_BOOKINGS_MANAGE");
		if (!auth.authorized) return auth.response!;
		const admin = getAdminClient();

		const body = await request.json();
		const { staff_id, clocked_in_at, clocked_out_at, notes } = body;

		if (!staff_id || !clocked_in_at) {
			return NextResponse.json(
				{ error: "staff_id and clocked_in_at are required" },
				{ status: 400 },
			);
		}

		const { data, error } = await admin
			.from(tb)
			.insert({
				staff_id,
				clocked_in_at,
				clocked_out_at: clocked_out_at || null,
				notes: notes || null,
				corrected_by: auth.userId,
			} as never)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating manual time booking:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
