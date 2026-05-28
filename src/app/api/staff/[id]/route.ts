// Staff CRUD API - Single Staff Member
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

// GET /api/staff/[id] - Get single staff member
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "STAFF_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { data, error } = await supabase
			.from("staff")
			.select(`
        *,
        profiles:profile_id (
          id,
          full_name,
          email,
          phone
        )
      `)
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Staff member not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching staff member:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/staff/[id] - Update staff member
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "STAFF_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;
		const body = await request.json();

		const { profile_id, full_name, role, contract_type } = body;

		// If full_name is provided, update the profile too
		if (full_name) {
			// First get the current profile_id
			const { data: currentStaff } = await supabase
				.from("staff")
				.select("profile_id")
				.eq("id", id)
				.single();

			if (currentStaff?.profile_id) {
				await supabase
					.from("profiles")
					.update({ full_name: full_name.trim() })
					.eq("id", currentStaff.profile_id);
			}
		}

		const updates: Record<string, string | null> = {};
		if (role !== undefined) updates.role = role;
		if (contract_type !== undefined) updates.contract_type = contract_type;
		if (profile_id !== undefined) updates.profile_id = profile_id;

		const { data, error } = await supabase
			.from("staff")
			.update(updates)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating staff member:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/staff/[id] - Delete staff member (cascades shifts + availability)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "STAFF_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		// Cascade-delete related records first
		await supabase.from("availability").delete().eq("staff_id", id);
		await supabase
			.from("availability")
			.update({ set_by: null })
			.eq("set_by", id);
		await supabase.from("shifts").delete().eq("staff_id", id);

		const { error } = await supabase.from("staff").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting staff member:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
