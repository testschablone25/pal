// Venue Single API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/venues/[id] - Get single venue with sub-locations
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data: venue, error } = await supabase
			.from("venues")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Venue not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fetch sub-locations
		const { data: subLocations } = await supabase
			.from("venue_sub_locations")
			.select("*")
			.eq("venue_id", id)
			.order("name", { ascending: true });

		return NextResponse.json({
			...venue,
			sub_locations: subLocations || [],
		});
	} catch (error) {
		console.error("Error fetching venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/venues/[id] - Update venue
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		const { name, address, capacity, venue_type } = body;

		if (!name || !capacity) {
			return NextResponse.json(
				{ error: "Name and capacity are required" },
				{ status: 400 },
			);
		}

		const updatePayload: Record<string, unknown> = { name, address, capacity };
		if (venue_type) {
			updatePayload.venue_type = venue_type;
		}

		const { data, error } = await supabase
			.from("venues")
			.update(updatePayload)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/venues/[id] - Delete venue
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { error } = await supabase.from("venues").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
