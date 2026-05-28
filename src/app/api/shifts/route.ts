// Shifts CRUD API — Phase 2 Rework
// Zod validation + conflict detection + sub_location_id support

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";
import { shiftCreateSchema, shiftFilterSchema } from "@/lib/validations/shift";


// GET /api/shifts - List all shifts with optional filtering
// GET /api/shifts?check_conflict=true&staff_id=X&event_id=Y&start_time=Z&end_time=W&exclude_shift_id=OPTIONAL - Check for overlapping shifts
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "SHIFTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const searchParams = request.nextUrl.searchParams;

		// Conflict check mode
		if (searchParams.get("check_conflict") === "true") {
			const staffId = searchParams.get("staff_id");
			const eventId = searchParams.get("event_id");
			const startTime = searchParams.get("start_time");
			const endTime = searchParams.get("end_time");
			const excludeShiftId = searchParams.get("exclude_shift_id");

			if (!staffId || !eventId || !startTime || !endTime) {
				return NextResponse.json(
					{
						error: "staff_id, event_id, start_time, and end_time are required",
					},
					{ status: 400 },
				);
			}

			let query = supabase
				.from("shifts")
				.select("id, staff_id, start_time, end_time, status, role", {
					count: "exact",
				})
				.eq("staff_id", staffId)
				.eq("event_id", eventId)
				.neq("status", "cancelled")
				.lte("start_time", endTime)
				.gte("end_time", startTime);

			if (excludeShiftId) {
				query = query.neq("id", excludeShiftId);
			}

			const { data, error, count } = await query;

			if (error) {
				return NextResponse.json({ error: error.message }, { status: 500 });
			}

			return NextResponse.json({
				hasConflict: (count || 0) > 0,
				conflictingShifts: data || [],
			});
		}

		// Parse and validate filter params
		const filterResult = shiftFilterSchema.safeParse({
			event_id: searchParams.get("event_id") || undefined,
			staff_id: searchParams.get("staff_id") || undefined,
			sub_location_id: searchParams.get("sub_location_id") || undefined,
			status: searchParams.get("status") || undefined,
			date_from: searchParams.get("date_from") || undefined,
			date_to: searchParams.get("date_to") || undefined,
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

		let query = supabase
			.from("shifts")
			.select(
				`
				*,
				staff:staff_id (
					id,
					full_name,
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
			`,
				{ count: "exact" },
			)
			.order("start_time", { ascending: true })
			.range(filters.offset, filters.offset + filters.limit - 1);

		// Apply filters
		if (filters.event_id) {
			query = query.eq("event_id", filters.event_id);
		}
		if (filters.staff_id) {
			query = query.eq("staff_id", filters.staff_id);
		}
		if (filters.sub_location_id) {
			query = query.eq("sub_location_id", filters.sub_location_id);
		}
		if (filters.status) {
			query = query.eq("status", filters.status);
		}
		if (filters.date_from) {
			query = query.gte("start_time", filters.date_from);
		}
		if (filters.date_to) {
			query = query.lte("end_time", filters.date_to);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{
				shifts: data,
				total: count || 0,
				limit: filters.limit,
				offset: filters.offset,
			},
			{ headers: cacheHeaders(30) },
		);
	} catch (error) {
		console.error("Error fetching shifts:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/shifts - Create a new shift
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "SHIFTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();

		// Zod validation
		const parsed = shiftCreateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const { sub_location_id, ...insertData } = parsed.data;

		// Conflict detection: check for overlapping shifts
		const { data: conflictingShifts, error: conflictError } = await supabase
			.from("shifts")
			.select("id, start_time, end_time, role")
			.eq("staff_id", insertData.staff_id)
			.eq("event_id", insertData.event_id)
			.neq("status", "cancelled")
			.lte("start_time", insertData.end_time)
			.gte("end_time", insertData.start_time);

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

		const { data, error } = await supabase
			.from("shifts")
			.insert({
				...insertData,
				sub_location_id: sub_location_id || null,
			})
			.select(
				`
				*,
				staff:staff_id (
					id,
					full_name,
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
			`,
			)
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating shift:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
