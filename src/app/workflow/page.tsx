"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
	DndContext,
	DragOverlay,
	closestCorners,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
	DragStartEvent,
	DragEndEvent,
	DragOverEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import { TaskCard, Task } from "@/components/task-card";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface Event {
	id: string;
	name: string;
}

interface Profile {
	id: string;
	full_name: string | null;
	email: string | null;
}

interface Venue {
	id: string;
	name: string;
}

type SortField = "priority" | "due_date" | "venue" | null;

export default function WorkflowPage() {
	const { t } = useI18n();
	const { toast } = useToast();

	// Core state
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	// Drag state
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeTaskOriginalStatus, setActiveTaskOriginalStatus] = useState<
		Task["status"] | null
	>(null);

	// Dialogs
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [filterPriority, setFilterPriority] = useState<string>("all");
	const [filterAssignee, setFilterAssignee] = useState<string>("all");
	const [filterEvent, setFilterEvent] = useState<string>("all");
	const [filterVenue, setFilterVenue] = useState<string>("all");
	const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
	const [filterBlocked, setFilterBlocked] = useState(false);
	const [filterNeedsApproval, setFilterNeedsApproval] = useState(false);

	// Sort & Group
	const [sortField, setSortField] = useState<SortField>(null);
	const [groupByVenue, setGroupByVenue] = useState(false);

	// Reference data
	const [events, setEvents] = useState<Event[]>([]);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [venues, setVenues] = useState<Venue[]>([]);

	function DroppableColumn({
		children,
		columnId,
	}: {
		children: React.ReactNode;
		columnId: string;
	}) {
		const { setNodeRef } = useDroppable({ id: columnId });
		return <div ref={setNodeRef}>{children}</div>;
	}

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor),
	);

	// Fetch current user on mount
	useEffect(() => {
		const fetchUser = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				setCurrentUserId(user.id);
			}
		};
		fetchUser();
	}, []);

	// Fetch data on mount
	useEffect(() => {
		fetchTasks();
		fetchEvents();
		fetchProfiles();
		fetchVenues();
	}, []);

	// Re-fetch when my-tasks filter changes
	useEffect(() => {
		fetchTasks();
	}, [showMyTasksOnly]);

	// ===== Data fetching =====

	const fetchTasks = async () => {
		setLoading(true);
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			let url = "/api/tasks";
			if (user && showMyTasksOnly) {
				url += `?my_tasks=true&user_id=${user.id}`;
			}

			const response = await fetch(url);
			const data = await response.json();
			setTasks(data.tasks || []);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchEvents = async () => {
		try {
			const response = await fetch("/api/events");
			const data = await response.json();
			setEvents(data.events || []);
		} catch (error) {
			console.error("Failed to fetch events:", error);
		}
	};

	const fetchProfiles = async () => {
		try {
			const response = await fetch("/api/staff");
			const data = await response.json();
			const staffProfiles = (data.staff || [])
				.filter((s: { profiles: Profile | null }) => s.profiles)
				.map((s: { profiles: Profile }) => s.profiles);
			setProfiles(staffProfiles);
		} catch (error) {
			console.error("Failed to fetch profiles:", error);
		}
	};

	const fetchVenues = async () => {
		try {
			const response = await fetch("/api/venues");
			const data = await response.json();
			setVenues(data.venues || []);
		} catch (error) {
			console.error("Failed to fetch venues:", error);
		}
	};

	// ===== Filtering =====

	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			if (filterPriority !== "all" && task.priority !== filterPriority)
				return false;
			if (filterAssignee !== "all" && task.assignee_id !== filterAssignee)
				return false;
			if (filterEvent !== "all" && task.event_id !== filterEvent) return false;
			if (filterVenue !== "all") {
				// Find event's venue via events list
				const event = events.find((e) => e.id === task.event_id);
				if (!event) return false;
				// We need venue_id on events — events have venue_id in DB but not returned
				// Use task.event?.venue_id if available, otherwise filter by event name matching venue name
				return (
					(task.event as Record<string, unknown>)?.venue_id === filterVenue
				);
			}
			if (filterBlocked && !task.blocked) return false;
			if (filterNeedsApproval && !task.needs_approval) return false;
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					task.title.toLowerCase().includes(query) ||
					task.description?.toLowerCase().includes(query)
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

	// ===== Sorting =====

	const sortedTasks = useMemo(() => {
		const tasksCopy = [...filteredTasks];
		if (!sortField) return tasksCopy;

		return tasksCopy.sort((a, b) => {
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

	// ===== Group by venue =====
	// (grouping is done inline in JSX render)

	const tasksByStatus = useMemo(() => {
		const grouped: Record<string, Task[]> = {
			todo: [],
			in_progress: [],
			pending_approval: [],
			done: [],
			cancelled: [],
		};
		sortedTasks.forEach((task) => {
			if (grouped[task.status]) {
				grouped[task.status].push(task);
			}
		});
		return grouped;
	}, [sortedTasks]);

	const visibleColumns = useMemo(() => {
		const hasApprovalTasks = tasks.some((t) => t.needs_approval);
		return COLUMNS.filter((col) => {
			if (col.id === "pending_approval") {
				return hasApprovalTasks;
			}
			return true;
		});
	}, [tasks]);

	// ===== Drag handlers =====

	const handleDragStart = (event: DragStartEvent) => {
		const activeId = event.active.id as string;
		const activeTask = tasks.find((t) => t.id === activeId);
		setActiveId(activeId);
		setActiveTaskOriginalStatus(activeTask?.status || null);
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;
		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;
		const activeTask = tasks.find((t) => t.id === activeId);
		if (!activeTask) return;

		const overColumn = COLUMNS.find((c) => c.id === overId);
		if (overColumn && activeTask.status !== overColumn.status) {
			setTasks((tasks) =>
				tasks.map((t) =>
					t.id === activeId ? { ...t, status: overColumn.status } : t,
				),
			);
		}

		const overTask = tasks.find((t) => t.id === overId);
		if (overTask && activeTask.status !== overTask.status) {
			setTasks((tasks) =>
				tasks.map((t) =>
					t.id === activeId ? { ...t, status: overTask.status } : t,
				),
			);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		setActiveTaskOriginalStatus(null);

		if (!over) return;

		const activeId = active.id as string;
		const activeTask = tasks.find((t) => t.id === activeId);
		if (!activeTask) return;

		const overId = over.id as string;
		let newStatus: Task["status"] | null = null;

		const overColumn = COLUMNS.find((c) => c.id === overId);
		if (overColumn) {
			newStatus = overColumn.status;
		} else {
			const overTask = tasks.find((t) => t.id === overId);
			if (overTask) newStatus = overTask.status;
		}

		if (!newStatus || newStatus === activeTaskOriginalStatus) return;

		try {
			const response = await fetch(`/api/tasks/${activeId}/status`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus, changed_by: currentUserId }),
			});

			if (!response.ok) {
				const error = await response.json();
				console.error("API error:", error);
				fetchTasks();
				return;
			}

			setTasks((tasks) =>
				tasks.map((t) =>
					t.id === activeId ? { ...t, status: newStatus as Task["status"] } : t,
				),
			);
			toast({
				title: "Aufgabe verschoben",
				description: `Status geändert zu ${newStatus?.replace("_", " ")}.`,
			});
		} catch (error) {
			console.error("Failed to update task status:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Verschieben der Aufgabe.",
			});
			fetchTasks();
		}
	};

	// ===== Task actions =====

	const handleTaskClick = (task: Task) => {
		setSelectedTask(task);
		setIsDetailOpen(true);
	};

	const handleTaskUpdated = (updatedTask: Task) => {
		setTasks((tasks) =>
			tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
		);
		setSelectedTask(updatedTask);
	};

	const handleTaskDeleted = (taskId: string) => {
		setTasks((tasks) => tasks.filter((t) => t.id !== taskId));
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
			setTasks((tasks) => [newTask, ...tasks]);
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

	// ===== Filter chip helpers =====

	interface FilterChip {
		label: string;
		active: boolean;
		onClear?: () => void;
	}

	const activeFilters = useMemo((): FilterChip[] => {
		const chips: FilterChip[] = [];
		if (filterPriority !== "all") {
			const label = t(`priority.${filterPriority}`);
			chips.push({
				label: `${t("field.priority")}: ${label}`,
				active: true,
				onClear: () => setFilterPriority("all"),
			});
		}
		if (filterAssignee !== "all") {
			const profile = profiles.find((p) => p.id === filterAssignee);
			chips.push({
				label: `${t("field.assignee")}: ${profile?.full_name || t("app.unknown")}`,
				active: true,
				onClear: () => setFilterAssignee("all"),
			});
		}
		if (filterEvent !== "all") {
			const event = events.find((e) => e.id === filterEvent);
			chips.push({
				label: `${t("field.event")}: ${event?.name || t("app.unknown")}`,
				active: true,
				onClear: () => setFilterEvent("all"),
			});
		}
		if (filterVenue !== "all") {
			const venue = venues.find((v) => v.id === filterVenue);
			chips.push({
				label: `${t("field.venue")}: ${venue?.name || t("app.unknown")}`,
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

	const columnColors: Record<string, string> = {
		todo: "bg-zinc-600",
		in_progress: "bg-blue-600",
		pending_approval: "bg-amber-600",
		done: "bg-green-600",
		cancelled: "bg-red-600",
	};

	const activeTask = tasks.find((t) => t.id === activeId);

	// ===== Render =====

	return (
		<div className="container mx-auto py-8 px-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<Kanban className="h-8 w-8 text-violet-400" />
						{t("app.title")}
					</h1>
					<p className="text-zinc-400 mt-2">{t("app.subtitle")}</p>
				</div>
				<Button
					onClick={() => setIsCreateOpen(true)}
					className="bg-violet-600 hover:bg-violet-700"
				>
					<Plus className="h-4 w-4 mr-2" />
					{t("action.new_task")}
				</Button>
			</div>

			{/* Filter Bar */}
			<Card className="bg-zinc-900 border-zinc-800 mb-6">
				<CardContent className="pt-6">
					{/* Search + filter chips row */}
					<div className="flex flex-wrap items-center gap-2 mb-4">
						{/* Search */}
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
							<Input
								placeholder={t("filter.search_placeholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 bg-zinc-950 border-zinc-800 h-9 text-sm"
							/>
						</div>

						{/* Filter dropdowns */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-800 gap-1"
								>
									{t("field.priority")} <ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-800">
								<DropdownMenuItem
									onClick={() => setFilterPriority("all")}
									className="text-zinc-400"
								>
									{t("filter.all_priorities")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{["low", "medium", "high", "urgent"].map((p) => (
									<DropdownMenuItem
										key={p}
										onClick={() => setFilterPriority(p)}
										className="text-zinc-200"
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
									className="border-zinc-800 gap-1"
								>
									{t("field.assignee")} <ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-800 max-h-60 overflow-y-auto">
								<DropdownMenuItem
									onClick={() => setFilterAssignee("all")}
									className="text-zinc-400"
								>
									{t("filter.all_assignees")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{profiles.map((profile) => (
									<DropdownMenuItem
										key={profile.id}
										onClick={() => setFilterAssignee(profile.id)}
										className="text-zinc-200"
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
									className="border-zinc-800 gap-1"
								>
									{t("field.event")} <ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-800 max-h-60 overflow-y-auto">
								<DropdownMenuItem
									onClick={() => setFilterEvent("all")}
									className="text-zinc-400"
								>
									{t("filter.all_events")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{events.map((event) => (
									<DropdownMenuItem
										key={event.id}
										onClick={() => setFilterEvent(event.id)}
										className="text-zinc-200"
									>
										{event.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-800 gap-1"
								>
									<Building2 className="h-3.5 w-3.5" />
									{t("field.venue")} <ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-800">
								<DropdownMenuItem
									onClick={() => setFilterVenue("all")}
									className="text-zinc-400"
								>
									{t("filter.all_venues")}
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-zinc-800" />
								{venues.map((venue) => (
									<DropdownMenuItem
										key={venue.id}
										onClick={() => setFilterVenue(venue.id)}
										className="text-zinc-200"
									>
										{venue.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Toggle filters */}
						<Button
							variant={showMyTasksOnly ? "default" : "outline"}
							size="sm"
							onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
							className={
								showMyTasksOnly
									? "bg-violet-600 hover:bg-violet-700"
									: "border-zinc-800"
							}
						>
							{showMyTasksOnly ? t("action.my_tasks") : t("action.all_tasks")}
						</Button>

						<Button
							variant={filterBlocked ? "default" : "outline"}
							size="sm"
							onClick={() => setFilterBlocked(!filterBlocked)}
							className={
								filterBlocked
									? "bg-red-600 hover:bg-red-700"
									: "border-zinc-800"
							}
						>
							{t("action.blocked")}
						</Button>

						<Button
							variant={filterNeedsApproval ? "default" : "outline"}
							size="sm"
							onClick={() => setFilterNeedsApproval(!filterNeedsApproval)}
							className={
								filterNeedsApproval
									? "bg-amber-600 hover:bg-amber-700"
									: "border-zinc-800"
							}
						>
							{t("action.needs_approval")}
						</Button>

						{/* Sort by */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-800 gap-1"
								>
									<ArrowUpDown className="h-3.5 w-3.5" />
									{t("app.sort")} <ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-zinc-900 border-zinc-800">
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "priority" ? null : "priority")
									}
									className={cn(
										"text-zinc-200",
										sortField === "priority" && "text-violet-400",
									)}
								>
									{t("filter.sort_priority")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "due_date" ? null : "due_date")
									}
									className={cn(
										"text-zinc-200",
										sortField === "due_date" && "text-violet-400",
									)}
								>
									{t("filter.sort_due_date")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "venue" ? null : "venue")
									}
									className={cn(
										"text-zinc-200",
										sortField === "venue" && "text-violet-400",
									)}
								>
									{t("filter.sort_venue")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Group by venue */}
						<Button
							variant={groupByVenue ? "default" : "outline"}
							size="sm"
							onClick={() => setGroupByVenue(!groupByVenue)}
							className={
								groupByVenue
									? "bg-emerald-600 hover:bg-emerald-700"
									: "border-zinc-800"
							}
						>
							<Building2 className="h-3.5 w-3.5 mr-1" />
							{t("filter.group_by_venue")}
						</Button>

						{/* Clear */}
						{activeFilters.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="text-zinc-400 hover:text-white"
							>
								<X className="h-3.5 w-3.5 mr-1" />
								{t("app.clear")}
							</Button>
						)}
					</div>

					{/* Active filter chips */}
					{activeFilters.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{activeFilters.map((chip, i) => (
								<Badge
									key={i}
									variant="secondary"
									className="bg-zinc-800 text-zinc-300 border-zinc-700 cursor-pointer hover:bg-zinc-700 gap-1"
									onClick={chip.onClear}
								>
									{chip.label}
									<X className="h-3 w-3" />
								</Badge>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Kanban Board */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				autoScroll={false}
			>
				<div
					className="grid grid-cols-1 gap-4"
					style={{
						gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
					}}
				>
					{visibleColumns.map((column) => {
						const hasBlockedTasks =
							column.id === "in_progress" &&
							tasksByStatus[column.status]?.some((t) => t.blocked);

						return (
							<div key={column.id} className="flex flex-col">
								<div className="flex items-center gap-2 mb-4">
									<div
										className={cn(
											"w-3 h-3 rounded-full",
											columnColors[column.id],
										)}
									/>
									<h3 className="font-semibold text-white">
										{t(`status.${column.status}`)}
									</h3>
									<Badge
										variant="outline"
										className="bg-zinc-800 text-zinc-400 border-zinc-700"
									>
										{tasksByStatus[column.status]?.length || 0}
									</Badge>
								</div>

								<SortableContext
									items={tasksByStatus[column.status]?.map((t) => t.id) || []}
									strategy={verticalListSortingStrategy}
								>
									<DroppableColumn columnId={column.id}>
										<div
											className={cn(
												"flex-1 min-h-[200px] p-2 border-2 border-dashed transition-colors",
												"bg-zinc-950/50 border-zinc-800",
												activeId && "border-violet-600/50 bg-violet-950/20",
												hasBlockedTasks && "bg-red-950/20 border-red-800/50",
											)}
										>
											{loading ? (
												<div className="space-y-3">
													{[...Array(3)].map((_, i) => (
														<Skeleton key={i} className="h-24 bg-zinc-800" />
													))}
												</div>
											) : tasksByStatus[column.status]?.length === 0 ? (
												<div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
													{t("app.no_results")}
												</div>
											) : groupByVenue ? (
												/* Grouped by venue within the column */
												<div className="space-y-4">
													{Object.entries(
														tasksByStatus[column.status]?.reduce(
															(acc: Record<string, Task[]>, task) => {
																const venueName =
																	((task.event as Record<string, unknown>)
																		?.name as string) || t("app.unknown");
																if (!acc[venueName]) acc[venueName] = [];
																acc[venueName].push(task);
																return acc;
															},
															{},
														) || {},
													).map(([venueName, venueTasks]) => (
														<div key={venueName}>
															<div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
																<Building2 className="h-3 w-3" />
																{venueName}
																<Badge
																	variant="outline"
																	className="ml-1 bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]"
																>
																	{venueTasks.length}
																</Badge>
															</div>
															<div className="space-y-2">
																{venueTasks.map((task) => (
																	<TaskCard
																		key={task.id}
																		task={task}
																		onClick={() => handleTaskClick(task)}
																	/>
																))}
															</div>
														</div>
													))}
												</div>
											) : (
												/* Default flat list */
												<div className="space-y-3">
													{tasksByStatus[column.status]?.map((task) => (
														<TaskCard
															key={task.id}
															task={task}
															onClick={() => handleTaskClick(task)}
														/>
													))}
												</div>
											)}
										</div>
									</DroppableColumn>
								</SortableContext>
							</div>
						);
					})}
				</div>

				<DragOverlay>
					{activeTask ? (
						<div className="opacity-80">
							<TaskCard task={activeTask} />
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Create Task Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">
							{t("action.new_task")}
						</DialogTitle>
					</DialogHeader>
					<TaskForm
						mode="create"
						onSubmit={handleCreateTask}
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
