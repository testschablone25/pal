// Agencies API
// Many-to-many relationship with artists (booking agencies)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";

// GET /api/agencies - List all agencies
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { data, error } = await supabase
			.from("agencies")
			.select("id, name")
			.order("name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{ agencies: data || [] },
			{ headers: cacheHeaders(60) },
		);
	} catch (error) {
		console.error("Error fetching agencies:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/agencies - Create a new agency
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();
		const { name } = body;

		if (!name || !name.trim()) {
			return NextResponse.json(
				{ error: "Agency name is required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("agencies")
			.insert({ name: name.trim() })
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating agency:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
