import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

type SubLocQueryResult = {
	name: string;
	venue: { name: string } | null;
} | null;

// POST /api/tasks/[id]/deliver-item — Mark a task item as delivered via QR scan
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id: taskId } = await params;
		const body = await request.json();

		const { item_id, scanned_sub_location_id, scanned_by } = body;

		if (!item_id) {
			return NextResponse.json(
				{ error: "item_id is required" },
				{ status: 400 },
			);
		}

		if (!scanned_sub_location_id) {
			return NextResponse.json(
				{ error: "scanned_sub_location_id is required" },
				{ status: 400 },
			);
		}

		if (!scanned_by) {
			return NextResponse.json(
				{ error: "scanned_by is required" },
				{ status: 400 },
			);
		}

		// Fetch the task_items row for this task + item
		const { data: taskItem, error: fetchError } = await supabase
			.from("task_items")
			.select("*, task:tasks!inner(id, title)")
			.eq("task_id", taskId)
			.eq("item_id", item_id)
			.single();

		if (fetchError) {
			if (fetchError.code === "PGRST116") {
				return NextResponse.json(
					{ error: "Item is not linked to this task" },
					{ status: 404 },
				);
			}
			return NextResponse.json({ error: fetchError.message }, { status: 500 });
		}

		// Check if already delivered
		if (taskItem.delivered_at) {
			return NextResponse.json({
				message: "Item already marked as delivered",
				already_delivered: true,
				delivered_at: taskItem.delivered_at,
			});
		}

		// Check if a goal location is set
		if (!taskItem.goal_sub_location_id) {
			return NextResponse.json(
				{
					error:
						"This item has no goal location set for this task. Please set a goal location first.",
				},
				{ status: 400 },
			);
		}

		// Validate scanned location matches goal location
		if (taskItem.goal_sub_location_id !== scanned_sub_location_id) {
			// Fetch the goal location name for a helpful error message
			const { data: goalLoc } = await supabase
				.from("venue_sub_locations")
				.select("name, venue:venue_id(name)")
				.eq("id", taskItem.goal_sub_location_id)
				.single();

			const typedGoalLoc = goalLoc as unknown as SubLocQueryResult;
			const goalName = typedGoalLoc
				? `${typedGoalLoc.venue?.name || ""} > ${typedGoalLoc.name}`
				: "unknown";

			return NextResponse.json(
				{
					error: `Location mismatch. Goal location is: ${goalName}`,
					goal_sub_location_id: taskItem.goal_sub_location_id,
					scanned_sub_location_id,
				},
				{ status: 400 },
			);
		}

		// All validations passed — mark as delivered
		const now = new Date().toISOString();

		const { error: updateError } = await supabase
			.from("task_items")
			.update({ delivered_at: now })
			.eq("task_id", taskId)
			.eq("item_id", item_id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		// Update the item's current_location to the goal location
		const { data: subLoc } = await supabase
			.from("venue_sub_locations")
			.select("name, venue:venue_id(name)")
			.eq("id", scanned_sub_location_id)
			.single();

		const typedSubLoc = subLoc as unknown as SubLocQueryResult;
		const locationDisplay = typedSubLoc
			? `${typedSubLoc.venue?.name || ""} > ${typedSubLoc.name}`
			: "";

		if (locationDisplay) {
			await supabase
				.from("items")
				.update({
					sub_location_id: scanned_sub_location_id,
					current_location: locationDisplay,
				})
				.eq("id", item_id);
		}

		// Log to item_location_history
		await supabase.from("item_location_history").insert({
			item_id,
			location: locationDisplay,
			action: "check_in",
			moved_by: scanned_by,
		});

		return NextResponse.json({
			success: true,
			delivered_at: now,
			item_id,
			task_id: taskId,
			current_location: locationDisplay,
		});
	} catch (error) {
		console.error("Error delivering item:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
