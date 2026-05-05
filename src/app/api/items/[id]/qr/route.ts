import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";
import { generateQRToken, generateQRDataURL, generateQRSVG } from "@/lib/qr";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/items/[id]/qr — Get or generate QR code for an item
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "INVENTORY_READ");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		// Fetch the item
		const { data: item, error } = await supabase
			.from("items")
			.select("id, name, qr_token")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Item not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// If item already has a QR token, generate QR codes from it
		if (item.qr_token) {
			const [dataUrl, svg] = await Promise.all([
				generateQRDataURL(item.qr_token),
				generateQRSVG(item.qr_token),
			]);

			return NextResponse.json({
				token: item.qr_token,
				dataUrl,
				svg,
				new_token: false,
			});
		}

		// No token yet — generate a new one
		const token = generateQRToken();

		// Save token to item
		const { error: updateError } = await supabase
			.from("items")
			.update({ qr_token: token })
			.eq("id", id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		// Generate QR code images
		const [dataUrl, svg] = await Promise.all([
			generateQRDataURL(token),
			generateQRSVG(token),
		]);

		return NextResponse.json({
			token,
			dataUrl,
			svg,
			new_token: true,
		});
	} catch (error) {
		console.error("Error generating QR code:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/items/[id]/qr — Force re-generate QR token for an item
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "INVENTORY_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		// Check item exists
		const { data: item, error: fetchError } = await supabase
			.from("items")
			.select("id, name")
			.eq("id", id)
			.single();

		if (fetchError) {
			if (fetchError.code === "PGRST116") {
				return NextResponse.json({ error: "Item not found" }, { status: 404 });
			}
			return NextResponse.json({ error: fetchError.message }, { status: 500 });
		}

		// Generate new token
		const token = generateQRToken();

		// Save token to item
		const { error: updateError } = await supabase
			.from("items")
			.update({ qr_token: token })
			.eq("id", id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		// Generate QR code images
		const [dataUrl, svg] = await Promise.all([
			generateQRDataURL(token),
			generateQRSVG(token),
		]);

		return NextResponse.json({
			token,
			dataUrl,
			svg,
			new_token: true,
		});
	} catch (error) {
		console.error("Error re-generating QR code:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
