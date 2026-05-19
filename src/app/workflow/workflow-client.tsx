"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type Task } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
	Plus,
	Search,
	Kanban,
	X,
	ChevronDown,
	ArrowUpDown,
	Building2,
	Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────

export interface WorkflowInitialData {
	currentUserId: string;
	tasks: Task[];
	events: Array<{ id: string; name: string; venue_id: string | null }>;
	profiles: Array<{
		id: string;
		full_name: string | null;
		email: string | null;
	}>;
	venues: Array<{ id: string; name: string }>;
}

interface Column {
	id: string;
	status: Task["status"];
}

const COLUMNS: Column[] = [
	{ id: "todo", status: "todo" },
	{ id: "in_progress", status: "in_progress" },
	{ id: "pending_approval", status: "pending_approval" },
	{ id: "done", status: "done" },
	{ id: "cancelled", status: "cancelled" },
];

type SortField = "priority" | "due_date" | "venue" | null;

// ── Lazy board (dnd-kit is heavy, only loaded when needed) ────────────

const KanbanBoard = dynamic(
	() => import("./workflow-board").then((m) => ({ default: m.KanbanBoard })),
	{
		ssr: false,
		loading: () => (
			<div className="grid grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<Skeleton key={i} className="h-96 bg-zinc-800/60 rounded-lg" />
				))}
			</div>
		),
	},
);

// ── Client Component ──────────────────────────────────────────────────

