// Shift Clock-In API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// POST /api/shifts/[id]/clock-in - Mark a shift as clocked in
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "SHIFTS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;
		const now = new Date().toISOString();

		const { data, error } = await supabase
			.from("shifts")
			.update({
				status: "confirmed",
				clocked_in_at: now,
			})
			.eq("id", id)
			.select()
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Shift not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error clocking in:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
