// Labels API
// Many-to-many relationship with artists

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";


// GET /api/labels - List all labels
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { data, error } = await supabase
			.from("labels")
			.select("id, name")
			.order("name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{ labels: data || [] },
			{ headers: cacheHeaders(60) },
		);
	} catch (error) {
		console.error("Error fetching labels:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/labels - Create a new label
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();
		const { name } = body;

		if (!name || !name.trim()) {
			return NextResponse.json(
				{ error: "Label name is required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("labels")
			.insert({ name: name.trim() })
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating label:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