export function WorkflowClient({
	initialData,
}: {
	initialData: WorkflowInitialData;
}) {
	const { t } = useI18n();
	const { toast } = useToast();

	// ── State initialised from server data ──────────────────────────
	const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
	const [events] = useState(initialData.events);
	const [profiles] = useState(initialData.profiles);
	const [venues] = useState(initialData.venues);
	const currentUserId = initialData.currentUserId;

	const [loading, setLoading] = useState(false);

	// Dialog state
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	// Filter state
	const [searchQuery, setSearchQuery] = useState("");
	const [filterPriority, setFilterPriority] = useState<string>("all");
	const [filterAssignee, setFilterAssignee] = useState<string>("all");
	const [filterEvent, setFilterEvent] = useState<string>("all");
	const [filterVenue, setFilterVenue] = useState<string>("all");
	const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
	const [filterBlocked, setFilterBlocked] = useState(false);
	const [filterNeedsApproval, setFilterNeedsApproval] = useState(false);

	const [sortField, setSortField] = useState<SortField>(null);
	const [groupByVenue, setGroupByVenue] = useState(false);
	const [showMobileFilters, setShowMobileFilters] = useState(false);

	// ── Re-fetch (after mutations or my-tasks toggle) ───────────────
	const refetchTasks = useCallback(async () => {
		setLoading(true);
		try {
			let url = "/api/tasks";
			if (showMyTasksOnly) url += `?my_tasks=true&user_id=${currentUserId}`;
			const response = await fetch(url);
			if (!response.ok) {
				console.error("Failed to fetch tasks:", await response.text());
				return;
			}
			const data = await response.json();
			setTasks(data.tasks || []);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setLoading(false);
		}
	}, [showMyTasksOnly, currentUserId]);

	// Re-fetch when my-tasks toggle changes (matches original useEffect pattern)
	useEffect(() => {
		refetchTasks();
	}, [refetchTasks]);

	// ── Filtering + sorting (all client-side, instant) ──────────────
	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			if (filterPriority !== "all" && task.priority !== filterPriority)
				return false;
			if (filterAssignee !== "all") {
				const isAssignee =
					task.assignee_id === filterAssignee ||
					task.assignees?.some((a) => a.id === filterAssignee);
				if (!isAssignee) return false;
			}
			if (filterEvent !== "all" && task.event_id !== filterEvent) return false;
			if (filterVenue !== "all") {
				const event = events.find((e) => e.id === task.event_id);
				if (!event) return false;
				return event.venue_id === filterVenue;
			}
			if (filterBlocked && !task.blocked) return false;
			if (filterNeedsApproval && !task.needs_approval) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				return (
					task.title.toLowerCase().includes(q) ||
					task.description?.toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [
		tasks,
		filterPriority,
		filterAssignee,
		filterEvent,
		filterVenue,
		searchQuery,
		filterBlocked,
		filterNeedsApproval,
		events,
	]);

	const sortedTasks = useMemo(() => {
		const copy = [...filteredTasks];
		if (!sortField) return copy;
		return copy.sort((a, b) => {
			switch (sortField) {
				case "priority": {
					const order = { urgent: 0, high: 1, medium: 2, low: 3 };
					return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
				}
				case "due_date": {
					if (!a.due_date && !b.due_date) return 0;
					if (!a.due_date) return 1;
					if (!b.due_date) return -1;
					return (
						new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
					);
				}
				case "venue": {
					const venueA =
						((a.event as Record<string, unknown>)?.name as string) || "";
					const venueB =
						((b.event as Record<string, unknown>)?.name as string) || "";
					return venueA.localeCompare(venueB);
				}
				default:
					return 0;
			}
		});
	}, [filteredTasks, sortField]);

	const tasksByStatus = useMemo(() => {
		const grouped: Record<string, Task[]> = {
			todo: [],
			in_progress: [],
			pending_approval: [],
			done: [],
			cancelled: [],
		};
		sortedTasks.forEach((task) => {
			if (grouped[task.status]) grouped[task.status].push(task);
		});
		return grouped;
	}, [sortedTasks]);

	const visibleColumns = useMemo(() => {
		const hasApprovalTasks = tasks.some((t) => t.needs_approval);
		return COLUMNS.filter((col) => {
			if (col.id === "pending_approval") return hasApprovalTasks;
			return true;
		});
	}, [tasks]);

	// ── Handlers ────────────────────────────────────────────────────
	const handleTaskClick = (task: Task) => {
		setSelectedTask(task);
		setIsDetailOpen(true);
	};

	const handleTaskUpdated = (updated: Task) => {
		setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
		setSelectedTask(updated);
	};

	const handleTaskDeleted = (taskId: string) => {
		setTasks((prev) => prev.filter((t) => t.id !== taskId));
		setSelectedTask(null);
	};

	const handleCreateTask = async (values: Record<string, unknown>) => {
		try {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || "Failed to create task");
			}
			const newTask = await response.json();
			setTasks((prev) => [newTask, ...prev]);
			setIsCreateOpen(false);
			toast({
				title: "Aufgabe erstellt",
				description: `${values.title || "Aufgabe"} wurde erfolgreich erstellt.`,
			});
		} catch (error) {
			console.error("Error creating task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Erstellen der Aufgabe.",
			});
			throw error;
		}
	};

	const handleCreateTaskWithFiles = async (
		values: Record<string, unknown>,
		files: File[],
	) => {
		try {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || "Failed to create task");
			}
			const newTask = await response.json();
			// Upload each pending file
			for (const file of files) {
				const formData = new FormData();
				formData.append("file", file);
				const upRes = await fetch(`/api/tasks/${newTask.id}/attachments`, {
					method: "POST",
					body: formData,
				});
				if (!upRes.ok) {
					const errData = await upRes.json().catch(() => ({}));
					console.error("Failed to upload attachment:", errData.error);
				}
			}
			setTasks((prev) => [newTask, ...prev]);
			setIsCreateOpen(false);
			toast({
				title: "Aufgabe erstellt",
				description: `${values.title || "Aufgabe"} mit ${files.length} Anhang/Anhängen erstellt.`,
			});
		} catch (error) {
			console.error("Error creating task with files:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Erstellen der Aufgabe.",
			});
			throw error;
		}
	};

	const clearFilters = () => {
		setFilterPriority("all");
		setFilterAssignee("all");
		setFilterEvent("all");
		setFilterVenue("all");
		setSearchQuery("");
		setFilterBlocked(false);
		setFilterNeedsApproval(false);
		setSortField(null);
		setGroupByVenue(false);
	};

	// ── Filter chips (for display) ──────────────────────────────────
	const activeFilters = useMemo(() => {
		const chips: Array<{
			label: string;
			active: boolean;
			onClear?: () => void;
		}> = [];
		if (filterPriority !== "all") {
			chips.push({
				label: `${t("field.priority")}: ${t(`priority.${filterPriority}`)}`,
				active: true,
				onClear: () => setFilterPriority("all"),
			});
		}
		if (filterAssignee !== "all") {
			const p = profiles.find((p) => p.id === filterAssignee);
			chips.push({
				label: `${t("field.assignee")}: ${p?.full_name || t("app.unknown")}`,
				active: true,
				onClear: () => setFilterAssignee("all"),
			});
		}
		if (filterEvent !== "all") {
			const e = events.find((e) => e.id === filterEvent);
			chips.push({
				label: `${t("field.event")}: ${e?.name || t("app.unknown")}`,
				active: true,
				onClear: () => setFilterEvent("all"),
			});
		}
		if (filterVenue !== "all") {
			const v = venues.find((v) => v.id === filterVenue);
			chips.push({
				label: `${t("field.venue")}: ${v?.name || t("app.unknown")}`,
				active: true,
				onClear: () => setFilterVenue("all"),
			});
		}
		if (showMyTasksOnly) {
			chips.push({
				label: t("action.my_tasks"),
				active: true,
				onClear: () => setShowMyTasksOnly(false),
			});
		}
		if (filterBlocked) {
			chips.push({
				label: t("action.blocked"),
				active: true,
				onClear: () => setFilterBlocked(false),
			});
		}
		if (filterNeedsApproval) {
			chips.push({
				label: t("action.needs_approval"),
				active: true,
				onClear: () => setFilterNeedsApproval(false),
			});
		}
		if (searchQuery) {
			chips.push({
				label: `${t("app.search")} "${searchQuery}"`,
				active: true,
				onClear: () => setSearchQuery(""),
			});
		}
		if (sortField) {
			chips.push({
				label: `${t("app.sort")}: ${t(`filter.sort_${sortField}`)}`,
				active: true,
				onClear: () => setSortField(null),
			});
		}
		if (groupByVenue) {
			chips.push({
				label: t("filter.group_by_venue"),
				active: true,
				onClear: () => setGroupByVenue(false),
			});
		}
		return chips;
	}, [
		filterPriority,
		filterAssignee,
		filterEvent,
		filterVenue,
		showMyTasksOnly,
		filterBlocked,
		filterNeedsApproval,
		searchQuery,
		sortField,
		groupByVenue,
		profiles,
		events,
		venues,
		t,
	]);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
						<Kanban className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-400" />
						{t("app.title")}
					</h1>
					<p className="text-zinc-400 mt-1 sm:mt-2 text-sm sm:text-base">
						{t("app.subtitle")}
					</p>
				</div>
				<Button
					onClick={() => setIsCreateOpen(true)}
					className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
				>
					<Plus className="h-4 w-4 mr-2" />
					{t("action.new_task")}
				</Button>
			</div>

			{/* Filter Bar */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg mb-6">
				<CardContent className="pt-4 sm:pt-5 pb-4">
					{/* Mobile filter toggle + search row */}
					<div className="flex items-center gap-2 sm:hidden mb-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
							<Input
								placeholder={t("filter.search_placeholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 bg-zinc-950 border-zinc-700 h-9 text-sm"
							/>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowMobileFilters(!showMobileFilters)}
							className={cn(
								"border-zinc-700 h-9 shrink-0",
								showMobileFilters && "border-violet-500 text-violet-400",
							)}
						>
							<Filter className="h-4 w-4" />
						</Button>
					</div>

					<div
						className={cn(
							"flex-wrap items-center gap-2",
							"hidden sm:flex",
							showMobileFilters && "flex",
						)}
					>
						{/* Desktop search (hidden on mobile, already shown above) */}
						<div className="relative w-56 hidden sm:block">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
							<Input
								placeholder={t("filter.search_placeholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 bg-zinc-950 border-zinc-700 h-9 text-sm"
							/>
						</div>

						{/* Quick toggle badges */}
						<button
							onClick={() => {
								setShowMyTasksOnly(!showMyTasksOnly);
							}}
							className={cn(
								"inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-full border transition-all shrink-0",
								showMyTasksOnly
									? "bg-zinc-200 text-zinc-900 border-zinc-200"
									: "border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600",
							)}
						>
							{t("action.my_tasks")}
						</button>

						<button
							onClick={() => setFilterBlocked(!filterBlocked)}
							className={cn(
								"inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-full border transition-all shrink-0",
								filterBlocked
									? "bg-zinc-200 text-zinc-900 border-zinc-200"
									: "border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600",
							)}
						>
							{t("action.blocked")}
						</button>

						<button
							onClick={() => setFilterNeedsApproval(!filterNeedsApproval)}
							className={cn(
								"inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-full border transition-all shrink-0",
								filterNeedsApproval
									? "bg-zinc-200 text-zinc-900 border-zinc-200"
									: "border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600",
							)}
						>
							{t("action.needs_approval")}
						</button>

						<div className="w-px h-6 bg-zinc-700 mx-1 hidden sm:block" />

						{/* Filter dropdowns */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-700 gap-1.5 text-xs h-8"
								>
									<Filter className="h-3 w-3" />
									<span className="hidden sm:inline">
										{t("field.priority")}
									</span>
									<ChevronDown className="h-3 w-3 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-700 rounded-lg">
								<DropdownMenuItem
									onClick={() => setFilterPriority("all")}
									className="text-zinc-400 text-sm"
								>
									{t("filter.all_priorities")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{["low", "medium", "high", "urgent"].map((p) => (
									<DropdownMenuItem
										key={p}
										onClick={() => setFilterPriority(p)}
										className="text-zinc-200 text-sm"
									>
										{t(`priority.${p}`)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-700 gap-1.5 text-xs h-8"
								>
									{t("field.assignee")}
									<ChevronDown className="h-3 w-3 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-700 max-h-60 overflow-y-auto">
								<DropdownMenuItem
									onClick={() => setFilterAssignee("all")}
									className="text-zinc-400 text-sm"
								>
									{t("filter.all_assignees")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{profiles.map((profile) => (
									<DropdownMenuItem
										key={profile.id}
										onClick={() => setFilterAssignee(profile.id)}
										className="text-zinc-200 text-sm"
									>
										{profile.full_name || profile.email || t("app.unknown")}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-700 gap-1.5 text-xs h-8"
								>
									<Building2 className="h-3 w-3 sm:hidden" />
									<span className="hidden sm:inline">{t("field.event")}</span>
									<ChevronDown className="h-3 w-3 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-700 max-h-60 overflow-y-auto">
								<DropdownMenuItem
									onClick={() => setFilterEvent("all")}
									className="text-zinc-400 text-sm"
								>
									{t("filter.all_events")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{events.map((event) => (
									<DropdownMenuItem
										key={event.id}
										onClick={() => setFilterEvent(event.id)}
										className="text-zinc-200 text-sm"
									>
										{event.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Sort & group */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-700 gap-1.5 text-xs h-8"
								>
									<ArrowUpDown className="h-3 w-3" />
									<span className="hidden sm:inline">{t("app.sort")}</span>
									<ChevronDown className="h-3 w-3 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-700 rounded-lg">
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "priority" ? null : "priority")
									}
									className={cn(
										"text-sm",
										sortField === "priority" ? "text-white" : "text-zinc-400",
									)}
								>
									{t("filter.sort_priority")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "due_date" ? null : "due_date")
									}
									className={cn(
										"text-sm",
										sortField === "due_date" ? "text-white" : "text-zinc-400",
									)}
								>
									{t("filter.sort_due_date")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{activeFilters.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="text-zinc-500 hover:text-white text-xs h-8"
							>
								<X className="h-3 w-3 mr-1" />
								{t("app.clear")}
							</Button>
						)}
					</div>

					{/* Active filter chips */}
					{activeFilters.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-3">
							{activeFilters.map((chip, i) => (
								<Badge
									key={i}
									variant="outline"
									className="border-zinc-700 text-zinc-400 text-xs cursor-pointer hover:bg-zinc-800 gap-1"
									onClick={chip.onClear}
								>
									{chip.label}
									<X className="h-2.5 w-2.5" />
								</Badge>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Kanban Board (dynamically imported — dnd-kit is lazy-loaded) */}
			<KanbanBoard
				tasksByStatus={tasksByStatus}
				visibleColumns={visibleColumns}
				loading={loading}
				groupByVenue={groupByVenue}
				currentUserId={currentUserId}
				onTaskClick={handleTaskClick}
				onTasksChange={setTasks}
				onRefetch={refetchTasks}
			/>

			{/* Create Task Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">
							{t("action.new_task")}
						</DialogTitle>
					</DialogHeader>
					<TaskForm
						mode="create"
						onSubmit={handleCreateTask}
						onCreateWithFiles={handleCreateTaskWithFiles}
						onCancel={() => setIsCreateOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Task Detail Dialog */}
			<TaskDetailDialog
				task={selectedTask}
				open={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				onTaskUpdated={handleTaskUpdated}
				onTaskDeleted={handleTaskDeleted}
			/>
		</div>
	);
}
