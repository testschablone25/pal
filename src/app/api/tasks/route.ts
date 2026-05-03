// Tasks CRUD API
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/tasks - List all tasks with optional filtering
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const status = searchParams.get("status");
		const priority = searchParams.get("priority");
		const assigneeId = searchParams.get("assignee_id");
		const eventId = searchParams.get("event_id");
		const limit = searchParams.get("limit") || "100";
		const offset = searchParams.get("offset") || "0";
		const myTasks = searchParams.get("my_tasks");
		const userId = searchParams.get("user_id");
		const blocked = searchParams.get("blocked");
		const needsApproval = searchParams.get("needs_approval");
		const search = searchParams.get("search");
		const myCreated = searchParams.get("my_created");
		const venueId = searchParams.get("venue_id");
		const parentTaskId = searchParams.get("parent_task_id");
		const noParent = searchParams.get("no_parent");
		const taskType = searchParams.get("task_type");

		let query = supabase
			.from("tasks")
			.select(
				`
        *,
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
        comments:task_comments(count),
        parent_task:parent_task_id (
          id,
          title
        )
      `,
				{ count: "exact" },
			)
			.order("created_at", { ascending: false })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

		// Apply filters
		if (status) {
			query = query.eq("status", status);
		}
		if (priority) {
			query = query.eq("priority", priority);
		}
		if (myTasks === "true" && userId) {
			query = query.eq("assignee_id", userId);
		} else if (assigneeId) {
			query = query.eq("assignee_id", assigneeId);
		}
		if (eventId) {
			query = query.eq("event_id", eventId);
		}
		if (blocked === "true") {
			query = query.eq("blocked", true);
		}
		if (needsApproval === "true") {
			query = query.eq("needs_approval", true);
		}
		if (search) {
			const sanitized = search.replace(/%/g, "\\%");
			query = query.or(
				`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
			);
		}
		if (myCreated === "true" && userId) {
			query = query.eq("created_by", userId);
		}
		if (venueId) {
			// Filter by venue — find events belonging to this venue, OR tasks directly linked
			const { data: venueEvents } = await supabase
				.from("events")
				.select("id")
				.eq("venue_id", venueId);
			const eventIds = venueEvents?.map((e) => e.id) || [];

			// Use OR to match tasks with events at this venue OR tasks with direct venue_id
			const conditions: string[] = [];
			if (eventIds.length > 0) {
				conditions.push(`event_id.in.(${eventIds.join(",")})`);
			}
			conditions.push(`venue_id.eq.${venueId}`);
			query = query.or(conditions.join(","));
		}
		if (parentTaskId) {
			query = query.eq("parent_task_id", parentTaskId);
		}
		if (noParent === "true") {
			query = query.is("parent_task_id", null);
		}
		if (taskType) {
			query = query.eq("task_type", taskType);
		}

		const { data, error, count } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const tasksWithCommentCount =
			data?.map((task) => ({
				...task,
				comment_count: task.comments?.[0]?.count || 0,
				comments: undefined,
			})) || [];

		return NextResponse.json({
			tasks: tasksWithCommentCount,
			total: count || 0,
			limit: parseInt(limit),
			offset: parseInt(offset),
		});
	} catch (error) {
		console.error("Error fetching tasks:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const {
			title,
			description,
			status,
			priority,
			assignee_id,
			event_id,
			venue_id,
			due_date,
			scheduled_date,
			needs_approval,
			task_type,
			created_by,
			item_ids,
			items, // structured: [{ item_id, goal_sub_location_id }]
			parent_task_id,
		} = body;

		if (!title) {
			return NextResponse.json({ error: "Title is required" }, { status: 400 });
		}

		if (!created_by) {
			return NextResponse.json(
				{ error: "You must be logged in to create a task" },
				{ status: 401 },
			);
		}

		// Resolve field values with parent task inheritance
		let resolvedEventId = event_id;
		let resolvedPriority = priority || "medium";
		let resolvedAssigneeId = assignee_id;

		if (parent_task_id) {
			const { data: parentTask } = await supabase
				.from("tasks")
				.select("event_id, priority, assignee_id")
				.eq("id", parent_task_id)
				.single();

			if (parentTask) {
				if (!resolvedEventId) resolvedEventId = parentTask.event_id;
				if (!priority) resolvedPriority = parentTask.priority || "medium";
				if (!resolvedAssigneeId) resolvedAssigneeId = parentTask.assignee_id;
			}
		}

		const { data: taskData, error: taskError } = await supabase
			.from("tasks")
			.insert({
				title,
				description,
				status: status || "todo",
				priority: resolvedPriority,
				assignee_id: resolvedAssigneeId || null,
				event_id: resolvedEventId || null,
				venue_id: venue_id || null,
				due_date: due_date || null,
				scheduled_date: scheduled_date || null,
				needs_approval: needs_approval || false,
				task_type: task_type || null,
				created_by,
				parent_task_id: parent_task_id || null,
			})
			.select(
				`
        *,
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
        parent_task:parent_task_id (
          id,
          title
        )
      `,
			)
			.single();

		if (taskError) {
			return NextResponse.json({ error: taskError.message }, { status: 400 });
		}

		// Handle items: support both legacy item_ids[] and structured items[]
		const itemsToLink =
			items ||
			(item_ids ? item_ids.map((id: string) => ({ item_id: id })) : []);

		if (itemsToLink.length > 0 && taskData) {
			const { error: itemsError } = await supabase.from("task_items").insert(
				itemsToLink.map(
					(entry: { item_id: string; goal_sub_location_id?: string }) => ({
						task_id: taskData.id,
						item_id: entry.item_id,
						goal_sub_location_id: entry.goal_sub_location_id || null,
					}),
				),
			);
			if (itemsError) {
				console.error("Failed to link items:", itemsError);
			}
		}

		const { error: historyError } = await supabase.from("task_history").insert({
			task_id: taskData.id,
			changed_by: created_by,
			from_status: null,
			to_status: taskData.status,
			change_type: "created",
		});

		if (historyError) {
			console.error("Failed to log task history:", historyError);
		}

		return NextResponse.json(
			{
				...taskData,
				comment_count: 0,
				item_ids: (itemsToLink || []).map(
					(i: { item_id: string }) => i.item_id,
				),
				parent_task_id: parent_task_id || null,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating task:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
