import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data: item, error } = await supabase
			.from("items")
			.select("*, sub_location:sub_location_id(*, venue:venue_id(*))")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Item not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const { data: rental } = await supabase
			.from("rentals")
			.select("*")
			.eq("item_id", id)
			.in("status", ["active", "overdue"])
			.maybeSingle();

		return NextResponse.json({
			...item,
			active_rental: rental || null,
		});
	} catch (error) {
		console.error("Error fetching item:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		const updatePayload: Record<string, unknown> = {};
		const fields = [
			"name",
			"category",
			"serial_number",
			"brand",
			"model",
			"condition_enum",
			"condition_notes",
			"current_location",
			"sub_location_id",
			"notes",
			"photo_url",
		];

		for (const field of fields) {
			if (body[field] !== undefined) {
				updatePayload[field] = body[field];
			}
		}

		const { data, error } = await supabase
			.from("items")
			.update(updatePayload)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Item not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating item:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { error } = await supabase.from("items").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting item:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
