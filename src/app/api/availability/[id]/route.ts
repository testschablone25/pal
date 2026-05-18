// Availability CRUD API — Single Entry — Phase 2 Rework
// Zod validation

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";
import { availabilityUpsertSchema } from "@/lib/validations/availability";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// PUT /api/availability/[id] - Update availability
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "AVAILABILITY_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;
		const body = await request.json();

		// Zod validation
		const parsed = availabilityUpsertSchema.partial().safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const payload: Record<string, unknown> = {
			...parsed.data,
		};

		const { data, error } = await supabase
			.from("availability")
			.update(payload)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating availability:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/availability/[id] - Delete availability
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "AVAILABILITY_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		const { error } = await supabase.from("availability").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting availability:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
