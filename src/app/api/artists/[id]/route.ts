// Artist CRUD API - Single Artist
// Phase 2.1 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";


// GET /api/artists/[id] - Get single artist
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "ARTISTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		const { data, error } = await supabase
			.from("artists")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Artist not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching artist:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/artists/[id] - Update artist
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;
		const body = await request.json();

		const {
			name,
			city,
			fee,
			genre,
			bio,
			contact_email,
			contact_phone,
			promo_pack_url,
			documents,
			tech_rider,
			hospitality_rider,
		} = body;

		const { data, error } = await supabase
			.from("artists")
			.update({
				name,
				city,
				fee,
				genre,
				bio,
				contact_email,
				contact_phone,
				promo_pack_url,
				documents,
				tech_rider,
				hospitality_rider,
			})
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating artist:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/artists/[id] - Delete artist and associated performances
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id } = await params;

		// First delete all performances referencing this artist
		// to avoid foreign key constraint violations
		const { error: perfError } = await supabase
			.from("performances")
			.delete()
			.eq("artist_id", id);

		if (perfError) {
			console.error("Error deleting artist performances:", perfError);
			// Continue anyway — the artist delete below will surface the constraint
		}

		const { error } = await supabase.from("artists").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting artist:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
