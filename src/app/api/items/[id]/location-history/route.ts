import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data, error } = await supabase
			.from("item_location_history")
			.select(`
        *,
        moved_by:moved_by (
          id,
          full_name,
          email
        )
      `)
			.eq("item_id", id)
			.order("timestamp", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			history: data || [],
		});
	} catch (error) {
		console.error("Error fetching location history:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		const { location, action, moved_by, sub_location_id } = body;

		if (!location && !sub_location_id) {
			return NextResponse.json(
				{ error: "Location or sub_location_id is required" },
				{ status: 400 },
			);
		}

		if (!action) {
			return NextResponse.json(
				{ error: "Action is required" },
				{ status: 400 },
			);
		}

		const validActions = [
			"check_in",
			"check_out",
			"transfer",
			"rental_out",
			"rental_return",
		];
		if (!validActions.includes(action)) {
			return NextResponse.json(
				{ error: `Action must be one of: ${validActions.join(", ")}` },
				{ status: 400 },
			);
		}

		if (!moved_by) {
			return NextResponse.json(
				{ error: "Moved by is required" },
				{ status: 400 },
			);
		}

		// Compute location display string
		let resolvedLocation = location;
		if (sub_location_id) {
			// Look up the sub-location name for the display
			const { data: subLoc } = await supabase
				.from("venue_sub_locations")
				.select("name, venue:venue_id(name)")
				.eq("id", sub_location_id)
				.single();

			if (subLoc) {
				const venueData = subLoc.venue as unknown as { name: string } | null;
				const venueName = venueData?.name || "";
				resolvedLocation = venueName
					? `${venueName} > ${subLoc.name}`
					: subLoc.name;
			}
		}

		const itemUpdate: Record<string, unknown> = {
			current_location: resolvedLocation || "",
		};
		if (sub_location_id) {
			itemUpdate.sub_location_id = sub_location_id;
		}

		const { error: updateError } = await supabase
			.from("items")
			.update(itemUpdate)
			.eq("id", id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("item_location_history")
			.insert({
				item_id: id,
				location: resolvedLocation || location || "",
				action,
				moved_by,
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error logging location:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
