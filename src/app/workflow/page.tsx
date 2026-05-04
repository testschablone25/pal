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
	Filter,
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
	venue_id: string | null;
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

	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeTaskOriginalStatus, setActiveTaskOriginalStatus] = useState<
		Task["status"] | null
	>(null);

	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

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

	useEffect(() => {
		const fetchUser = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) setCurrentUserId(user.id);
		};
		fetchUser();
	}, []);

	useEffect(() => {
		fetchTasks();
		fetchEvents();
		fetchProfiles();
		fetchVenues();
	}, []);

	useEffect(() => {
		fetchTasks();
	}, [showMyTasksOnly]);

	const fetchTasks = async () => {
		setLoading(true);
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			let url = "/api/tasks";
			if (user && showMyTasksOnly) url += `?my_tasks=true&user_id=${user.id}`;

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

	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			if (filterPriority !== "all" && task.priority !== filterPriority)
				return false;
			if (filterAssignee !== "all" && task.assignee_id !== filterAssignee)
				return false;
			if (filterEvent !== "all" && task.event_id !== filterEvent) return false;
			if (filterVenue !== "all") {
				const taskRecord = task as unknown as Record<string, unknown>;
				if (taskRecord.venue_id === filterVenue) return true;
				const event = events.find((e) => e.id === task.event_id);
				if (!event) return false;
				return event.venue_id === filterVenue;
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

	const columnStatusDots: Record<string, string> = {
		todo: "bg-zinc-500",
		in_progress: "bg-blue-500",
		pending_approval: "bg-amber-500",
		done: "bg-emerald-500",
		cancelled: "bg-zinc-600",
	};

	const activeTask = tasks.find((t) => t.id === activeId);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<Kanban className="h-7 w-7 text-zinc-400" />
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
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg mb-6">
				<CardContent className="pt-5 pb-4">
					{/* Search + quick toggles row */}
					<div className="flex flex-wrap items-center gap-2 mb-3">
						<div className="relative w-56">
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
							onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
							className={cn(
								"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
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
								"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
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
								"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
								filterNeedsApproval
									? "bg-zinc-200 text-zinc-900 border-zinc-200"
									: "border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600",
							)}
						>
							{t("action.needs_approval")}
						</button>

						{/* Divider */}
						<div className="w-px h-6 bg-zinc-700 mx-1" />

						{/* Filter dropdowns */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="border-zinc-700 gap-1.5 text-xs h-8"
								>
									<Filter className="h-3 w-3" />
									{t("field.priority")}
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
									<Building2 className="h-3 w-3" />
									{t("field.event")}
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
									{t("app.sort")}
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
								<DropdownMenuItem
									onClick={() =>
										setSortField(sortField === "venue" ? null : "venue")
									}
									className={cn(
										"text-sm",
										sortField === "venue" ? "text-white" : "text-zinc-400",
									)}
								>
									{t("filter.sort_venue")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<button
							onClick={() => setGroupByVenue(!groupByVenue)}
							className={cn(
								"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
								groupByVenue
									? "bg-zinc-200 text-zinc-900 border-zinc-200"
									: "border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600",
							)}
						>
							<Building2 className="h-3 w-3" />
							{t("filter.group_by_venue")}
						</button>

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
						<div className="flex flex-wrap gap-1.5">
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
					className="grid gap-4"
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
								{/* Column header */}
								<div className="flex items-center gap-2 mb-3 px-1">
									<div
										className={cn(
											"w-2 h-2 rounded-full",
											columnStatusDots[column.id],
										)}
									/>
									<h3 className="text-sm font-semibold text-white">
										{t(`status.${column.status}`)}
									</h3>
									<Badge
										variant="outline"
										className="border-zinc-700 text-zinc-500 text-[10px] ml-auto"
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
												"flex-1 min-h-[200px] p-3 rounded-lg transition-colors",
												"bg-zinc-950/60 border border-zinc-800/60",
												activeId && "border-violet-600/40 bg-violet-950/10",
												hasBlockedTasks && "border-red-800/40 bg-red-950/10",
											)}
										>
											{loading ? (
												<div className="space-y-3">
													{[...Array(3)].map((_, i) => (
														<Skeleton
															key={i}
															className="h-24 bg-zinc-800/50 rounded-lg"
														/>
													))}
												</div>
											) : tasksByStatus[column.status]?.length === 0 ? (
												<div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
													{t("app.no_results")}
												</div>
											) : groupByVenue ? (
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
															<div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
																<Building2 className="h-3 w-3" />
																{venueName}
																<Badge
																	variant="outline"
																	className="ml-1 border-zinc-700 text-zinc-600 text-[10px]"
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
												<div className="space-y-2">
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
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-xl max-h-[85vh] overflow-y-auto">
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
