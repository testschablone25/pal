"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import {
	formatDateFull,
	formatDateShort,
	formatTime,
	isDateToday,
} from "@/lib/dates";
import { cn, statusBadgeClass } from "@/lib/utils";
import { canAccessRoute, getRoleBadges, type AppRole } from "@/lib/permissions";
import {
	User,
	Calendar,
	ClipboardList,
	Users,
	Clock,
	ChevronRight,
	LogOut,
	LayoutDashboard,
	CheckCircle2,
	Settings,
	ArrowLeftRight,
	AlertTriangle,
	Sparkles,
	PartyPopper,
	TrendingUp,
	Zap,
	ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { parseISO } from "date-fns";

// ===== Types =====

interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
}

interface Task {
	id: string;
	title: string;
	status: string;
	priority: string;
	due_date: string | null;
	scheduled_date: string | null;
	blocked: boolean;
	event_id: string | null;
	event: {
		id: string | null;
		name: string | null;
		date: string | null;
		venue_id: string | null;
		venue_name: string | null;
	} | null;
}

interface DashboardEvent {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
	status: string;
	venue_id: string | null;
	venue_name: string | null;
}

interface Shift {
	id: string;
	event_id: string;
	role: string;
	start_time: string;
	end_time: string;
	status: string;
	event: { id: string; name: string; date: string } | null;
	staff: {
		id: string;
		role: string;
		profiles: { full_name: string | null; email: string | null } | null;
	} | null;
}

interface StaffRecord {
	id: string;
	profile_id: string | null;
	role: string;
}

// ===== Priority / Status helpers =====

const PRIORITY_DOT: Record<string, string> = {
	urgent: "bg-red-500 animate-pulse",
	high: "bg-orange-500",
	medium: "bg-blue-500",
	low: "bg-zinc-500",
};

const PRIORITY_LABEL: Record<string, string> = {
	urgent: "Dringend",
	high: "Hoch",
	medium: "Mittel",
	low: "Niedrig",
};

const PRIORITY_BG: Record<string, string> = {
	urgent: "bg-red-600",
	high: "bg-orange-600",
	medium: "bg-blue-600",
	low: "bg-zinc-600",
};

// ===== Dashboard Page =====

