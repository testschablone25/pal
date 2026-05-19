// Profiles API
// Returns all user profiles for assignment dropdowns (tasks, etc.)

import { NextRequest, NextResponse } from "next/server";
import { authenticate, getAuthenticatedClient } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
	try {
		// Any authenticated user can read profile listings
		const auth = await authenticate(request);
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		
		const { data: profiles, error } = await supabase
			.from("profiles")
			.select("id, full_name, email")
			.order("full_name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ profiles: profiles || [] });
	} catch (error) {
		console.error("Error fetching profiles:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
