import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/items/[id]/tasks — Fetch all tasks linked to this item
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_READ");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		// Fetch all task_items rows for this item, with task + sublocation data
		const { data: taskItems, error } = await supabase
			.from("task_items")
			.select(
				`
        task_id,
        goal_sub_location_id,
        delivered_at,
        task:task_id (
          id,
          title,
          description,
          status,
          priority,
          due_date,
          scheduled_date,
          blocked,
          created_at,
          assignee:assignee_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          event:event_id (
            id,
            name,
            date
          ),
          parent_task_id,
          subtasks:tasks!tasks_parent_task_id_fkey (
            id,
            title,
            status,
            priority
          )
        ),
        goal_sub_location:goal_sub_location_id (
          id,
          name,
          venue:venue_id (
            id,
            name
          )
        )
      `,
			)
			.eq("item_id", id)
			.order("task_id", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			task_entries: taskItems || [],
			total: taskItems?.length || 0,
		});
	} catch (error) {
		console.error("Error fetching item tasks:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
