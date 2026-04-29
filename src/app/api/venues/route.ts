// Venues API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/venues - List all venues
export async function GET(_request: NextRequest) {
	try {
		const { data: venues, error } = await supabase
			.from("venues")
			.select("*")
			.order("name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fetch sub-locations for all venues
		const venueIds = venues?.map((v) => v.id) || [];
		let subLocationsByVenue: Record<string, unknown[]> = {};

		if (venueIds.length > 0) {
			const { data: subLocations } = await supabase
				.from("venue_sub_locations")
				.select("*")
				.in("venue_id", venueIds)
				.order("name", { ascending: true });

			if (subLocations) {
				for (const sl of subLocations) {
					if (!subLocationsByVenue[sl.venue_id]) {
						subLocationsByVenue[sl.venue_id] = [];
					}
					subLocationsByVenue[sl.venue_id].push(sl);
				}
			}
		}

		const venuesWithSubLocations = (venues || []).map((venue) => ({
			...venue,
			sub_locations: subLocationsByVenue[venue.id] || [],
		}));

		return NextResponse.json({ venues: venuesWithSubLocations });
	} catch (error) {
		console.error("Error fetching venues:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const { name, address, capacity, venue_type } = body;

		if (!name || !capacity) {
			return NextResponse.json(
				{ error: "Name and capacity are required" },
				{ status: 400 },
			);
		}

		const insertPayload: Record<string, unknown> = { name, address, capacity };
		if (venue_type) {
			insertPayload.venue_type = venue_type;
		}

		const { data, error } = await supabase
			.from("venues")
			.insert(insertPayload)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
