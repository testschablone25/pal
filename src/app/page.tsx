import { Suspense, cache } from "react";
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

// Cache admin client across dashboard re-renders (e.g. when streaming)
const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

// ── Page (Server Component) ───────────────────────────────────────────

export default async function DashboardPage() {
	// Use getSession() instead of getUser() to avoid an extraneous HTTP
	// call to the /user endpoint that can fail independently of the session.
	// The middleware has already validated the session before we get here,
	// and the server-client cookie store reflects any token refresh the
	// middleware may have done (via request.cookies.set()).
	//
	// getUser() failure → also clears local session → getSession() fails too
	// → renders "Nicht angemeldet" → user clicks login → middleware sees
	// session → redirects back → loop.  Using getSession() breaks this.
	let sessionUser: { id: string; email?: string | null } | null = null;
	try {
		const supabase = await createClient();
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (session?.user) {
			sessionUser = session.user;
		}
	} catch (err) {
		console.error("Dashboard: session check threw", err);
	}

	if (!sessionUser) {
		// Instead of redirecting (which creates a loop with middleware's
		// /login → / redirect), render a simple inline fallback.
		return (
			<div className="min-h-screen bg-zinc-950 flex items-center justify-center">
				<div className="text-center space-y-4">
					<p className="text-lg text-zinc-300">Nicht angemeldet</p>
					<p className="text-sm text-zinc-500">
						Bitte melde dich an, um fortzufahren.
					</p>
					<a
						href="/login?redirect=/"
						className="inline-block px-6 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
					>
						Anmelden
					</a>
				</div>
			</div>
		);
	}

	const user = sessionUser;

	const adminClient = getAdmin();
	const userId = user.id;

	// Single Date() to keep today/now/weekEnd consistent across queries
	const now = new Date();
	const today = now.toISOString().split("T")[0];
	const weekEnd = new Date(now);
	weekEnd.setDate(weekEnd.getDate() + 7);
	const weekEndStr = weekEnd.toISOString().split("T")[0];

	// Profile (try/catch to prevent redirect loop when profile is missing)
	let profile: Record<string, unknown> | null = null;
	try {
		const result = await adminClient
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.single();
		profile = result.data as Record<string, unknown> | null;
	} catch (err) {
		console.error("Dashboard: profile fetch error", err);
	}

	if (!profile) {
		// Instead of redirecting to /login (which would cause a redirect loop
		// via middleware → / → /login → /...), build a minimal profile from
		// the auth user so the dashboard can render a reasonable fallback.
		profile = {
			id: userId,
			email: user.email ?? "",
			full_name: user.email?.split("@")[0] ?? "User",
		} as unknown as DashboardData["profile"] & Record<string, unknown>;
	}

	// ── Phase 1: Fan out all independent queries ──────────────────
	// Was 9 queries (including 5 count:exact). Now 5 — counts are derived from data.
	const [roleResult, staffResult, tasksResult, eventsResult, rentalsResult] =
		await Promise.all([
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
			// Single rental query instead of two separate count:exact queries
			adminClient
				.from("rentals")
				.select("status", { count: "exact", head: true })
				.in("status", ["active", "overdue"]),
		]);

	const userRoles = (roleResult.data?.map(
		(r: { role: string }) => r.role as AppRole,
	) || []) as AppRole[];
	const staffRecord = staffResult.data || null;

	// ── Derive counts from data we already fetched ────────────────
	// Was 5 separate count:exact queries. Now 0 — all derived from task/rental data.
	const rawTasks = (tasksResult.data as unknown as Array<NormalizedRow>) || [];
	const taskList = rawTasks.map(normalizeTask);

	const blockedCount = taskList.filter((t) => t.blocked).length;
	const pendingApprovalCount = taskList.filter(
		(t) => t.status === "pending_approval",
	).length;
	const dueThisWeek = taskList.filter(
		(t) => t.due_date && t.due_date >= today && t.due_date <= weekEndStr,
	).length;

	const overdueTasks = taskList.filter(
		(t) =>
			t.due_date &&
			t.due_date < today &&
			!["done", "cancelled"].includes(t.status),
	);

	// Derive rental counts from single query
	const rawRentals = (rentalsResult.data as { status: string }[]) || [];
	const activeRentalsCount = rawRentals.filter(
		(r) => r.status === "active",
	).length;
	const overdueRentalsCount = rawRentals.filter(
		(r) => r.status === "overdue",
	).length;

	// Normalize events
	const rawWeekEvents =
		(eventsResult.data as unknown as Array<NormalizedRow>) || [];
	const normalizedWeekEvents = rawWeekEvents.map(normalizeEvent);
	const todaysEvent =
		normalizedWeekEvents.find((e) => e.date === today) || null;

	// ── Phase 2: Shifts + Colleagues ──────────────────────────────
	// Sequential (colleagues depends on shift eventIds), but capped at 20.
	let shifts: Array<NormalizedRow> = [];
	let colleagues: Array<NormalizedRow> = [];
	const nowISO = now.toISOString();

	if (staffRecord) {
		const { data: rawShifts } = await adminClient
			.from("shifts")
			.select("*, events(id, name, date, door_time, end_time, status)")
			.eq("staff_id", staffRecord.id)
			.gte("end_time", nowISO)
			.order("start_time")
			.limit(20);

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
		profile: profile as unknown as DashboardData["profile"],
		userRoles,
		staffRecord: staffRecord as DashboardData["staffRecord"],
		tasks: taskList as DashboardData["tasks"],
		overdueTasks: overdueTasks as DashboardData["overdueTasks"],
		events: normalizedWeekEvents as DashboardData["events"],
		todaysEvent: todaysEvent as DashboardData["todaysEvent"],
		shifts: shifts as unknown as DashboardData["shifts"],
		colleagues: colleagues as unknown as DashboardData["colleagues"],
		blockedCount,
		pendingApprovalCount,
		activeRentalsCount,
		dueThisWeek,
		overdueRentalsCount,
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