export default function DashboardPage() {
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [userRoles, setUserRoles] = useState<AppRole[]>([]);
	const [staffRecord, setStaffRecord] = useState<StaffRecord | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
	const [events, setEvents] = useState<DashboardEvent[]>([]);
	const [todaysEvent, setTodaysEvent] = useState<DashboardEvent | null>(null);
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [colleagues, setColleagues] = useState<Shift[]>([]);
	const [blockedCount, setBlockedCount] = useState(0);
	const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
	const [activeRentalsCount, setActiveRentalsCount] = useState(0);
	const [dueThisWeek, setDueThisWeek] = useState(0);

	// Task dialog state
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [taskDialogOpen, setTaskDialogOpen] = useState(false);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		setLoading(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				router.push("/login");
				return;
			}

			const response = await fetch(`/api/dashboard?user_id=${user.id}`);
			const data = await response.json();

			setProfile(data.profile || null);
			setUserRoles((data.userRoles || []) as AppRole[]);
			setStaffRecord(data.staffRecord || null);
			setTasks(data.tasks || []);
			setOverdueTasks(data.overdueTasks || []);
			setEvents(data.events || []);
			setTodaysEvent(data.todaysEvent || null);
			setShifts(data.shifts || []);
			setColleagues(data.colleagues || []);
			setBlockedCount(data.blockedCount || 0);
			setPendingApprovalCount(data.pendingApprovalCount || 0);
			setActiveRentalsCount(data.activeRentalsCount || 0);
			setDueThisWeek(data.dueThisWeek || 0);
		} catch (error) {
			console.error("Dashboard error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push("/login");
	};

	const handleTaskClick = (task: Task) => {
		setSelectedTask(
			task as Task & {
				description: string | null;
				parent_task_id: string | null;
				parent_task: { id: string; title: string; status: string } | null;
				created_at: string;
				updated_at: string;
				needs_approval: boolean;
				assignee_id: string | null;
				creator: {
					id: string;
					full_name: string | null;
					email: string | null;
				} | null;
				task_items: unknown[];
				subtasks: unknown[];
				comment_count: number;
			},
		);
		setTaskDialogOpen(true);
	};

	const handleTaskUpdated = () => {
		fetchDashboardData();
		setTaskDialogOpen(false);
	};

	const handleTaskDeleted = () => {
		fetchDashboardData();
		setTaskDialogOpen(false);
	};

	const getInitials = (name: string | null | undefined) => {
		if (!name) return "?";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const roleBadges = getRoleBadges(userRoles);
	const canAccessAdmin = canAccessRoute(userRoles, "/admin");
	const canApproveTasks = userRoles.some((r) =>
		["admin", "manager", "backoffice"].includes(r),
	);

	const today = new Date().toISOString().split("T")[0];
	const weekEnd = new Date();
	weekEnd.setDate(weekEnd.getDate() + 7);
	const weekEndStr = weekEnd.toISOString().split("T")[0];

	// Group tasks
	const overdueTaskIds = new Set(overdueTasks.map((t) => t.id));
	const todayTasks = tasks.filter((t) => t.event?.date === today);
	const weekTasks = tasks.filter(
		(t) =>
			t.event?.date &&
			t.event.date > today &&
			t.event.date <= weekEndStr &&
			!overdueTaskIds.has(t.id),
	);
	const laterTasks = tasks.filter(
		(t) =>
			!t.event?.date ||
			(t.event.date > weekEndStr && !overdueTaskIds.has(t.id)),
	);
	const unassignedTasks = tasks.filter((t) => !t.event?.date && !t.due_date);
	const withEventTasks = tasks.filter(
		(t) => t.event?.date && !overdueTaskIds.has(t.id),
	);

	const todayShifts = shifts.filter((s) => s.event?.date === today);
	const upcomingShifts = shifts.filter(
		(s) => s.event?.date && s.event.date > today,
	);

	const upcomingEvents = events.slice(0, 5);

	// ===== Render Loading =====
	if (loading) {
		return (
			<div className="min-h-screen bg-zinc-950">
				<div className="max-w-7xl mx-auto p-6 space-y-6">
					<Skeleton className="h-36 w-full rounded-2xl bg-zinc-900" />
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-28 rounded-xl bg-zinc-900" />
						))}
					</div>
					<div className="grid lg:grid-cols-5 gap-6">
						<Skeleton className="lg:col-span-3 h-96 rounded-xl bg-zinc-900" />
						<Skeleton className="lg:col-span-2 h-96 rounded-xl bg-zinc-900" />
					</div>
				</div>
			</div>
		);
	}

	// ===== Render Dashboard =====
	return (
		<div className="min-h-screen bg-zinc-950">
			{/* Gradient ambient background */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden">
				<div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
				<div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl" />
			</div>

			<div className="relative max-w-7xl mx-auto p-6 space-y-6">
				{/* ===== HERO GREETING ===== */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900 border border-zinc-800/80 shadow-2xl shadow-black/40">
					{/* Ambient glow for today's event */}
					{todaysEvent && (
						<div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-transparent" />
					)}

					<div className="relative p-8">
						<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
							{/* Left: Greeting */}
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<div className="p-2 bg-violet-600/20 rounded-lg">
										<Sparkles className="h-5 w-5 text-violet-400" />
									</div>
									<p className="text-sm text-zinc-500 font-medium tracking-wide uppercase">
										{formatDateFull(new Date().toISOString())}
									</p>
								</div>

								<h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">
									Moin,{" "}
									<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
										{profile?.full_name?.split(" ")[0] ||
											profile?.email?.split("@")[0]}
									</span>
									!
								</h1>

								{/* Today's event preview */}
								{todaysEvent ? (
									<div className="flex items-center gap-3 mt-4 p-3 bg-violet-600/10 border border-violet-600/20 rounded-xl">
										<div className="p-2 bg-violet-600/30 rounded-lg">
											<PartyPopper className="h-5 w-5 text-violet-400" />
										</div>
										<div>
											<p className="text-xs text-violet-400 font-medium uppercase tracking-wider">
												Heute Abend
											</p>
											<p className="text-white font-semibold text-lg">
												{todaysEvent.name}
											</p>
											<p className="text-xs text-zinc-400">
												{todaysEvent.door_time} —{" "}
												{todaysEvent.venue_name || "Venue"}{" "}
												{todaysEvent.venue_name ? "" : ""}
											</p>
										</div>
									</div>
								) : (
									<p className="text-zinc-400 mt-3 text-sm">
										Kein Event heute — genieße den freien Abend.
									</p>
								)}
							</div>

							{/* Right: Avatar + quick actions */}
							<div className="flex flex-col items-end gap-3 shrink-0">
								{/* Role badges compact */}
								<div className="flex items-center gap-2 flex-wrap justify-end">
									{roleBadges.slice(0, 3).map(({ role, label, color }) => (
										<Badge key={role} className={cn("text-xs", color)}>
											{label}
										</Badge>
									))}
								</div>

								<Avatar className="h-14 w-14 border-2 border-violet-600 ring-2 ring-violet-600/30 shadow-lg shadow-violet-600/20">
									<AvatarFallback className="bg-gradient-to-br from-violet-600 to-blue-600 text-white text-xl font-bold">
										{getInitials(profile?.full_name)}
									</AvatarFallback>
								</Avatar>

								<div className="flex items-center gap-2">
									{canAccessAdmin && (
										<Link href="/admin">
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
											>
												<Settings className="h-3.5 w-3.5 mr-1.5" />
												Admin
											</Button>
										</Link>
									)}
									<Button
										variant="ghost"
										size="sm"
										onClick={handleSignOut}
										className="text-zinc-500 hover:text-zinc-300"
									>
										<LogOut className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ===== STAT STRIP ===== */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					{blockedCount > 0 && (
						<Link href="/workflow?blocked=true">
							<div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/40 to-zinc-900 border border-red-800/40 p-4 hover:border-red-700/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-red-900/10">
								<div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl" />
								<div className="relative flex items-center gap-3">
									<div className="p-2.5 bg-red-600/20 rounded-lg shrink-0">
										<AlertTriangle className="h-5 w-5 text-red-400" />
									</div>
									<div>
										<p className="text-2xl font-bold text-white">
											{blockedCount}
										</p>
										<p className="text-xs text-red-400/80 font-medium">
											Blockiert
										</p>
									</div>
								</div>
							</div>
						</Link>
					)}

					{canApproveTasks && pendingApprovalCount > 0 && (
						<Link href="/workflow?needs_approval=true">
							<div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-900/40 to-zinc-900 border border-amber-800/40 p-4 hover:border-amber-700/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-amber-900/10">
								<div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl" />
								<div className="relative flex items-center gap-3">
									<div className="p-2.5 bg-amber-600/20 rounded-lg shrink-0">
										<Clock className="h-5 w-5 text-amber-400" />
									</div>
									<div>
										<p className="text-2xl font-bold text-white">
											{pendingApprovalCount}
										</p>
										<p className="text-xs text-amber-400/80 font-medium">
											Offene Genehmigungen
										</p>
									</div>
								</div>
							</div>
						</Link>
					)}

					{dueThisWeek > 0 && (
						<Link href="/workflow">
							<div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-900/40 to-zinc-900 border border-cyan-800/40 p-4 hover:border-cyan-700/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-cyan-900/10">
								<div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl" />
								<div className="relative flex items-center gap-3">
									<div className="p-2.5 bg-cyan-600/20 rounded-lg shrink-0">
										<TrendingUp className="h-5 w-5 text-cyan-400" />
									</div>
									<div>
										<p className="text-2xl font-bold text-white">
											{dueThisWeek}
										</p>
										<p className="text-xs text-cyan-400/80 font-medium">
											Fällig diese Woche
										</p>
									</div>
								</div>
							</div>
						</Link>
					)}

					{activeRentalsCount > 0 && (
						<Link href="/rentals">
							<div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900/40 to-zinc-900 border border-blue-800/40 p-4 hover:border-blue-700/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-blue-900/10">
								<div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
								<div className="relative flex items-center gap-3">
									<div className="p-2.5 bg-blue-600/20 rounded-lg shrink-0">
										<ArrowLeftRight className="h-5 w-5 text-blue-400" />
									</div>
									<div>
										<p className="text-2xl font-bold text-white">
											{activeRentalsCount}
										</p>
										<p className="text-xs text-blue-400/80 font-medium">
											Aktive Verleihe
										</p>
									</div>
								</div>
							</div>
						</Link>
					)}
				</div>

				{/* ===== MAIN GRID ===== */}
				<div className="grid lg:grid-cols-5 gap-6">
					{/* ===== LEFT: TASKS (3/5) ===== */}
					<div className="lg:col-span-3 space-y-4">
						{/* Tasks header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-1.5 bg-violet-600/20 rounded-lg">
									<ClipboardList className="h-4 w-4 text-violet-400" />
								</div>
								<h2 className="text-base font-semibold text-white tracking-wide">
									Meine Aufgaben
								</h2>
								{tasks.length > 0 && (
									<Badge className="bg-zinc-800 text-zinc-400 text-xs">
										{tasks.length}
									</Badge>
								)}
							</div>
							{canAccessRoute(userRoles, "/workflow") && (
								<Link href="/workflow">
									<Button
										variant="ghost"
										size="sm"
										className="text-zinc-500 hover:text-white text-xs"
									>
										Alle <ArrowRight className="h-3 w-3 ml-1" />
									</Button>
								</Link>
							)}
						</div>

						{/* Overdue section */}
						{overdueTasks.length > 0 && (
							<div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
								<div className="flex items-center gap-2 mb-3">
									<AlertTriangle className="h-4 w-4 text-red-400" />
									<h3 className="text-sm font-semibold text-red-400">
										Überfällig ({overdueTasks.length})
									</h3>
								</div>
								<div className="space-y-1.5">
									{overdueTasks.map((task) => (
										<TaskRow
											key={task.id}
											task={task}
											onClick={() => handleTaskClick(task)}
										/>
									))}
								</div>
							</div>
						)}

						{/* Today section */}
						{todayTasks.length > 0 && (
							<div className="rounded-xl border border-violet-800/30 bg-zinc-900/80 p-4">
								<div className="flex items-center gap-2 mb-3">
									<div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
									<h3 className="text-sm font-semibold text-violet-400">
										Heute ({todayTasks.length})
									</h3>
								</div>
								<div className="space-y-1.5">
									{todayTasks.map((task) => (
										<TaskRow
											key={task.id}
											task={task}
											onClick={() => handleTaskClick(task)}
										/>
									))}
								</div>
							</div>
						)}

						{/* Week section */}
						{weekTasks.length > 0 && (
							<div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
								<h3 className="text-sm font-medium text-zinc-400 mb-3">
									Diese Woche ({weekTasks.length})
								</h3>
								<div className="space-y-1.5">
									{weekTasks.slice(0, 5).map((task) => (
										<TaskRow
											key={task.id}
											task={task}
											onClick={() => handleTaskClick(task)}
											muted
										/>
									))}
									{weekTasks.length > 5 && (
										<p className="text-xs text-zinc-600 text-center py-1">
											+{weekTasks.length - 5} weitere
										</p>
									)}
								</div>
							</div>
						)}

						{/* Later / unassigned */}
						{unassignedTasks.length > 0 && (
							<div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-4">
								<h3 className="text-sm font-medium text-zinc-500 mb-3">
									Ohne Datum ({unassignedTasks.length})
								</h3>
								<div className="space-y-1.5">
									{unassignedTasks.slice(0, 4).map((task) => (
										<TaskRow
											key={task.id}
											task={task}
											onClick={() => handleTaskClick(task)}
											muted
										/>
									))}
								</div>
							</div>
						)}

						{/* Empty state */}
						{tasks.length === 0 && (
							<div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center">
								<div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
									<CheckCircle2 className="h-6 w-6 text-green-400" />
								</div>
								<p className="text-zinc-300 font-medium">Alles erledigt!</p>
								<p className="text-zinc-500 text-sm mt-1">
									Du hast keine offenen Aufgaben.
								</p>
							</div>
						)}
					</div>

					{/* ===== RIGHT: (2/5) ===== */}
					<div className="lg:col-span-2 space-y-4">
						{/* Today's Shift */}
						<div className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
							<div className="px-4 pt-4 pb-3 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-emerald-600/20 rounded-lg">
										<Clock className="h-4 w-4 text-emerald-400" />
									</div>
									<h2 className="text-sm font-semibold text-white">
										Schichtplan
									</h2>
								</div>
								<div className="flex items-center gap-2">
									{staffRecord &&
										canAccessRoute(userRoles, "/staff/availability") && (
											<Link href="/staff/availability?view=me">
												<Button
													size="sm"
													className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs h-6 px-2"
												>
													Verfügbarkeit
												</Button>
											</Link>
										)}
								</div>
							</div>

							<div className="px-4 pb-4 space-y-2">
								{!staffRecord ? (
									<p className="text-xs text-zinc-500 py-2">
										Kein Staff-Profil verknüpft.
									</p>
								) : todayShifts.length === 0 && upcomingShifts.length === 0 ? (
									<p className="text-xs text-zinc-500 py-2">
										Keine anstehenden Schichten.
									</p>
								) : (
									<>
										{todayShifts.map((shift) => (
											<div
												key={shift.id}
												className="p-3 bg-gradient-to-r from-emerald-600/10 to-transparent border border-emerald-700/20 rounded-lg"
											>
												<div className="flex items-center justify-between mb-1">
													<span className="text-sm font-semibold text-white">
														{shift.event?.name}
													</span>
													<Badge className="bg-emerald-600/30 text-emerald-300 text-xs border-0">
														{shift.role}
													</Badge>
												</div>
												<div className="flex items-center gap-1.5 text-xs text-zinc-400">
													<Clock className="h-3 w-3" />
													<span>
														{formatTime(shift.start_time)} —{" "}
														{formatTime(shift.end_time)}
													</span>
												</div>
											</div>
										))}

										{upcomingShifts.slice(0, 2).map((shift) => (
											<div
												key={shift.id}
												className="p-2.5 bg-zinc-800/40 rounded-lg"
											>
												<div className="flex items-center justify-between">
													<div>
														<p className="text-sm text-zinc-200">
															{shift.event?.name}
														</p>
														<p className="text-xs text-zinc-500">
															{formatDateShort(shift.event?.date || "")}
														</p>
													</div>
													<Badge
														variant="outline"
														className="text-xs border-zinc-700 text-zinc-400"
													>
														{shift.role}
													</Badge>
												</div>
											</div>
										))}
									</>
								)}
							</div>
						</div>

						{/* Events Calendar Strip */}
						<div className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
							<div className="px-4 pt-4 pb-3 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-violet-600/20 rounded-lg">
										<Calendar className="h-4 w-4 text-violet-400" />
									</div>
									<h2 className="text-sm font-semibold text-white">Events</h2>
								</div>
								{canAccessRoute(userRoles, "/events") && (
									<Link href="/events">
										<Button
											variant="ghost"
											size="sm"
											className="text-zinc-500 hover:text-white text-xs"
										>
											Alle <ArrowRight className="h-3 w-3 ml-1" />
										</Button>
									</Link>
								)}
							</div>

							<div className="px-4 pb-4">
								{upcomingEvents.length === 0 ? (
									<p className="text-xs text-zinc-500 py-2">
										Keine Events diese Woche.
									</p>
								) : (
									<div className="space-y-1.5">
										{upcomingEvents.map((event) => {
											const isToday = event.date === today;
											const eventDate = parseISO(event.date);
											return (
												<Link key={event.id} href={`/events/${event.id}`}>
													<div
														className={cn(
															"flex items-center gap-3 p-2.5 rounded-lg transition-all hover:scale-[1.01] cursor-pointer",
															isToday
																? "bg-violet-600/15 border border-violet-600/25"
																: "hover:bg-zinc-800/50",
														)}
													>
														<div
															className={cn(
																"text-center min-w-[38px] shrink-0",
																isToday ? "text-violet-400" : "text-zinc-400",
															)}
														>
															<div className="text-xl font-bold leading-none">
																{eventDate.getDate()}
															</div>
															<div className="text-[10px] uppercase mt-0.5 tracking-wider">
																{eventDate.toLocaleString("de", {
																	month: "short",
																})}
															</div>
														</div>
														<div className="flex-1 min-w-0">
															<p
																className={cn(
																	"text-sm font-medium truncate",
																	isToday ? "text-white" : "text-zinc-200",
																)}
															>
																{event.name}
															</p>
															<p className="text-xs text-zinc-500 truncate">
																{event.door_time} ·{" "}
																{event.venue_name || "Venue"}
															</p>
														</div>
														{isToday && (
															<Badge className="bg-violet-600 text-xs shrink-0">
																Heute
															</Badge>
														)}
													</div>
												</Link>
											);
										})}
									</div>
								)}
							</div>
						</div>

						{/* Colleagues */}
						<div className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
							<div className="px-4 pt-4 pb-3 flex items-center gap-2">
								<div className="p-1.5 bg-zinc-700/50 rounded-lg">
									<Users className="h-4 w-4 text-zinc-400" />
								</div>
								<h2 className="text-sm font-semibold text-white">Team</h2>
								{colleagues.length > 0 && (
									<Badge className="bg-zinc-800 text-zinc-400 text-xs">
										{colleagues.length}
									</Badge>
								)}
							</div>

							<div className="px-4 pb-4">
								{colleagues.length === 0 ? (
									<p className="text-xs text-zinc-500 py-2">
										Keine Kollegen in deinen Schichten.
									</p>
								) : (
									<div className="space-y-2">
										{[
											...new Map(
												colleagues.map((c) => [c.staff?.id, c]),
											).values(),
										]
											.slice(0, 6)
											.map((colleague) => {
												const name =
													colleague.staff?.profiles?.full_name ||
													colleague.staff?.profiles?.email?.split("@")[0] ||
													"Unknown";
												return (
													<div
														key={colleague.id}
														className="flex items-center gap-2.5 p-2 bg-zinc-800/40 rounded-lg"
													>
														<Avatar className="h-7 w-7">
															<AvatarFallback className="text-xs bg-zinc-700 text-zinc-300">
																{getInitials(name)}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 min-w-0">
															<p className="text-sm text-zinc-200 truncate">
																{name}
															</p>
														</div>
														<Badge
															variant="outline"
															className="text-xs border-zinc-700 text-zinc-400 shrink-0"
														>
															{colleague.staff?.role}
														</Badge>
													</div>
												);
											})}
										{colleagues.length > 6 && (
											<p className="text-xs text-zinc-600 text-center py-1">
												+{colleagues.length - 6} weitere
											</p>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* ===== QUICK ACTIONS ===== */}
				<div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
					{canAccessRoute(userRoles, "/door") && (
						<QuickAction href="/door" icon={Users} label="Tür" />
					)}
					{canAccessRoute(userRoles, "/events/new") && (
						<QuickAction
							href="/events/new"
							icon={Calendar}
							label="Event"
							accent="violet"
						/>
					)}
					{canAccessRoute(userRoles, "/workflow") && (
						<QuickAction
							href="/workflow"
							icon={ClipboardList}
							label="Aufgaben"
						/>
					)}
					{canAccessRoute(userRoles, "/inventory") && (
						<QuickAction href="/inventory" icon={Zap} label="Inventar" />
					)}
					{canAccessRoute(userRoles, "/venues") && (
						<QuickAction href="/venues" icon={LayoutDashboard} label="Venues" />
					)}
					{canAccessRoute(userRoles, "/rentals") && (
						<QuickAction
							href="/rentals"
							icon={ArrowLeftRight}
							label="Verleih"
						/>
					)}
					{canAccessRoute(userRoles, "/artists/new") && (
						<QuickAction href="/artists/new" icon={User} label="Künstler" />
					)}
					{canAccessRoute(userRoles, "/staff") && (
						<QuickAction href="/staff" icon={Users} label="Staff" />
					)}
				</div>
			</div>

			{/* Task Detail Dialog */}
			<TaskDetailDialog
				task={selectedTask as Parameters<typeof TaskDetailDialog>[0]["task"]}
				open={taskDialogOpen}
				onOpenChange={setTaskDialogOpen}
				onTaskUpdated={handleTaskUpdated}
				onTaskDeleted={handleTaskDeleted}
			/>
		</div>
	);
}

// ===== Task Row =====

interface TaskRowProps {
	task: Task;
	onClick: () => void;
	muted?: boolean;
}

function TaskRow({ task, onClick, muted }: TaskRowProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all",
				"hover:bg-zinc-800/60 group",
				muted ? "opacity-80" : "",
			)}
		>
			{/* Status dot */}
			<div
				className={cn(
					"h-1.5 w-1.5 rounded-full shrink-0 transition-all",
					task.status === "done"
						? "bg-green-500"
						: task.status === "in_progress"
							? "bg-blue-500 animate-pulse"
							: "bg-zinc-600",
				)}
			/>

			{/* Priority dot */}
			<div
				className={cn(
					"h-1.5 w-1.5 rounded-full shrink-0",
					PRIORITY_DOT[task.priority] || PRIORITY_DOT.low,
				)}
			/>

			{/* Title */}
			<span
				className={cn(
					"flex-1 text-sm truncate transition-colors",
					muted
						? "text-zinc-400 group-hover:text-zinc-300"
						: "text-zinc-200 group-hover:text-white",
				)}
			>
				{task.title}
			</span>

			{/* Event + date */}
			<div className="flex items-center gap-2 shrink-0">
				{task.event?.name && (
					<span className="text-xs text-zinc-600 truncate max-w-[80px] hidden sm:block">
						{task.event.name}
					</span>
				)}
				{task.due_date && (
					<Badge
						variant="outline"
						className={cn(
							"text-[10px] px-1.5 py-0 border-zinc-700",
							task.due_date < new Date().toISOString().split("T")[0] &&
								!["done", "cancelled"].includes(task.status)
								? "border-red-700 text-red-400"
								: "text-zinc-500",
						)}
					>
						{formatDateShort(task.due_date)}
					</Badge>
				)}
				{!task.due_date && !task.event?.name && (
					<Badge
						variant="outline"
						className="text-[10px] px-1.5 py-0 border-zinc-800 text-zinc-600"
					>
						—
					</Badge>
				)}
				<ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all -translate-x-1 group-hover:translate-x-0" />
			</div>
		</button>
	);
}

// ===== Quick Action Card =====

function QuickAction({
	href,
	icon: Icon,
	label,
	accent,
}: {
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	accent?: "violet";
}) {
	return (
		<Link href={href}>
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl",
					"bg-zinc-900/60 border border-zinc-800/60",
					"hover:bg-zinc-800 hover:border-zinc-700/80",
					"transition-all hover:-translate-y-0.5 cursor-pointer",
					"group",
				)}
			>
				<div
					className={cn(
						"p-2 rounded-lg transition-colors",
						accent === "violet"
							? "bg-violet-600/20 text-violet-400 group-hover:bg-violet-600/30"
							: "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300 group-hover:bg-zinc-700",
					)}
				>
					<Icon className="h-4 w-4" />
				</div>
				<span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-medium truncate max-w-full">
					{label}
				</span>
			</div>
		</Link>
	);
}
