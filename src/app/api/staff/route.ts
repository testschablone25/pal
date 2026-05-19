// Staff CRUD API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";


// GET /api/staff - List all staff with optional filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "STAFF_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const searchParams = request.nextUrl.searchParams;
		const name = searchParams.get("name");
		const role = searchParams.get("role");
		const contractType = searchParams.get("contract_type");
		const limit = searchParams.get("limit") || "50";
		const offset = searchParams.get("offset") || "0";

		let query = supabase
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
				{ count: "exact" },
			)
			.order("created_at", { ascending: false })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		// Apply filters
		if (name) {
			const { data: matchingProfiles } = await supabase
				.from("profiles")
				.select("id")
				.ilike("full_name", `%${name}%`);
			const profileIds = matchingProfiles?.map((p) => p.id) || [];
			if (profileIds.length > 0) {
				query = query.in("profile_id", profileIds);
			} else {
				return NextResponse.json({
					staff: [],
					total: 0,
					limit: parseInt(limit),
					offset: parseInt(offset),
				});
			}
		}
		if (role) {
			query = query.eq("role", role);
		}
		if (contractType) {
			query = query.eq("contract_type", contractType);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{
				staff: data,
				total: count || 0,
				limit: parseInt(limit),
				offset: parseInt(offset),
			},
			{ headers: cacheHeaders(30) },
		);
	} catch (error) {
		console.error("Error fetching staff:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/staff - Create a new staff member
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "STAFF_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const body = await request.json();

		const { profile_id, role, contract_type, is_minor } = body;

		// Validate required fields
		if (!profile_id) {
			return NextResponse.json(
				{ error: "Profile ID is required" },
				{ status: 400 },
			);
		}

		if (!role) {
			return NextResponse.json({ error: "Role is required" }, { status: 400 });
		}

		if (!contract_type) {
			return NextResponse.json(
				{ error: "Contract type is required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("staff")
			.insert({
				profile_id,
				role,
				contract_type,
				is_minor: is_minor || false,
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating staff:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
