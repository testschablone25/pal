/**
 * GET /api/items/[id]/rider-assignments
 * Returns which artists reference this inventory item in their tech riders.
 * Scans artists.tech_rider JSONB for equipment items with matching inventory_item_id.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

interface RiderAssignment {
	artist_id: string;
	artist_name: string;
	artist_genre: string | null;
	rider_section: string;
	equipment_name: string;
	quantity: number;
	artist_brings: boolean;
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		// Fetch all artists that have a tech_rider (non-null and non-empty)
		const { data: artists, error } = await supabase
			.from("artists")
			.select("id, name, genre, tech_rider")
			.not("tech_rider", "is", null);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const assignments: RiderAssignment[] = [];

		for (const artist of artists || []) {
			const rider = artist.tech_rider as Record<string, unknown> | null;
			if (!rider) continue;

			// Check equipment
			const equipment = Array.isArray(rider.equipment) ? rider.equipment : [];
			for (const item of equipment) {
				if (
					typeof item === "object" &&
					item !== null &&
					(item as Record<string, unknown>).inventory_item_id === id
				) {
					assignments.push({
						artist_id: artist.id,
						artist_name: artist.name,
						artist_genre: artist.genre,
						rider_section: "Equipment",
						equipment_name: String(
							(item as Record<string, unknown>).name || "Unknown",
						),
						quantity: Number((item as Record<string, unknown>).quantity) || 1,
						artist_brings: Boolean(
							(item as Record<string, unknown>).artist_brings,
						),
					});
				}
			}

			// Check stage_setup.monitors
			const stageSetup = rider.stage_setup as
				| Record<string, unknown>
				| undefined;
			if (stageSetup) {
				const monitors = Array.isArray(stageSetup.monitors)
					? stageSetup.monitors
					: [];
				for (const item of monitors) {
					if (
						typeof item === "object" &&
						item !== null &&
						(item as Record<string, unknown>).inventory_item_id === id
					) {
						assignments.push({
							artist_id: artist.id,
							artist_name: artist.name,
							artist_genre: artist.genre,
							rider_section: "Stage Monitors",
							equipment_name: String(
								(item as Record<string, unknown>).type || "Unknown",
							),
							quantity: Number((item as Record<string, unknown>).quantity) || 1,
							artist_brings: false,
						});
					}
				}

				const furniture = Array.isArray(stageSetup.furniture)
					? stageSetup.furniture
					: [];
				for (const item of furniture) {
					if (
						typeof item === "object" &&
						item !== null &&
						(item as Record<string, unknown>).inventory_item_id === id
					) {
						assignments.push({
							artist_id: artist.id,
							artist_name: artist.name,
							artist_genre: artist.genre,
							rider_section: "Stage Furniture",
							equipment_name: String(
								(item as Record<string, unknown>).type || "Unknown",
							),
							quantity: Number((item as Record<string, unknown>).quantity) || 1,
							artist_brings: false,
						});
					}
				}
			}

			// Check backline CDJs
			const backline = rider.backline as Record<string, unknown> | undefined;
			if (backline) {
				const cdjs = Array.isArray(backline.cdjs) ? backline.cdjs : [];
				for (const item of cdjs) {
					if (
						typeof item === "object" &&
						item !== null &&
						(item as Record<string, unknown>).inventory_item_id === id
					) {
						assignments.push({
							artist_id: artist.id,
							artist_name: artist.name,
							artist_genre: artist.genre,
							rider_section: "Backline CDJs",
							equipment_name: String(
								(item as Record<string, unknown>).model || "Unknown",
							),
							quantity: Number((item as Record<string, unknown>).quantity) || 1,
							artist_brings: false,
						});
					}
				}

				const turntables = Array.isArray(backline.turntables)
					? backline.turntables
					: [];
				for (const item of turntables) {
					if (
						typeof item === "object" &&
						item !== null &&
						(item as Record<string, unknown>).inventory_item_id === id
					) {
						assignments.push({
							artist_id: artist.id,
							artist_name: artist.name,
							artist_genre: artist.genre,
							rider_section: "Backline Turntables",
							equipment_name: String(
								(item as Record<string, unknown>).model || "Unknown",
							),
							quantity: Number((item as Record<string, unknown>).quantity) || 1,
							artist_brings: false,
						});
					}
				}
			}

			// Check audio preferred_mixers
			const audio = rider.audio as Record<string, unknown> | undefined;
			if (audio) {
				const mixers = Array.isArray(audio.preferred_mixers)
					? audio.preferred_mixers
					: [];
				for (const item of mixers) {
					if (
						typeof item === "object" &&
						item !== null &&
						(item as Record<string, unknown>).inventory_item_id === id
					) {
						assignments.push({
							artist_id: artist.id,
							artist_name: artist.name,
							artist_genre: artist.genre,
							rider_section: "Preferred Mixer",
							equipment_name: String(
								(item as Record<string, unknown>).model || "Unknown",
							),
							quantity: 1,
							artist_brings: false,
						});
					}
				}
			}
		}

		return NextResponse.json({
			item_id: id,
			assignments,
			total: assignments.length,
		});
	} catch (error) {
		console.error("Error fetching rider assignments:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
