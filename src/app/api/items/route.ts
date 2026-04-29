import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const category = searchParams.get("category");
		const search = searchParams.get("search");
		const venueId = searchParams.get("venue_id");
		const limit = searchParams.get("limit") || "100";
		const offset = searchParams.get("offset") || "0";

		let query = supabase
			.from("items")
			.select("*, sub_location:sub_location_id(*, venue:venue_id(*))", {
				count: "exact",
			})
			.order("name")
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		if (category) {
			query = query.eq("category", category);
		}

		if (venueId) {
			// Filter items that have a sub-location at this venue
			const { data: subLocIds } = await supabase
				.from("venue_sub_locations")
				.select("id")
				.eq("venue_id", venueId);
			const ids = subLocIds?.map((s) => s.id) || [];
			if (ids.length > 0) {
				query = query.in("sub_location_id", ids);
			} else {
				// No sub-locations for this venue, return empty
				return NextResponse.json({ items: [], total: 0 });
			}
		}

		if (search) {
			const sanitized = search.replace(/%/g, "\\%");
			query = query.or(
				`name.ilike.%${sanitized}%,serial_number.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`,
			);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			items: data || [],
			total: count || 0,
		});
	} catch (error) {
		console.error("Error fetching items:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const {
			name,
			category,
			serial_number,
			brand,
			model,
			condition_enum,
			condition_notes,
			current_location,
			sub_location_id,
			notes,
			photo_url,
		} = body;

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		if (!category) {
			return NextResponse.json(
				{ error: "Category is required" },
				{ status: 400 },
			);
		}

		const insertPayload: Record<string, unknown> = {
			name,
			category,
		};

		// Only set optional fields if provided
		if (serial_number) insertPayload.serial_number = serial_number;
		if (brand) insertPayload.brand = brand;
		if (model) insertPayload.model = model;
		if (condition_enum) insertPayload.condition_enum = condition_enum;
		if (condition_notes) insertPayload.condition_notes = condition_notes;
		if (current_location) insertPayload.current_location = current_location;
		if (sub_location_id) insertPayload.sub_location_id = sub_location_id;
		if (notes) insertPayload.notes = notes;
		if (photo_url) insertPayload.photo_url = photo_url;

		const { data, error } = await supabase
			.from("items")
			.insert(insertPayload)
			.select("*, sub_location:sub_location_id(*, venue:venue_id(*))")
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating item:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
