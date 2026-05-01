// Bulk Shift Creation API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

interface BulkShiftInput {
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
	break_minutes?: number;
	status?: string;
}

// POST /api/shifts/bulk - Create multiple shifts in a single request
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "SHIFTS_WRITE");
		if (!auth.authorized) return auth.response;

		const body = await request.json();

		const { event_id, shifts } = body as {
			event_id: string;
			shifts: BulkShiftInput[];
		};

		// Validate required fields
		if (!event_id) {
			return NextResponse.json(
				{ error: "Event ID is required" },
				{ status: 400 },
			);
		}

		if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
			return NextResponse.json(
				{ error: "At least one shift is required" },
				{ status: 400 },
			);
		}

		// Validate each shift
		for (let i = 0; i < shifts.length; i++) {
			const shift = shifts[i];
			const errors: string[] = [];

			if (!shift.staff_id) errors.push("staff_id");
			if (!shift.role) errors.push("role");
			if (!shift.start_time) errors.push("start_time");
			if (!shift.end_time) errors.push("end_time");

			if (errors.length > 0) {
				return NextResponse.json(
					{
						error: `Shift at index ${i} is missing required fields: ${errors.join(", ")}`,
					},
					{ status: 400 },
				);
			}
		}

		// Map shifts to insert format
		const shiftRecords = shifts.map((shift) => ({
			event_id,
			staff_id: shift.staff_id,
			role: shift.role,
			start_time: shift.start_time,
			end_time: shift.end_time,
			break_minutes: shift.break_minutes ?? 0,
			status: shift.status || "scheduled",
		}));

		const { data, error } = await supabase
			.from("shifts")
			.insert(shiftRecords)
			.select();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ shifts: data, count: data?.length || 0 },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating bulk shifts:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
