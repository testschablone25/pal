// Tasks CRUD API
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";
import { cacheHeaders } from "@/lib/api-cache";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/tasks - List all tasks with optional filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "TASKS_READ");
		if (!auth.authorized) return auth.response;
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
			// Check both assignee_id AND task_assignees for multi-assignee support
			let assignedViaJunction: string[] = [];
			try {
				const { data: taIds } = await supabase
					.from("task_assignees")
					.select("task_id")
					.eq("profile_id", userId);
				assignedViaJunction = taIds?.map((t) => t.task_id) || [];
			} catch {
				// task_assignees table doesn't exist yet
			}
			if (assignedViaJunction.length > 0) {
				query = query.or(
					`assignee_id.eq.${userId},id.in.(${assignedViaJunction.join(",")})`,
				);
			} else {
				query = query.eq("assignee_id", userId);
			}
		} else if (assigneeId) {
			// Check both assignee_id AND task_assignees
			let assignedViaJunction: string[] = [];
			try {
				const { data: taIds } = await supabase
					.from("task_assignees")
					.select("task_id")
					.eq("profile_id", assigneeId);
				assignedViaJunction = taIds?.map((t) => t.task_id) || [];
			} catch {
				// task_assignees table doesn't exist yet
			}
			if (assignedViaJunction.length > 0) {
				query = query.or(
					`assignee_id.eq.${assigneeId},id.in.(${assignedViaJunction.join(",")})`,
				);
			} else {
				query = query.eq("assignee_id", assigneeId);
			}
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

		const taskIds = (data || [])
			.map((t: Record<string, unknown>) => t.id)
			.filter(Boolean);

		// Fetch task_assignees separately (table may not exist yet in dev)
		const assigneeMap: Record<string, Array<Record<string, unknown>>> = {};
		try {
			if (taskIds.length > 0) {
				const { data: taData } = await supabase
					.from("task_assignees")
					.select("task_id, profile_id(id, full_name, email, avatar_url)")
					.in("task_id", taskIds);
				for (const ta of taData || []) {
					if (!assigneeMap[ta.task_id]) assigneeMap[ta.task_id] = [];
					assigneeMap[ta.task_id].push(
						ta.profile_id as unknown as Record<string, unknown>,
					);
				}
			}
		} catch {
			// task_assignees table doesn't exist yet — continue without assignee data
		}

		// Fetch subtasks for all top-level tasks
		const subtaskMap: Record<string, Array<Record<string, unknown>>> = {};
		if (taskIds.length > 0) {
			try {
				const { data: subData } = await supabase
					.from("tasks")
					.select(
						"id, title, status, priority, due_date, blocked, blocked_reason, needs_approval, parent_task_id, assignee_id, assignee:assignee_id(id, full_name, email, avatar_url)",
					)
					.in("parent_task_id", taskIds)
					.order("created_at", { ascending: true });
				for (const st of (subData as Array<Record<string, unknown>>) || []) {
					const pid = st.parent_task_id as string;
					if (!subtaskMap[pid]) subtaskMap[pid] = [];
					subtaskMap[pid].push(st);
				}
			} catch {
				// subtask query failed — continue without
			}
		}

		const tasksWithSubtasks =
			(data || []).map((task: Record<string, unknown>) => ({
				...task,
				assignees: assigneeMap[task.id as string] || null,
				subtasks: subtaskMap[task.id as string] || [],
				comment_count:
					(task.comments as Array<{ count: number }>)?.[0]?.count || 0,
				comments: undefined,
			})) || [];

		return NextResponse.json(
			{
				tasks: tasksWithSubtasks,
				total: count || 0,
				limit: parseInt(limit),
				offset: parseInt(offset),
			},
			{ headers: cacheHeaders(30) },
		);
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
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;

		const body = await request.json();

		const {
			title,
			description,
			status,
			priority,
			assignee_id,
			assignee_ids,
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
			subtask_titles, // string[] — batch-created after parent
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

		// Handle assignees: support both assignee_ids[] and legacy assignee_id
		const resolvedAssigneeIds =
			assignee_ids || (assignee_id ? [assignee_id] : []);

		if (resolvedAssigneeIds.length > 0 && taskData) {
			const { error: assigneeError } = await supabase
				.from("task_assignees")
				.insert(
					resolvedAssigneeIds.map((pid: string) => ({
						task_id: taskData.id,
						profile_id: pid,
					})),
				);
			if (assigneeError) {
				console.error("Failed to link assignees:", assigneeError);
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

		// Batch-create sub-tasks (for initial task creation flow)
		const createdSubtasks: Array<Record<string, unknown>> = [];
		if (subtask_titles?.length > 0 && taskData) {
			const subtaskInserts = subtask_titles
				.filter((st: string) => st?.trim())
				.map((st: string) => ({
					title: st.trim(),
					status: "todo",
					priority: resolvedPriority,
					assignee_id: resolvedAssigneeId || null,
					event_id: resolvedEventId || null,
					parent_task_id: taskData.id,
					created_by,
				}));

			if (subtaskInserts.length > 0) {
				const { data: subData, error: subError } = await supabase
					.from("tasks")
					.insert(subtaskInserts)
					.select("id, title, status, priority, parent_task_id");

				if (subError) {
					console.error("Failed to create sub-tasks:", subError);
				} else if (subData) {
					createdSubtasks.push(...subData);
					// Log history for each sub-task
					await supabase.from("task_history").insert(
						subData.map((st: Record<string, unknown>) => ({
							task_id: st.id,
							changed_by: created_by,
							from_status: null,
							to_status: "todo",
							change_type: "created",
						})),
					);
				}
			}
		}

		return NextResponse.json(
			{
				...taskData,
				assignees:
					(
						taskData.assignees as Array<{ profile_id: Record<string, unknown> }>
					)?.map((ta) => ta.profile_id) || null,
				comment_count: 0,
				item_ids: (itemsToLink || []).map(
					(i: { item_id: string }) => i.item_id,
				),
				parent_task_id: parent_task_id || null,
				subtasks: createdSubtasks,
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
