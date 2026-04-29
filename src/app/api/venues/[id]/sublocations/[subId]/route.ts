// Venue Sub-Location Single API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// PUT /api/venues/[id]/sublocations/[subId] - Update a sub-location
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; subId: string }> },
) {
	try {
		const { subId } = await params;
		const body = await request.json();

		const { name, description } = body;

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("venue_sub_locations")
			.update({ name, description })
			.eq("id", subId)
			.select()
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Sub-location not found" },
					{ status: 404 },
				);
			}
			if (error.code === "23505") {
				return NextResponse.json(
					{
						error: "A sub-location with this name already exists at this venue",
					},
					{ status: 409 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating sub-location:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/venues/[id]/sublocations/[subId] - Delete a sub-location
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; subId: string }> },
) {
	try {
		const { subId } = await params;

		const { error } = await supabase
			.from("venue_sub_locations")
			.delete()
			.eq("id", subId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting sub-location:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
