// Venue Single API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/venues/[id] - Get single venue with full detail
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { data: venue, error } = await supabase
			.from("venues")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return NextResponse.json({ error: "Venue not found" }, { status: 404 });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fetch sub-locations
		const { data: subLocations } = await supabase
			.from("venue_sub_locations")
			.select("*")
			.eq("venue_id", id)
			.order("name", { ascending: true });

		const subLocIds = (subLocations || []).map((sl) => sl.id);

		// Fetch events at this venue
		const { data: events } = await supabase
			.from("events")
			.select("id, name, date, status, door_time, end_time, max_capacity")
			.eq("venue_id", id)
			.order("date", { ascending: false })
			.limit(20);

		const eventIds = (events || []).map((e) => e.id);

		// Fetch open tasks — both via events and directly linked to venue
		const openTasksRaw: Record<string, unknown>[] = [];

		if (eventIds.length > 0) {
			const { data: eventTasks } = await supabase
				.from("tasks")
				.select(
					`id, title, status, priority, due_date, scheduled_date, task_type,
					 assignee:assignee_id (id, full_name, email)`,
				)
				.in("event_id", eventIds)
				.not("status", "in", "(done,cancelled)")
				.order("priority", { ascending: true });

			if (eventTasks) openTasksRaw.push(...eventTasks);
		}

		const { data: directTasks } = await supabase
			.from("tasks")
			.select(
				`id, title, status, priority, due_date, scheduled_date, task_type,
				 assignee:assignee_id (id, full_name, email)`,
			)
			.eq("venue_id", id)
			.is("event_id", null)
			.not("status", "in", "(done,cancelled)")
			.order("priority", { ascending: true });

		if (directTasks) openTasksRaw.push(...directTasks);

		// Deduplicate tasks by id and normalize assignee (Supabase returns arrays)
		const seenTaskIds = new Set<string>();
		const tasks = openTasksRaw
			.filter((t: Record<string, unknown>) => {
				if (seenTaskIds.has(t.id as string)) return false;
				seenTaskIds.add(t.id as string);
				return true;
			})
			.map((t: Record<string, unknown>) => ({
				id: t.id,
				title: t.title,
				status: t.status,
				priority: t.priority,
				due_date: t.due_date,
				scheduled_date: t.scheduled_date,
				task_type: t.task_type,
				assignee: Array.isArray(t.assignee)
					? t.assignee[0] || null
					: t.assignee || null,
			}));

		// Fetch upcoming staff shifts at this venue's events
		const staffShiftsRaw: Record<string, unknown>[] = [];
		if (eventIds.length > 0) {
			const { data: shifts } = await supabase
				.from("shifts")
				.select(
					`id, role, start_time, end_time, status,
					 staff:staff_id (id, role, profiles:profile_id (full_name, email)),
					 event:event_id (id, name, date)`,
				)
				.in("event_id", eventIds)
				.order("start_time", { ascending: true })
				.limit(50);

			if (shifts) staffShiftsRaw.push(...shifts);
		}

		const staffShifts = staffShiftsRaw.map((s: Record<string, unknown>) => ({
			id: s.id,
			role: s.role,
			start_time: s.start_time,
			end_time: s.end_time,
			status: s.status,
			staff: Array.isArray(s.staff) ? s.staff[0] || null : s.staff || null,
			event: Array.isArray(s.event) ? s.event[0] || null : s.event || null,
		}));

		// Fetch inventory items at this venue (via sub-locations)
		let inventory: Record<string, unknown>[] = [];
		if (subLocIds.length > 0) {
			const { data: items } = await supabase
				.from("items")
				.select(
					`id, name, category, condition_enum, serial_number,
					 sub_location:sub_location_id (id, name)`,
				)
				.in("sub_location_id", subLocIds)
				.order("name", { ascending: true });

			if (items) {
				inventory = items.map((item: Record<string, unknown>) => ({
					...item,
					sub_location: Array.isArray(item.sub_location)
						? item.sub_location[0] || null
						: item.sub_location || null,
				}));
			}
		}

		const today = new Date().toISOString().split("T")[0];

		return NextResponse.json({
			...venue,
			sub_locations: subLocations || [],
			events: events || [],
			tasks,
			staff_shifts: staffShifts,
			inventory,
			stats: {
				open_tasks: tasks.length,
				urgent_tasks: tasks.filter(
					(t) =>
						t.priority === "urgent" ||
						(t.due_date && new Date(t.due_date as string) < new Date()),
				).length,
				upcoming_events: (events || []).filter((e) => e.date >= today).length,
				total_inventory: inventory.length,
				sub_locations_count: (subLocations || []).length,
			},
		});
	} catch (error) {
		console.error("Error fetching venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PUT /api/venues/[id] - Update venue
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		// Build update payload — only include fields that are present in the body
		const updatePayload: Record<string, unknown> = {};
		const updatableFields = [
			"name",
			"address",
			"capacity",
			"venue_type",
			"notes",
			"contact_name",
			"contact_phone",
			"contact_email",
		];
		for (const field of updatableFields) {
			if (field in body) {
				updatePayload[field] = body[field] ?? null;
			}
		}

		// Validate only when name/capacity are being updated
		if ("name" in body && !body.name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}
		if ("capacity" in body && !body.capacity) {
			return NextResponse.json(
				{ error: "Capacity is required" },
				{ status: 400 },
			);
		}

		if (Object.keys(updatePayload).length === 0) {
			return NextResponse.json(
				{ error: "No fields to update" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("venues")
			.update(updatePayload)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error("Error updating venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/venues/[id] - Delete venue
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const { error } = await supabase.from("venues").delete().eq("id", id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
