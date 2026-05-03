import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
	const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const url = new URL(request.url);
	const userId = url.searchParams.get("user_id");

	if (!userId) {
		return NextResponse.json({
			error: "Missing user_id",
			tasks: [],
			shifts: [],
			colleagues: [],
			events: [],
		});
	}

	// Get profile
	const { data: profile } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", userId)
		.single();

	if (!profile) {
		return NextResponse.json({
			error: "User not found",
			tasks: [],
			shifts: [],
			colleagues: [],
			events: [],
		});
	}

	// Get ALL user roles
	const { data: roleData } = await supabase
		.from("user_roles")
		.select("role")
		.eq("user_id", userId);

	const userRoles = roleData?.map((r) => r.role) || [];

	// Get staff record
	const { data: staffRecord } = await supabase
		.from("staff")
		.select("*")
		.eq("profile_id", userId)
		.single();

	// Get tasks with event + venue info
	const { data: rawTasks } = await supabase
		.from("tasks")
		.select(
			"id, title, status, priority, due_date, scheduled_date, blocked, events(id, name, date, venue_id, venues(name))",
		)
		.eq("assignee_id", userId)
		.in("status", ["todo", "in_progress", "pending_approval"])
		.order("priority", { ascending: false })
		.limit(50);

	// Normalize tasks — unwrap Supabase nested arrays
	const normalizedTasks = (
		(rawTasks as unknown as Array<Record<string, unknown>>) || []
	).map((t) => {
		const rawEvent = t.events as Record<string, unknown> | null;
		const eventObj = rawEvent ? normalizeFirst(rawEvent) : null;
		const venueObj = eventObj?.venues
			? normalizeFirst(eventObj.venues as Record<string, unknown>)
			: null;
		return {
			id: t.id as string,
			title: t.title as string,
			status: t.status as string,
			priority: t.priority as string,
			due_date: t.due_date as string | null,
			scheduled_date: t.scheduled_date as string | null,
			blocked: t.blocked as boolean,
			event_id: (eventObj?.id as string) || null,
			event: eventObj
				? {
						id: eventObj.id as string,
						name: eventObj.name as string,
						date: eventObj.date as string,
						venue_id: eventObj.venue_id as string | null,
						venue_name: (venueObj?.name as string) || null,
					}
				: null,
		};
	});

	// Compute overdue tasks (due_date passed and not done)
	const today = new Date().toISOString().split("T")[0];
	const overdueTasks = normalizedTasks.filter(
		(t) =>
			t.due_date &&
			t.due_date < today &&
			!["done", "cancelled"].includes(t.status as string),
	);

	// Get upcoming published events
	const { data: rawWeekEvents } = await supabase
		.from("events")
		.select(
			"id, name, date, door_time, end_time, status, venue_id, venues(name)",
		)
		.gte("date", today)
		.eq("status", "published")
		.order("date", { ascending: true })
		.limit(10);

	const normalizedWeekEvents = (
		(rawWeekEvents as unknown as Array<Record<string, unknown>>) || []
	).map((e) => {
		const venueObj = e.venues
			? normalizeFirst(e.venues as Record<string, unknown>)
			: null;
		return {
			id: e.id as string,
			name: e.name as string,
			date: e.date as string,
			door_time: e.door_time as string | null,
			end_time: e.end_time as string | null,
			status: e.status as string,
			venue_id: e.venue_id as string | null,
			venue_name: (venueObj?.name as string) || null,
		};
	});

	const todaysEvent =
		normalizedWeekEvents.find((e) => e.date === today) || null;

	// Get shifts and colleagues if staff
	let shifts: Array<Record<string, unknown>> = [];
	let colleagues: Array<Record<string, unknown>> = [];

	if (staffRecord) {
		const { data: rawShifts } = await supabase
			.from("shifts")
			.select("*, events(id, name, date, door_time, end_time, status)")
			.eq("staff_id", staffRecord.id)
			.gte("end_time", new Date().toISOString())
			.order("start_time");

		shifts = normalizeShifts(
			(rawShifts as unknown as Array<Record<string, unknown>>) || [],
		);

		if (shifts.length > 0) {
			const eventIds = [...new Set(shifts.map((s) => s.event_id as string))];
			const { data: rawColleagues } = await supabase
				.from("shifts")
				.select(
					"*, events(name, date), staff(id, role, profiles(full_name, email))",
				)
				.in("event_id", eventIds)
				.neq("staff_id", staffRecord.id);

			colleagues = normalizeShifts(
				(rawColleagues as unknown as Array<Record<string, unknown>>) || [],
			);
		}
	}

	// Counts
	const { count: blockedCount } = await supabase
		.from("tasks")
		.select("*", { count: "exact", head: true })
		.eq("blocked", true)
		.eq("assignee_id", userId);

	const { count: pendingApprovalCount } = await supabase
		.from("tasks")
		.select("*", { count: "exact", head: true })
		.eq("status", "pending_approval");

	const { count: activeRentalsCount } = await supabase
		.from("rentals")
		.select("*", { count: "exact", head: true })
		.in("status", ["active", "overdue"]);

	const weekEnd = new Date();
	weekEnd.setDate(weekEnd.getDate() + 7);
	const weekEndStr = weekEnd.toISOString().split("T")[0];

	const { count: dueThisWeek } = await supabase
		.from("tasks")
		.select("*", { count: "exact", head: true })
		.gte("due_date", today)
		.lte("due_date", weekEndStr)
		.eq("assignee_id", userId);

	return NextResponse.json({
		profile,
		userRoles,
		staffRecord,
		tasks: normalizedTasks,
		overdueTasks,
		events: normalizedWeekEvents,
		todaysEvent,
		shifts,
		colleagues,
		blockedCount: blockedCount || 0,
		pendingApprovalCount: pendingApprovalCount || 0,
		activeRentalsCount: activeRentalsCount || 0,
		dueThisWeek: dueThisWeek || 0,
	});
}

// ===== Normalizers =====

function normalizeFirst(val: unknown): Record<string, unknown> | null {
	if (!val) return null;
	return Array.isArray(val)
		? (val[0] as Record<string, unknown>) || null
		: (val as Record<string, unknown>);
}

function normalizeShifts(
	raw: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
	return raw.map((s) => {
		const rawEvent = s.events as Record<string, unknown> | null;
		const eventObj = rawEvent ? normalizeFirst(rawEvent) : null;
		const rawStaff = s.staff as Record<string, unknown> | null;
		const staffObj = rawStaff ? normalizeFirst(rawStaff) : null;
		const rawProfiles = staffObj?.profiles as Record<string, unknown> | null;
		const profileObj = rawProfiles ? normalizeFirst(rawProfiles) : null;
		return {
			id: s.id as string,
			event_id: s.event_id as string,
			role: s.role as string,
			start_time: s.start_time as string,
			end_time: s.end_time as string,
			status: s.status as string,
			event: eventObj
				? {
						id: eventObj.id as string,
						name: eventObj.name as string,
						date: eventObj.date as string,
					}
				: null,
			staff: staffObj
				? {
						id: staffObj.id as string,
						role: staffObj.role as string,
						profiles: profileObj
							? {
									full_name: profileObj.full_name as string | null,
									email: profileObj.email as string | null,
								}
							: null,
					}
				: null,
		};
	});
}
