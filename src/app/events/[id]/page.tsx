"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RunningOrder } from "@/components/running-order";
import { PerformanceForm } from "@/components/performance-form";
import { TaskForm } from "@/components/task-form";
import { TaskCard, type Task } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { formatDateFull } from "@/lib/dates";
import {
	CalendarDays,
	Clock,
	MapPin,
	Users,
	Edit,
	Download,
	Share2,
	Trash2,
	Plus,
	ListTodo,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/page-skeleton";
import { statusBadgeClass } from "@/lib/utils";

interface Event {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
	status: string;
	max_capacity: number | null;
	venues: {
		name: string;
		address: string;
		capacity: number;
	} | null;
}

export default function EventDetailPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.id as string;
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [addPerformanceOpen, setAddPerformanceOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	// Task state
	const [eventTasks, setEventTasks] = useState<Task[]>([]);
	const [tasksLoading, setTasksLoading] = useState(true);
	const [createTaskOpen, setCreateTaskOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [taskDetailOpen, setTaskDetailOpen] = useState(false);

	const { toast } = useToast();

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	const fetchEvent = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/events/${eventId}`);
			const data = await response.json();
			setEvent(data);
		} catch (error) {
			console.error("Failed to fetch event:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadItinerary = async () => {
		try {
			const response = await fetch(`/api/itinerary/${eventId}?format=pdf`);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `itinerary_${eventId}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (error) {
			console.error("Failed to download itinerary:", error);
		}
	};

	const handleDeleteEvent = async () => {
		try {
			await fetch(`/api/events/${eventId}`, { method: "DELETE" });
			router.push("/events");
		} catch (error) {
			console.error("Failed to delete event:", error);
		}
	};

	const handleAddPerformance = () => {
		setAddPerformanceOpen(true);
	};

	const handlePerformanceSuccess = (_performance: Record<string, unknown>) => {
		setAddPerformanceOpen(false);
		setRefreshKey((prev) => prev + 1);
		toast({
			title: "Performance added",
			description: "The performance has been added to the running order.",
		});
	};

	const handlePerformanceError = (error: string) => {
		toast({
			variant: "destructive",
			title: "Error",
			description: error,
		});
	};

	// ===== Task Functions =====

	const fetchEventTasks = useCallback(async () => {
		setTasksLoading(true);
		try {
			const response = await fetch(`/api/tasks?event_id=${eventId}&limit=50`);
			const data = await response.json();
			setEventTasks(data.tasks || []);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setTasksLoading(false);
		}
	}, [eventId]);

	useEffect(() => {
		if (eventId) {
			fetchEventTasks();
		}
	}, [eventId, fetchEventTasks]);

	const handleCreateTask = async (values: {
		title: string;
		description?: string;
		status: string;
		priority: string;
		assignee_id?: string;
		event_id?: string;
		due_date?: string;
		needs_approval?: boolean;
		items?: { item_id: string; goal_sub_location_id?: string | null }[];
		created_by?: string;
		parent_task_id?: string | null;
		task_type?: string | null;
	}) => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const response = await fetch("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...values,
				event_id: eventId,
				created_by: user?.id || values.created_by,
			}),
		});

		if (!response.ok) {
			const err = await response.json();
			throw new Error(err.error || "Failed to create task");
		}

		const newTask = await response.json();
		setEventTasks((prev) => [newTask, ...prev]);
		setCreateTaskOpen(false);
		toast({
			title: "Task created",
			description: "The task has been added to this event.",
		});
	};

	const handleTaskUpdated = (updatedTask: Task) => {
		setEventTasks((prev) =>
			prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
		);
	};

	const handleTaskDeleted = (taskId: string) => {
		setEventTasks((prev) => prev.filter((t) => t.id !== taskId));
	};

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<PageSkeleton rows={3} />
			</div>
		);
	}

	if (!event) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="py-12 text-center">
						<p className="text-zinc-400">Event not found</p>
						<Link href="/events">
							<Button className="mt-4 bg-violet-600 hover:bg-violet-700">
								Back to Events
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
			<div className="flex justify-between items-start mb-8">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-white">{event.name}</h1>
						<Badge className={statusBadgeClass(event.status)}>
							{event.status}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-zinc-400">
						<div className="flex items-center gap-1">
							<CalendarDays className="h-4 w-4" />
							<span>{formatDateFull(event.date)}</span>
						</div>
						{event.venues && (
							<div className="flex items-center gap-1">
								<MapPin className="h-4 w-4" />
								<span>{event.venues.name}</span>
							</div>
						)}
						{event.door_time && event.end_time && (
							<div className="flex items-center gap-1">
								<Clock className="h-4 w-4" />
								<span>
									{event.door_time} - {event.end_time}
								</span>
							</div>
						)}
						{event.max_capacity && (
							<div className="flex items-center gap-1">
								<Users className="h-4 w-4" />
								<span>Max {event.max_capacity}</span>
							</div>
						)}
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={handleDownloadItinerary}
						className="border-zinc-700"
					>
						<Download className="h-4 w-4 mr-2" />
						Itinerary PDF
					</Button>
					<Button variant="outline" className="border-zinc-700">
						<Share2 className="h-4 w-4 mr-2" />
						Share
					</Button>
					<Link href={`/events/${eventId}/edit`}>
						<Button className="bg-violet-600 hover:bg-violet-700">
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Button>
					</Link>
					<Button
						variant="destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
						<AlertDialogDescription>
							Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht
							werden.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700">
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteEvent}
							className="bg-red-600 hover:bg-red-700"
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Venue info */}
			{event.venues && (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
					<CardHeader>
						<CardTitle className="text-lg">Venue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-violet-400" />
							<div>
								<p className="font-medium">{event.venues.name}</p>
								<p className="text-sm text-zinc-400">{event.venues.address}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Running Order */}
			<RunningOrder
				key={refreshKey}
				eventId={eventId}
				onAddPerformance={handleAddPerformance}
			/>

			{/* Tasks Section */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						<ListTodo className="h-5 w-5 text-violet-400" />
						Tasks
						<Badge
							variant="secondary"
							className="bg-zinc-800 text-zinc-400 border-zinc-700 ml-1"
						>
							{eventTasks.length}
						</Badge>
					</CardTitle>
					<Button
						onClick={() => setCreateTaskOpen(true)}
						className="bg-violet-600 hover:bg-violet-700"
						size="sm"
					>
						<Plus className="h-4 w-4 mr-1.5" />
						Create Task
					</Button>
				</CardHeader>
				<CardContent>
					{tasksLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-500" />
						</div>
					) : eventTasks.length === 0 ? (
						<div className="text-center py-8">
							<ListTodo className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
							<p className="text-zinc-500 text-sm">
								No tasks for this event yet.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCreateTaskOpen(true)}
								className="mt-3 border-zinc-700"
							>
								<Plus className="h-4 w-4 mr-1.5" />
								Create first task
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{eventTasks.map((task) => (
								<TaskCard
									key={task.id}
									task={task}
									onClick={() => {
										setSelectedTask(task);
										setTaskDetailOpen(true);
									}}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add Performance Modal */}
			<Dialog open={addPerformanceOpen} onOpenChange={setAddPerformanceOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Performance</DialogTitle>
					</DialogHeader>
					<PerformanceForm
						eventId={eventId}
						onSuccess={handlePerformanceSuccess}
						onError={handlePerformanceError}
					/>
				</DialogContent>
			</Dialog>

			{/* Create Task Modal */}
			<Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create Task for {event.name}</DialogTitle>
					</DialogHeader>
					<TaskForm
						mode="create"
						parentTask={{ event_id: eventId }}
						onSubmit={handleCreateTask}
						onCancel={() => setCreateTaskOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Task Detail Modal */}
			<TaskDetailDialog
				task={selectedTask}
				open={taskDetailOpen}
				onOpenChange={(open) => {
					setTaskDetailOpen(open);
					if (!open) setSelectedTask(null);
				}}
				onTaskUpdated={handleTaskUpdated}
				onTaskDeleted={handleTaskDeleted}
			/>
		</div>
	);
}
