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
		const agencyId = searchParams.get("agency_id");
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

			if (matchingArtistIds.length === 0) {
				return NextResponse.json({
					artists: [],
					total: 0,
					limit: parseInt(limit),
					offset: parseInt(offset),
				});
			}
		}

		// When filtering by agency, first get matching artist IDs from junction table
		let matchingAgencyArtistIds: string[] | null = null;
		if (agencyId) {
			try {
				const { data: junctionRows } = await supabase
					.from("artist_agencies")
					.select("artist_id")
					.eq("agency_id", agencyId);

				matchingAgencyArtistIds = (junctionRows || []).map((r) => r.artist_id);

				if (matchingAgencyArtistIds.length === 0) {
					return NextResponse.json({
						artists: [],
						total: 0,
						limit: parseInt(limit),
						offset: parseInt(offset),
					});
				}
			} catch {
				// artist_agencies table doesn't exist yet
				matchingAgencyArtistIds = [];
			}
		}

		// Build base query with performance count + labels
		const selectFields = `*, performance_count:performances(count), artist_labels(label_id, labels(id, name))`;

		let query = supabase
			.from("artists")
			.select(selectFields, { count: "exact" })
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
		if (matchingAgencyArtistIds) {
			query = query.in("id", matchingAgencyArtistIds);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fetch agencies separately (resilient to missing table)
		const agencyMap: Record<string, { id: string; name: string }[]> = {};
		try {
			const { data: agencyJunction } = await supabase
				.from("artist_agencies")
				.select("artist_id, agencies(id, name)");

			if (agencyJunction) {
				for (const row of agencyJunction) {
					const aId = row.artist_id as string;
					const aData = row.agencies as unknown as { id: string; name: string } | null;
					if (!agencyMap[aId]) agencyMap[aId] = [];
					if (aData) agencyMap[aId].push(aData);
				}
			}
		} catch {
			// artist_agencies table doesn't exist yet — use empty
		}

		// Normalize subquery formats
		const artists = (data || []).map((artist: Record<string, unknown>) => {
			const rawLabels = artist.artist_labels as
				| { labels: { id: string; name: string } | null }[]
				| undefined;
			const artistId = artist.id as string;
			return {
				...artist,
				performance_count:
					(artist.performance_count as { count: number }[])?.[0]?.count ?? 0,
				labels: (rawLabels || [])
					.map((al) => al.labels)
					.filter(Boolean)
					.filter((l): l is { id: string; name: string } => l !== null)
					.sort((a, b) => a.name.localeCompare(b.name)),
				agencies: (agencyMap[artistId] || [])
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
