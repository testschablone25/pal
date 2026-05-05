"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { DashboardTaskRow } from "@/components/dashboard/dashboard-task-row";
import { DashboardQuickAction } from "@/components/dashboard/dashboard-quick-action";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardShifts } from "@/components/dashboard/dashboard-shifts";
import { DashboardEvents } from "@/components/dashboard/dashboard-events";
import { canAccessRoute, hasRole, type AppRole } from "@/lib/permissions";
import {
	ClipboardList,
	CheckCircle2,
	AlertTriangle,
	User,
	Calendar,
	Clock,
	Users,
	Settings,
	Zap,
	ArrowLeftRight,
	ArrowRight,
} from "lucide-react";
import Link from "next/link";

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
	const [overdueRentalsCount, setOverdueRentalsCount] = useState(0);

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

			// Fetch overdue rentals count
			try {
				const rentalsResp = await fetch("/api/rentals?status=overdue&limit=1");
				if (rentalsResp.ok) {
					const rentalsData = await rentalsResp.json();
					setOverdueRentalsCount(rentalsData.total || 0);
				}
			} catch {
				// Non-critical
			}
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
	const unassignedTasks = tasks.filter((t) => !t.event?.date && !t.due_date);

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
				<div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
				<div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/[0.03] rounded-full blur-3xl" />
			</div>

			<div className="relative max-w-7xl mx-auto p-6 space-y-6">
				{/* ===== HERO GREETING ===== */}
				<DashboardHero
					profile={profile}
					todaysEvent={todaysEvent}
					userRoles={userRoles}
					canAccessAdmin={canAccessAdmin}
					onSignOut={handleSignOut}
					getInitials={getInitials}
				/>

				{/* ===== OVERDUE RENTALS STRIP ===== */}
				{overdueRentalsCount > 0 && (
					<Link href="/rentals?status=overdue">
						<div className="rounded-lg bg-amber-950/20 backdrop-blur-sm border border-amber-800/30 p-4 flex items-center gap-3 hover:bg-amber-950/30 transition-colors cursor-pointer">
							<AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
							<div>
								<p className="text-sm font-semibold text-amber-300">
									{overdueRentalsCount} überfällige{" "}
									{overdueRentalsCount === 1 ? "Verleih" : "Verleihe"}
								</p>
								<p className="text-xs text-amber-400/70">
									Ausgeliehene Artikel sind überfällig — bitte Rückgabe prüfen
								</p>
							</div>
							<ArrowRight className="h-4 w-4 text-amber-400/50 ml-auto shrink-0" />
						</div>
					</Link>
				)}

				{/* ===== STAT STRIP ===== */}
				<DashboardStats
					blockedCount={blockedCount}
					pendingApprovalCount={pendingApprovalCount}
					dueThisWeek={dueThisWeek}
					activeRentalsCount={activeRentalsCount}
					canApproveTasks={canApproveTasks}
					userRoles={userRoles}
				/>

				{/* ===== MAIN GRID ===== */}
				<div className="grid lg:grid-cols-5 gap-6">
					{/* ===== LEFT: TASKS (3/5) ===== */}
					<div className="lg:col-span-3 space-y-4">
						{/* Tasks header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-1.5 bg-violet-600/20 rounded-md">
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
							<div className="rounded-lg bg-red-950/20 backdrop-blur-sm border border-red-800/30 p-4">
								<div className="flex items-center gap-2 mb-3">
									<AlertTriangle className="h-4 w-4 text-red-400" />
									<h3 className="text-sm font-semibold text-red-400">
										Überfällig ({overdueTasks.length})
									</h3>
								</div>
								<div className="space-y-1.5">
									{overdueTasks.map((task) => (
										<DashboardTaskRow
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
							<div className="rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 p-4">
								<div className="flex items-center gap-2 mb-3">
									<div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
									<h3 className="text-sm font-semibold text-violet-400">
										Heute ({todayTasks.length})
									</h3>
								</div>
								<div className="space-y-1.5">
									{todayTasks.map((task) => (
										<DashboardTaskRow
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
							<div className="rounded-lg bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60 p-4">
								<h3 className="text-sm font-medium text-zinc-400 mb-3">
									Diese Woche ({weekTasks.length})
								</h3>
								<div className="space-y-1.5">
									{weekTasks.slice(0, 5).map((task) => (
										<DashboardTaskRow
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
							<div className="rounded-lg bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 p-4">
								<h3 className="text-sm font-medium text-zinc-500 mb-3">
									Ohne Datum ({unassignedTasks.length})
								</h3>
								<div className="space-y-1.5">
									{unassignedTasks.slice(0, 4).map((task) => (
										<DashboardTaskRow
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
							<div className="rounded-lg bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60 p-8 text-center">
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
						<DashboardShifts
							staffRecord={staffRecord}
							todayShifts={todayShifts}
							upcomingShifts={upcomingShifts}
							colleagues={colleagues}
							userRoles={userRoles}
							getInitials={getInitials}
						/>

						<DashboardEvents
							upcomingEvents={upcomingEvents}
							userRoles={userRoles}
							today={today}
						/>
					</div>
				</div>

				{/* ===== QUICK ACTIONS — role-specific ===== */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-1">
						<span>Schnellzugriff</span>
						<div className="h-px flex-1 bg-zinc-800" />
					</div>
					<div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
						{(hasRole(userRoles, "staff") || hasRole(userRoles, "gastro")) && (
							<DashboardQuickAction
								href="/staff/availability?view=me"
								icon={Clock}
								label="Meine Schichten"
								accent="emerald"
							/>
						)}
						{hasRole(userRoles, "staff") && (
							<DashboardQuickAction
								href="/workflow?my_tasks=true"
								icon={CheckCircle2}
								label="Meine Tasks"
								accent="emerald"
							/>
						)}
						{(hasRole(userRoles, "tech") ||
							hasRole(userRoles, "tech-lead")) && (
							<DashboardQuickAction
								href="/inventory"
								icon={Zap}
								label="Equipment"
							/>
						)}
						{(hasRole(userRoles, "tech") ||
							hasRole(userRoles, "tech-lead")) && (
							<DashboardQuickAction href="/artists" icon={User} label="Rider" />
						)}
						{hasRole(userRoles, "tech-lead") && (
							<DashboardQuickAction
								href="/rentals"
								icon={ArrowLeftRight}
								label="Verleih"
							/>
						)}
						{hasRole(userRoles, "gastro") && (
							<DashboardQuickAction
								href="/inventory?category=bar"
								icon={Zap}
								label="Bar-Bestand"
								accent="orange"
							/>
						)}
						{(hasRole(userRoles, "awareness") ||
							hasRole(userRoles, "night-management")) && (
							<>
								<DashboardQuickAction
									href="/door"
									icon={Users}
									label="Einlass"
									accent="indigo"
								/>
								<DashboardQuickAction
									href="/guest-lists"
									icon={ClipboardList}
									label="Gästelisten"
									accent="indigo"
								/>
							</>
						)}
						{(hasRole(userRoles, "booking") || hasRole(userRoles, "label")) && (
							<>
								<DashboardQuickAction
									href="/artists/new"
									icon={User}
									label="Neuer Künstler"
									accent="violet"
								/>
								<DashboardQuickAction
									href="/guest-lists"
									icon={ClipboardList}
									label="Gästelisten"
									accent="violet"
								/>
							</>
						)}
						{hasRole(userRoles, "social-media") && (
							<>
								<DashboardQuickAction
									href="/events"
									icon={Calendar}
									label="Events"
									accent="pink"
								/>
								<DashboardQuickAction
									href="/guest-lists"
									icon={ClipboardList}
									label="Gästelisten"
									accent="pink"
								/>
							</>
						)}
						{(hasRole(userRoles, "backoffice") ||
							hasRole(userRoles, "admin")) && (
							<>
								<DashboardQuickAction
									href="/workflow?needs_approval=true"
									icon={CheckCircle2}
									label="Genehmigungen"
									accent="teal"
								/>
								<DashboardQuickAction
									href="/staff"
									icon={Users}
									label="Schichtplan"
									accent="teal"
								/>
							</>
						)}
						{hasRole(userRoles, "admin") && (
							<DashboardQuickAction
								href="/admin"
								icon={Settings}
								label="Admin"
								accent="red"
							/>
						)}
					</div>
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
