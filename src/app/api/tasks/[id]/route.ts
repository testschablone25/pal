// Tasks CRUD API - Single Task
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

interface TaskItemRow {
	item_id: string;
	goal_sub_location_id: string | null;
	delivered_at: string | null;
	items: Record<string, unknown> | null;
	goal_sub_location: Record<string, unknown> | null;
}

interface TransformedTaskItem {
	item_id: string;
	goal_sub_location_id: string | null;
	delivered_at: string | null;
	item: Record<string, unknown> | null;
	goal_sub_location: Record<string, unknown> | null;
}

function transformTaskItems(rows: TaskItemRow[]): TransformedTaskItem[] {
	return (rows || []).map((ti) => ({
		item_id: ti.item_id,
		goal_sub_location_id: ti.goal_sub_location_id,
		delivered_at: ti.delivered_at,
		item: ti.items || null,
		goal_sub_location: ti.goal_sub_location || null,
	}));
}

const subtaskSelect = `
  id,
  title,
  status,
  priority,
  assignee_id,
  blocked,
  blocked_reason,
  needs_approval,
  due_date,
  task_type,
  assignee:assignee_id (
    id,
    full_name,
    email,
    avatar_url
  )
`;

const taskSelect = `
  *,
  assignee:assignee_id (
    id,
    full_name,
    email,
    avatar_url
  ),
  assignees:task_assignees(
    profile_id (
      id,
      full_name,
      email,
      avatar_url
    )
  ),
  event:event_id (
    id,
    name,
    date
  ),
  comments:task_comments(count),
  creator:created_by (
    id,
    full_name,
    email,
    avatar_url
  ),
  parent_task:parent_task_id (
    id,
    title,
    status
  ),
  task_items (
    item_id,
    goal_sub_location_id,
    delivered_at,
    goal_sub_location:goal_sub_location_id (
      id,
      name,
      venue:venue_id (
        id,
        name
      )
    ),
    items:item_id (
      id,
      name,
      category,
      serial_number,
      current_location,
      sub_location_id,
      qr_token
    )
  )
`;

