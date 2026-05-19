"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
	DndContext,
	DragOverlay,
	closestCorners,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
	type DragStartEvent,
	type DragEndEvent,
	type DragOverEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard, type Task } from "@/components/task-card";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
	tasksByStatus: Record<string, Task[]>;
	visibleColumns: Array<{ id: string; status: Task["status"] }>;
	loading: boolean;
	groupByVenue: boolean;
	currentUserId: string | null;
	onTaskClick: (task: Task) => void;
	onTasksChange: (updater: Task[] | ((prev: Task[]) => Task[])) => void;
	onRefetch: () => Promise<void>;
}

// ── Column Colors ─────────────────────────────────────────────────────

const COLUMN_COLORS: Record<string, string> = {
	todo: "bg-zinc-500",
	in_progress: "bg-blue-500",
	pending_approval: "bg-amber-500",
	done: "bg-emerald-500",
	cancelled: "bg-zinc-600",
};

// ── Droppable Column Wrapper ──────────────────────────────────────────

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

// ── Kanban Board ──────────────────────────────────────────────────────

export function KanbanBoard({
	tasksByStatus,
	visibleColumns,
	loading,
	groupByVenue,
	currentUserId,
	onTaskClick,
	onTasksChange,
	onRefetch,
}: KanbanBoardProps) {
	const { toast } = useToast();
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeTaskOriginalStatus, setActiveTaskOriginalStatus] = useState<
		Task["status"] | null
	>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor),
	);

	// ── Flatten all tasks for lookup ────────────────────────────────
	const allTasks = visibleColumns.flatMap(
		(col) => tasksByStatus[col.status] || [],
	);
	const activeTask = allTasks.find((t) => t.id === activeId);

	// ── Drag handlers ───────────────────────────────────────────────
	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = event.active.id as string;
			const task = allTasksDFind(id, tasksByStatus);
			setActiveId(id);
			setActiveTaskOriginalStatus(task?.status || null);
		},
		[tasksByStatus],
	);

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event;
			if (!over) return;

			const activeId = active.id as string;
			const overId = over.id as string;
			const activeTask = allTasksDFind(activeId, tasksByStatus);
			if (!activeTask) return;

			const overColumn = visibleColumns.find((c) => c.id === overId);
			if (overColumn && activeTask.status !== overColumn.status) {
				onTasksChange((prev) =>
					prev.map((t) =>
						t.id === activeId
							? { ...t, status: overColumn.status as Task["status"] }
							: t,
					),
				);
			}

			const overTask = allTasksDFind(overId, tasksByStatus);
			if (overTask && activeTask.status !== overTask.status) {
				onTasksChange((prev) =>
					prev.map((t) =>
						t.id === activeId ? { ...t, status: overTask.status } : t,
					),
				);
			}
		},
		[visibleColumns, tasksByStatus, onTasksChange],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);
			setActiveTaskOriginalStatus(null);
			if (!over) return;

			const activeId = active.id as string;
			const activeTask = allTasksDFind(activeId, tasksByStatus);
			if (!activeTask) return;

			const overId = over.id as string;
			let newStatus: Task["status"] | null = null;

			const overColumn = visibleColumns.find((c) => c.id === overId);
			if (overColumn) {
				newStatus = overColumn.status;
			} else {
				const overTask = allTasksDFind(overId, tasksByStatus);
				if (overTask) newStatus = overTask.status;
			}

			if (!newStatus || newStatus === activeTaskOriginalStatus) return;

			try {
				const response = await fetch(`/api/tasks/${activeId}/status`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						status: newStatus,
						changed_by: currentUserId,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error("API error:", error);
					await onRefetch();
					return;
				}

				onTasksChange((prev) =>
					prev.map((t) =>
						t.id === activeId
							? { ...t, status: newStatus as Task["status"] }
							: t,
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
				await onRefetch();
			}
		},
		[
			activeTaskOriginalStatus,
			currentUserId,
			onRefetch,
			onTasksChange,
			tasksByStatus,
			visibleColumns,
			toast,
		],
	);

	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to the in_progress column on mobile mount
	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const inProgressIdx = visibleColumns.findIndex(
			(c) => c.status === "in_progress",
		);
		if (inProgressIdx > 0) {
			const child = el.children[inProgressIdx] as HTMLElement | undefined;
			if (child) {
				el.scrollTo({ left: child.offsetLeft - 16, behavior: "smooth" });
			}
		}
	}, [visibleColumns]);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
			autoScroll={false}
		>
			<div
				ref={scrollContainerRef}
				className="sm:overflow-hidden overflow-x-auto pb-2 -mx-4 sm:-mx-0 px-4 sm:px-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
			>
				<div
					className="flex gap-4 sm:grid"
					style={{
						gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
					}}
				>
					{visibleColumns.map((column) => {
						const tasks = tasksByStatus[column.status] || [];
						const hasBlockedTasks =
							column.id === "in_progress" && tasks.some((t) => t.blocked);

						return (
							<div key={column.id} className="flex flex-col">
								{/* Column header */}
								<div className="flex items-center gap-2 mb-3 px-1">
									<div
										className={cn(
											"w-2 h-2 rounded-full",
											COLUMN_COLORS[column.id],
										)}
									/>
									<h3 className="text-sm font-semibold text-white capitalize">
										{column.status.replace(/_/g, " ")}
									</h3>
									<Badge
										variant="outline"
										className="border-zinc-700 text-zinc-500 text-[10px] ml-auto"
									>
										{tasks.length}
									</Badge>
								</div>

								<SortableContext
									items={tasks.map((t) => t.id)}
									strategy={verticalListSortingStrategy}
								>
									<DroppableColumn columnId={column.id}>
										<div
											className={cn(
												"flex-1 min-h-[200px] p-3 rounded-lg transition-colors sm:w-auto w-72",
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
											) : tasks.length === 0 ? (
												<div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
													Keine Aufgaben
												</div>
											) : groupByVenue ? (
												<div className="space-y-4">
													{Object.entries(
														tasks.reduce(
															(acc: Record<string, Task[]>, task) => {
																const venueName =
																	((task.event as Record<string, unknown>)
																		?.name as string) || "Unbekannt";
																if (!acc[venueName]) acc[venueName] = [];
																acc[venueName].push(task);
																return acc;
															},
															{} as Record<string, Task[]>,
														),
													).map(([venueName, venueTasks]) => (
														<div key={venueName}>
															<div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
																<Building2 className="h-3 w-3" />
																{venueName}
															</div>
															<div className="space-y-2">
																{venueTasks.map((task) => (
																	<TaskCard
																		key={task.id}
																		task={task}
																		onClick={() => onTaskClick(task)}
																	/>
																))}
															</div>
														</div>
													))}
												</div>
											) : (
												<div className="space-y-2">
													{tasks.map((task) => (
														<TaskCard
															key={task.id}
															task={task}
															onClick={() => onTaskClick(task)}
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
			</div>

			<DragOverlay>
				{activeTask ? (
					<div className="opacity-80">
						<TaskCard task={activeTask} />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

// ── Helper ────────────────────────────────────────────────────────────

function allTasksDFind(
	id: string,
	byStatus: Record<string, Task[]>,
): Task | undefined {
	for (const tasks of Object.values(byStatus)) {
		const found = tasks.find((t) => t.id === id);
		if (found) return found;
	}
	return undefined;
}
