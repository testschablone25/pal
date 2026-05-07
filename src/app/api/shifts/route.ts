// Shifts CRUD API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/shifts - List all shifts with optional filtering
// GET /api/shifts?check_conflict=true&staff_id=X&event_id=Y&start_time=Z&end_time=W&exclude_shift_id=OPTIONAL - Check for overlapping shifts
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "SHIFTS_READ");
		if (!auth.authorized) return auth.response;

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

		const eventId = searchParams.get("event_id");
		const staffId = searchParams.get("staff_id");
		const status = searchParams.get("status");
		const dateFrom = searchParams.get("date_from");
		const dateTo = searchParams.get("date_to");
		const limit = searchParams.get("limit") || "100";
		const offset = searchParams.get("offset") || "0";

		let query = supabase
			.from("shifts")
			.select(
				`
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
        events:event_id (
          id,
          name,
          date
        )
      `,
				{ count: "exact" },
			)
			.order("start_time", { ascending: true })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		// Apply filters
		if (eventId) {
			query = query.eq("event_id", eventId);
		}
		if (staffId) {
			query = query.eq("staff_id", staffId);
		}
		if (status) {
			query = query.eq("status", status);
		}
		if (dateFrom) {
			query = query.gte("start_time", dateFrom);
		}
		if (dateTo) {
			query = query.lte("end_time", dateTo);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{
				shifts: data,
				total: count || 0,
				limit: parseInt(limit),
				offset: parseInt(offset),
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

		const body = await request.json();

		const {
			event_id,
			staff_id,
			role,
			start_time,
			end_time,
			break_minutes,
			status,
		} = body;

		// Validate required fields
		if (!event_id) {
			return NextResponse.json(
				{ error: "Event ID is required" },
				{ status: 400 },
			);
		}

		if (!staff_id) {
			return NextResponse.json(
				{ error: "Staff ID is required" },
				{ status: 400 },
			);
		}

		if (!role) {
			return NextResponse.json({ error: "Role is required" }, { status: 400 });
		}

		if (!start_time) {
			return NextResponse.json(
				{ error: "Start time is required" },
				{ status: 400 },
			);
		}

		if (!end_time) {
			return NextResponse.json(
				{ error: "End time is required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("shifts")
			.insert({
				event_id,
				staff_id,
				role,
				start_time,
				end_time,
				break_minutes: break_minutes || 0,
				status: status || "scheduled",
			})
			.select()
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
