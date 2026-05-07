import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import {
	DashboardClient,
	DashboardSkeleton,
	type DashboardData,
} from "@/components/dashboard/dashboard-client";
import type { AppRole } from "@/lib/permissions";

// ── Types ─────────────────────────────────────────────────────────────

type NormalizedRow = Record<string, unknown>;

// ── Page (Server Component) ───────────────────────────────────────────

export default async function DashboardPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const adminClient = createAdminClient(
		supabaseConfig.url,
		supabaseConfig.serviceKey,
		{
			auth: { autoRefreshToken: false, persistSession: false },
		},
	);

	const userId = user.id;
	const today = new Date().toISOString().split("T")[0];

	// Profile
	const { data: profile } = await adminClient
		.from("profiles")
		.select("*")
		.eq("id", userId)
		.single();

	if (!profile) {
		redirect("/login");
	}

	// Fan out independent queries
	const weekEnd = new Date();
	weekEnd.setDate(weekEnd.getDate() + 7);
	const weekEndStr = weekEnd.toISOString().split("T")[0];

	const [
		roleResult,
		staffResult,
		tasksResult,
		eventsResult,
		blockedResult,
		pendingApprovalResult,
		activeRentalsResult,
		dueThisWeekResult,
		overdueRentalsResult,
	] = await Promise.all([
		adminClient.from("user_roles").select("role").eq("user_id", userId),
		adminClient.from("staff").select("*").eq("profile_id", userId).single(),
		adminClient
			.from("tasks")
			.select(
				"id, title, status, priority, due_date, scheduled_date, blocked, events(id, name, date, venue_id, venues(name))",
			)
			.eq("assignee_id", userId)
			.in("status", ["todo", "in_progress", "pending_approval"])
			.order("priority", { ascending: false })
			.limit(50),
		adminClient
			.from("events")
			.select(
				"id, name, date, door_time, end_time, status, venue_id, venues(name)",
			)
			.gte("date", today)
			.eq("status", "published")
			.order("date", { ascending: true })
			.limit(10),
		adminClient
			.from("tasks")
			.select("*", { count: "exact", head: true })
			.eq("blocked", true)
			.eq("assignee_id", userId),
		adminClient
			.from("tasks")
			.select("*", { count: "exact", head: true })
			.eq("status", "pending_approval"),
		adminClient
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.in("status", ["active", "overdue"]),
		adminClient
			.from("tasks")
			.select("*", { count: "exact", head: true })
			.gte("due_date", today)
			.lte("due_date", weekEndStr)
			.eq("assignee_id", userId),
		adminClient
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("status", "overdue"),
	]);

	const userRoles = (roleResult.data?.map(
		(r: { role: string }) => r.role as AppRole,
	) || []) as AppRole[];
	const staffRecord = staffResult.data || null;

	// Normalize tasks
	const rawTasks = (tasksResult.data as unknown as Array<NormalizedRow>) || [];
	const normalizedTasks = rawTasks.map(normalizeTask);
	const overdueTasks = normalizedTasks.filter(
		(t) =>
			t.due_date &&
			t.due_date < today &&
			!["done", "cancelled"].includes(t.status),
	);

	// Normalize events
	const rawWeekEvents =
		(eventsResult.data as unknown as Array<NormalizedRow>) || [];
	const normalizedWeekEvents = rawWeekEvents.map(normalizeEvent);
	const todaysEvent =
		normalizedWeekEvents.find((e) => e.date === today) || null;

	// Shifts & colleagues
	let shifts: Array<NormalizedRow> = [];
	let colleagues: Array<NormalizedRow> = [];

	if (staffRecord) {
		const { data: rawShifts } = await adminClient
			.from("shifts")
			.select("*, events(id, name, date, door_time, end_time, status)")
			.eq("staff_id", staffRecord.id)
			.gte("end_time", new Date().toISOString())
			.order("start_time");

		shifts = normalizeShifts(
			(rawShifts as unknown as Array<NormalizedRow>) || [],
		);

		if (shifts.length > 0) {
			const eventIds = [...new Set(shifts.map((s) => s.event_id as string))];
			const { data: rawColleagues } = await adminClient
				.from("shifts")
				.select(
					"*, events(name, date), staff(id, role, profiles(full_name, email))",
				)
				.in("event_id", eventIds)
				.neq("staff_id", staffRecord.id);

			colleagues = normalizeShifts(
				(rawColleagues as unknown as Array<NormalizedRow>) || [],
			);
		}
	}

	const data: DashboardData = {
		profile: profile as DashboardData["profile"],
		userRoles,
		staffRecord: staffRecord as DashboardData["staffRecord"],
		tasks: normalizedTasks as DashboardData["tasks"],
		overdueTasks: overdueTasks as DashboardData["overdueTasks"],
		events: normalizedWeekEvents as DashboardData["events"],
		todaysEvent: todaysEvent as DashboardData["todaysEvent"],
		shifts: shifts as unknown as DashboardData["shifts"],
		colleagues: colleagues as unknown as DashboardData["colleagues"],
		blockedCount: blockedResult.count || 0,
		pendingApprovalCount: pendingApprovalResult.count || 0,
		activeRentalsCount: activeRentalsResult.count || 0,
		dueThisWeek: dueThisWeekResult.count || 0,
		overdueRentalsCount: overdueRentalsResult.count || 0,
	};

	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardClient data={data} />
		</Suspense>
	);
}

// ── Normalizers ───────────────────────────────────────────────────────

function normalizeFirst(val: unknown): NormalizedRow | null {
	if (!val) return null;
	return Array.isArray(val)
		? (val[0] as NormalizedRow) || null
		: (val as NormalizedRow);
}

function normalizeTask(t: NormalizedRow) {
	const rawEvent = t.events as NormalizedRow | null;
	const eventObj = rawEvent ? normalizeFirst(rawEvent) : null;
	const venueObj = eventObj?.venues
		? normalizeFirst(eventObj.venues as NormalizedRow)
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
}

function normalizeEvent(e: NormalizedRow) {
	const venueObj = e.venues ? normalizeFirst(e.venues as NormalizedRow) : null;
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
}

function normalizeShifts(raw: Array<NormalizedRow>): Array<NormalizedRow> {
	return raw.map((s) => {
		const rawEvent = s.events as NormalizedRow | null;
		const eventObj = rawEvent ? normalizeFirst(rawEvent) : null;
		const rawStaff = s.staff as NormalizedRow | null;
		const staffObj = rawStaff ? normalizeFirst(rawStaff) : null;
		const rawProfiles = staffObj?.profiles as NormalizedRow | null;
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
