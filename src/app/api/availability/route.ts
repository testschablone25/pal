// Availability CRUD API — Phase 2 Rework
// Zod validation

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";
import { availabilityUpsertSchema } from "@/lib/validations/availability";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/availability - List availability with optional filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "AVAILABILITY_READ");
		if (!auth.authorized) return auth.response;

		const searchParams = request.nextUrl.searchParams;
		const staffId = searchParams.get("staff_id");
		const dateFrom = searchParams.get("date_from");
		const dateTo = searchParams.get("date_to");
		const available = searchParams.get("available");
		const limit = searchParams.get("limit") || "100";
		const offset = searchParams.get("offset") || "0";

		let query = supabase
			.from("availability")
			.select(
				`
        *,
        staff:staff_id (
          id,
          role,
          profiles:profile_id (
            id,
            full_name
          )
        ),
        set_by_staff:set_by (
          id,
          role,
          profiles:profile_id (
            id,
            full_name
          )
        )
      `,
				{ count: "exact" },
			)
			.order("date", { ascending: true })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		// Apply filters
		if (staffId) {
			query = query.eq("staff_id", staffId);
		}
		if (dateFrom) {
			query = query.gte("date", dateFrom);
		}
		if (dateTo) {
			query = query.lte("date", dateTo);
		}
		if (available !== null && available !== undefined && available !== "") {
			query = query.eq("available", available === "true");
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			availability: data,
			total: count || 0,
			limit: parseInt(limit),
			offset: parseInt(offset),
		});
	} catch (error) {
		console.error("Error fetching availability:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/availability - Create or update availability
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "AVAILABILITY_WRITE");
		if (!auth.authorized) return auth.response;

		const body = await request.json();

		// Zod validation for core fields
		const parsed = availabilityUpsertSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		// Build upsert payload — include extra fields beyond the schema
		const payload: Record<string, unknown> = {
			...parsed.data,
		};
		if ("set_by" in body) payload.set_by = body.set_by;
		if ("notes" in body) payload.notes = body.notes || null;
		if ("available_from" in body)
			payload.available_from = body.available_from || null;
		if ("available_until" in body)
			payload.available_until = body.available_until || null;

		// Upsert: insert or update if exists
		const { data, error } = await supabase
			.from("availability")
			.upsert(payload, {
				onConflict: "staff_id,date",
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating/updating availability:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
