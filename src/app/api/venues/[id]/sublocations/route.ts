// Venue Sub-Locations API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/venues/[id]/sublocations - List all sub-locations for a venue
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: venueId } = await params;

		const { data, error } = await supabase
			.from("venue_sub_locations")
			.select("*")
			.eq("venue_id", venueId)
			.order("name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ sub_locations: data || [] });
	} catch (error) {
		console.error("Error fetching sub-locations:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/venues/[id]/sublocations - Create a new sub-location
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: venueId } = await params;
		const body = await request.json();

		const { name, description } = body;

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("venue_sub_locations")
			.insert({ venue_id: venueId, name, description })
			.select()
			.single();

		if (error) {
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

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating sub-location:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
