// Artist CRUD API
// Phase 2.1 - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";


// GET /api/artists - List all artists with optional filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);
		const searchParams = request.nextUrl.searchParams;
		const name = searchParams.get("name");
		const genre = searchParams.get("genre");
		const city = searchParams.get("city");
		const labelId = searchParams.get("label_id");
		const limit = searchParams.get("limit") || "50";
		const offset = searchParams.get("offset") || "0";

		// When filtering by label, first get matching artist IDs from junction table
		let matchingArtistIds: string[] | null = null;
		if (labelId) {
			const { data: junctionRows } = await supabase
				.from("artist_labels")
				.select("artist_id")
				.eq("label_id", labelId);

			matchingArtistIds = (junctionRows || []).map((r) => r.artist_id);

			// If no artists match this label, return empty early
			if (matchingArtistIds.length === 0) {
				return NextResponse.json({
					artists: [],
					total: 0,
					limit: parseInt(limit),
					offset: parseInt(offset),
				});
			}
		}

		// Build the query with performance count + labels subqueries
		let query = supabase
			.from("artists")
			.select(
				`*, performance_count:performances(count), artist_labels(label_id, labels(id, name))`,
				{ count: "exact" },
			)
			.order("name", { ascending: true })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		// Apply filters
		if (name) {
			query = query.ilike("name", `%${name}%`);
		}
		if (genre) {
			query = query.eq("genre", genre);
		}
		if (city) {
			query = query.ilike("city", `%${city}%`);
		}
		if (matchingArtistIds) {
			query = query.in("id", matchingArtistIds);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Normalize subquery formats
		const artists = (data || []).map((artist: Record<string, unknown>) => {
			const rawLabels = artist.artist_labels as
				| { labels: { id: string; name: string } | null }[]
				| undefined;
			return {
				...artist,
				performance_count:
					(artist.performance_count as { count: number }[])?.[0]?.count ?? 0,
				labels: (rawLabels || [])
					.map((al) => al.labels)
					.filter(Boolean)
					.filter((l): l is { id: string; name: string } => l !== null)
					.sort((a, b) => a.name.localeCompare(b.name)),
			};
		});

		return NextResponse.json({
			artists,
			total: count || 0,
			limit: parseInt(limit),
			offset: parseInt(offset),
		});
	} catch (error) {
		console.error("Error fetching artists:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/artists - Create a new artist
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

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
		} = body;

		// Validate required fields
		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("artists")
			.insert({
				name,
				city,
				fee,
				genre,
				bio,
				contact_email,
				contact_phone,
				promo_pack_url,
				documents: documents || {},
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating artist:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
