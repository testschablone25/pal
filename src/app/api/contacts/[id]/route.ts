// Contacts CRUD API — Single Contact
// Standalone contacts from the contacts table

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/contacts/[id] — Get single contact
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "CONTACTS_READ");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		const { data, error } = await supabase
			.from("contacts")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Contact not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching contact:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/contacts/[id] — Update contact
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "CONTACTS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;
		const body = await request.json();

		const { name, phone, email, role, company, notes } = body;

		const updateData: Record<string, unknown> = {};
		if (name !== undefined) updateData.name = name;
		if (phone !== undefined) updateData.phone = phone || null;
		if (email !== undefined) updateData.email = email || null;
		if (role !== undefined) updateData.role = role || null;
		if (company !== undefined) updateData.company = company || null;
		if (notes !== undefined) updateData.notes = notes || null;

		const { data, error } = await supabase
			.from("contacts")
			.update(updateData)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Contact not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating contact:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/contacts/[id] — Delete contact
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "CONTACTS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		const { error } = await supabase.from("contacts").delete().eq("id", id);

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Contact not found" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting contact:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
