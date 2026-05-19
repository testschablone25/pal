// GET /api/staff/me — Returns the current user's staff record.
// Avoids the fragile client-side matching of profile_id in the page component.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";


export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "STAFF_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { data, error } = await supabase
			.from("staff")
			.select(
				`
        *,
        profiles:profile_id (
          id,
          full_name,
          email,
          phone
        )
      `,
			)
			.eq("profile_id", auth.userId)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "No staff record found for your profile" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching own staff record:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