// GET /api/tasks/[id] - Get single task
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_READ");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		// Fetch the main task — gracefully handle missing task_assignees table
		let data: Record<string, unknown> | null = null;
		let error: { code?: string; message: string } | null = null;

		try {
			const result = await supabase
				.from("tasks")
				.select(taskSelect)
				.eq("id", id)
				.single();
			data = result.data as unknown as Record<string, unknown>;
			error = result.error as { code?: string; message: string } | null;
		} catch {
			// task_assignees table may not exist — fall back to simpler select
			const result = await supabase
				.from("tasks")
				.select(`
          *,
          assignee:assignee_id (id, full_name, email, avatar_url),
          event:event_id (id, name, date),
          comments:task_comments(count),
          creator:created_by (id, full_name, email, avatar_url),
          parent_task:parent_task_id (id, title, status),
          task_items (item_id, goal_sub_location_id, delivered_at)
        `)
				.eq("id", id)
				.single();
			data = result.data as unknown as Record<string, unknown>;
			error = result.error as { code?: string; message: string } | null;
		}

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Task not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fetch subtasks separately — avoids reliance on foreign key constraint name
		const { data: subtasks } = await supabase
			.from("tasks")
			.select(subtaskSelect)
			.eq("parent_task_id", id)
			.order("created_at", { ascending: true });

		const transformedItems = transformTaskItems(
			(data?.task_items as unknown as TaskItemRow[]) || [],
		);

		const assigneesRaw = data?.assignees as
			| Array<{ profile_id: Record<string, unknown> }>
			| undefined;

		return NextResponse.json({
			...data,
			assignees: assigneesRaw?.map((ta) => ta.profile_id) || null,
			comment_count:
				(data?.comments as Array<{ count: number }>)?.[0]?.count || 0,
			comments: undefined,
			task_items: transformedItems,
			subtasks: subtasks || [],
		});
	} catch (error) {
		console.error("Error fetching task:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;
		const body = await request.json();

		const {
			title,
			description,
			status,
			priority,
			assignee_id,
			assignee_ids,
			event_id,
			due_date,
			scheduled_date,
			needs_approval,
			blocked,
			task_type,
			blocked_reason,
			parent_task_id,
			changed_by,
			item_ids,
			items, // structured: [{ item_id, goal_sub_location_id }]
		} = body;

		// Fetch existing task for comparison
		const { data: existing, error: fetchError } = await supabase
			.from("tasks")
			.select("*")
			.eq("id", id)
			.single();

		if (fetchError) {
			if (fetchError.code === "PGRST116") {
				return NextResponse.json({ error: "Task not found" }, { status: 404 });
			}
			return NextResponse.json({ error: fetchError.message }, { status: 500 });
		}

		// Build update payload, only including provided fields.
		// Normalize empty strings to null for UUID / date columns.
		const updatePayload: Record<string, unknown> = {};
		if (title !== undefined) updatePayload.title = title;
		if (description !== undefined) updatePayload.description = description;
		if (status !== undefined) updatePayload.status = status;
		if (priority !== undefined) updatePayload.priority = priority;
		if (assignee_id !== undefined)
			updatePayload.assignee_id = assignee_id || null;
		if (event_id !== undefined) updatePayload.event_id = event_id || null;
		if (due_date !== undefined) updatePayload.due_date = due_date || null;
		if (scheduled_date !== undefined)
			updatePayload.scheduled_date = scheduled_date || null;
		if (needs_approval !== undefined)
			updatePayload.needs_approval = needs_approval;
		if (task_type !== undefined) updatePayload.task_type = task_type;
		if (blocked !== undefined) updatePayload.blocked = blocked;
		if (blocked_reason !== undefined)
			updatePayload.blocked_reason = blocked_reason;
		if (parent_task_id !== undefined)
			updatePayload.parent_task_id = parent_task_id || null;

		const { data, error } = await supabase
			.from("tasks")
			.update(updatePayload)
			.eq("id", id)
			.select(taskSelect)
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Log edit history
		const changedFields: string[] = [];
		const trackedFields: [string, keyof typeof existing, unknown][] = [
			["title", "title", title],
			["description", "description", description],
			["priority", "priority", priority],
			["assignee_id", "assignee_id", assignee_id],
			["event_id", "event_id", event_id],
			["due_date", "due_date", due_date],
			["scheduled_date", "scheduled_date", scheduled_date],
			["needs_approval", "needs_approval", needs_approval],
			["blocked", "blocked", blocked],
			["blocked_reason", "blocked_reason", blocked_reason],
			["task_type", "task_type", task_type],
		];

		for (const [label, field, newValue] of trackedFields) {
			if (
				newValue !== undefined &&
				String(existing[field]) !== String(newValue)
			) {
				changedFields.push(label);
			}
		}

		if (changedFields.length > 0 && changed_by) {
			await supabase.from("task_history").insert({
				task_id: id,
				changed_by,
				from_status: existing.status,
				to_status: status ?? existing.status,
				change_type: "edited",
				reason: `Changed: ${changedFields.join(", ")}`,
			});
		}

		// Handle items: support both legacy item_ids[] and structured items[]
		const itemsToUpdate =
			items ??
			(item_ids !== undefined
				? item_ids.map((id: string) => ({ item_id: id }))
				: undefined);

		if (itemsToUpdate !== undefined) {
			// Delete old links
			const { error: deleteError } = await supabase
				.from("task_items")
				.delete()
				.eq("task_id", id);

			if (deleteError) {
				console.error("Failed to delete old task items:", deleteError);
				return NextResponse.json(
					{ error: "Failed to update task items" },
					{ status: 500 },
				);
			}

			// Insert new links with goal locations
			if (itemsToUpdate.length > 0) {
				const { error: insertError } = await supabase.from("task_items").insert(
					itemsToUpdate.map(
						(entry: { item_id: string; goal_sub_location_id?: string }) => ({
							task_id: id,
							item_id: entry.item_id,
							goal_sub_location_id: entry.goal_sub_location_id || null,
						}),
					),
				);

				if (insertError) {
					console.error("Failed to insert new task items:", insertError);
					return NextResponse.json(
						{ error: "Failed to update task items" },
						{ status: 500 },
					);
				}
			}
		}

		// Handle assignees: sync task_assignees junction table
		const resolvedAssigneeIds =
			assignee_ids !== undefined
				? assignee_ids
				: assignee_id !== undefined
					? assignee_id
						? [assignee_id]
						: []
					: undefined;

		if (resolvedAssigneeIds !== undefined) {
			// Delete existing
			const { error: delAssigneeError } = await supabase
				.from("task_assignees")
				.delete()
				.eq("task_id", id);

			if (delAssigneeError) {
				console.error("Failed to clear task assignees:", delAssigneeError);
			}

			// Insert new
			if (resolvedAssigneeIds.length > 0) {
				const { error: insAssigneeError } = await supabase
					.from("task_assignees")
					.insert(
						resolvedAssigneeIds.map((pid: string) => ({
							task_id: id,
							profile_id: pid,
						})),
					);

				if (insAssigneeError) {
					console.error("Failed to insert task assignees:", insAssigneeError);
				}
			}
		}

		// Re-fetch task with fresh data — gracefully handle missing task_assignees table
		let freshData: Record<string, unknown> | null = null;
		try {
			const { data: fd } = await supabase
				.from("tasks")
				.select(taskSelect)
				.eq("id", id)
				.single();
			freshData = fd as unknown as Record<string, unknown>;
		} catch {
			// task_assignees table may not exist — fall back to simpler select
			const { data: fd } = await supabase
				.from("tasks")
				.select(`
          *,
          assignee:assignee_id (id, full_name, email, avatar_url),
          event:event_id (id, name, date)
        `)
				.eq("id", id)
				.single();
			freshData = fd as unknown as Record<string, unknown>;
		}

		const responseData = (freshData || data) as Record<string, unknown>;

		const transformedItems = transformTaskItems(
			(responseData.task_items as unknown as TaskItemRow[]) || [],
		);

		const assigneesRaw = responseData.assignees as
			| Array<{ profile_id: Record<string, unknown> }>
			| undefined;

		return NextResponse.json({
			...responseData,
			// Explicitly include description from the request to ensure it's always in the response
			description:
				description !== undefined ? description : responseData.description,
			assignees:
				assigneesRaw?.map(
					(ta: { profile_id: Record<string, unknown> }) => ta.profile_id,
				) || null,
			comment_count:
				(responseData.comments as Array<{ count: number }>)?.[0]?.count || 0,
			comments: undefined,
			task_items: transformedItems,
			subtasks: (responseData.subtasks as Array<Record<string, unknown>>) || [],
		});
	} catch (error) {
		console.error("Error updating task:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		const { error } = await supabase.from("tasks").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting task:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
