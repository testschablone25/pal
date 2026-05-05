"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { TaskDetailView } from "./task-detail/task-detail-view";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { Task, Comment, Profile, Event } from "./task-detail/types";

interface TaskDetailDialogProps {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTaskUpdated: (task: Task) => void;
	onTaskDeleted: (taskId: string) => void;
}

export function TaskDetailDialog({
	task,
	open,
	onOpenChange,
	onTaskUpdated,
	onTaskDeleted,
}: TaskDetailDialogProps) {
	const { t } = useI18n();
	const { toast } = useToast();

	const [isEditing, setIsEditing] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [comments, setComments] = useState<Comment[]>([]);
	const [loadingComments, setLoadingComments] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [approving, setApproving] = useState(false);
	const [rejecting, setRejecting] = useState(false);
	const [blocking, setBlocking] = useState(false);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [fullTask, setFullTask] = useState<Task | null>(null);
	const [parentTaskTitle, setParentTaskTitle] = useState<string | null>(null);

	useEffect(() => {
		if (open && task) {
			fetchComments();
			getCurrentUser();
			fetchProfiles();
			fetchEvents();
			fetchFullTask();
		} else {
			setFullTask(null);
			setParentTaskTitle(null);
			setIsEditing(false);
		}
	}, [open, task]);

	const getCurrentUser = async () => {
		try {
			const supabase = createClient();
			const { data } = await supabase.auth.getUser();
			if (data?.user) setCurrentUserId(data.user.id);
		} catch (error) {
			console.error("Failed to get current user:", error);
		}
	};

	const fetchComments = async () => {
		if (!task) return;
		setLoadingComments(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/comments`);
			const data = await response.json();
			setComments(data.comments || []);
		} catch (error) {
			console.error("Failed to fetch comments:", error);
		} finally {
			setLoadingComments(false);
		}
	};

	const fetchProfiles = async () => {
		try {
			const response = await fetch("/api/profiles");
			const data = await response.json();
			setProfiles(data.profiles || []);
		} catch (error) {
			console.error("Failed to fetch profiles:", error);
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

	const fetchFullTask = async () => {
		if (!task) return;
		try {
			const response = await fetch(`/api/tasks/${task.id}`);
			if (!response.ok) throw new Error("Failed to fetch full task");
			const fetched = await response.json();
			setFullTask(fetched);
			if (fetched.parent_task) {
				setParentTaskTitle(fetched.parent_task.title);
			}
		} catch (err) {
			console.error("Failed to fetch full task:", err);
			setFullTask(null);
		}
	};

	const handleFieldSave = async (field: string, value: string) => {
		if (!task || !currentUserId) return;
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					[field]: value === "" && field !== "title" ? null : value,
					changed_by: currentUserId,
				}),
			});
			if (!response.ok) throw new Error("Failed to update");
			const updated = await response.json();
			onTaskUpdated(updated);
		} catch (error) {
			console.error("Field save failed:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to update field.",
			});
		}
	};

	const handleApprove = async () => {
		if (!task || !currentUserId) return;
		setApproving(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/approve`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ approved_by: currentUserId }),
			});
			if (!response.ok) throw new Error("Failed to approve");
			const updatedTask = await response.json();
			onTaskUpdated({ ...updatedTask, task_items: task.task_items });
			toast({ title: "Task approved", description: "The task has been approved." });
		} catch (error) {
			console.error("Error approving task:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to approve.",
			});
		} finally {
			setApproving(false);
		}
	};

	const handleReject = async (reason: string) => {
		if (!task || !currentUserId) return;
		setRejecting(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/reject`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rejected_by: currentUserId, reason }),
			});
			if (!response.ok) throw new Error("Failed to reject");
			const updatedTask = await response.json();
			onTaskUpdated({ ...updatedTask, task_items: task.task_items });
			toast({ title: "Task rejected", description: "The task has been rejected." });
		} catch (error) {
			console.error("Error rejecting task:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to reject.",
			});
		} finally {
			setRejecting(false);
		}
	};

	const handleToggleBlock = async (reason: string) => {
		if (!task || !currentUserId) return;
		const shouldBlock = !task.blocked;
		setBlocking(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/block`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					blocked: shouldBlock,
					blocked_reason: shouldBlock ? reason : null,
					changed_by: currentUserId,
				}),
			});
			if (!response.ok) throw new Error("Failed to update block");
			const updatedTask = await response.json();
			onTaskUpdated({ ...updatedTask, task_items: task.task_items });
			toast({
				title: shouldBlock ? "Task blocked" : "Task unblocked",
			});
		} catch (error) {
			console.error("Error toggling block:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to update block status.",
			});
		} finally {
			setBlocking(false);
		}
	};

	const handleDelete = async () => {
		if (!task) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
			if (!response.ok) throw new Error("Failed to delete task");
			onTaskDeleted(task.id);
			onOpenChange(false);
			toast({ title: "Task deleted" });
		} catch (error) {
			console.error("Error deleting task:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to delete.",
			});
		} finally {
			setDeleting(false);
		}
	};

	const handleUpdateTask = async (values: Record<string, unknown>) => {
		if (!task) return;
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			if (!response.ok) {
				const errBody = await response.json().catch(() => ({}));
				throw new Error(errBody.error || `Failed to update (${response.status})`);
			}
			const updatedTask = await response.json();
			onTaskUpdated(updatedTask);
			setIsEditing(false);
			toast({ title: "Task updated" });
		} catch (error) {
			console.error("Error updating task:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to update task.",
			});
			throw error;
		}
	};

	const handleCreateSubtask = async (title: string) => {
		if (!task || !currentUserId) return;
		const response = await fetch("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title,
				status: "todo",
				assignee_id: task.assignee_id,
				event_id: task.event_id,
				priority: task.priority,
				parent_task_id: task.id,
				created_by: currentUserId,
			}),
		});
		if (!response.ok) throw new Error("Failed to create sub-task");
		const newSubtask = await response.json();
		onTaskUpdated({
			...task,
			subtasks: [...(task.subtasks || []), newSubtask],
		});
		toast({ title: "Sub-task created", description: `${title} created.` });
	};

	const handleNavigateToTask = useCallback(
		async (taskId: string) => {
			try {
				const response = await fetch(`/api/tasks/${taskId}`);
				if (!response.ok) throw new Error("Failed to fetch task");
				const fullTaskData = await response.json();
				onTaskUpdated(fullTaskData);
			} catch (error) {
				console.error("Failed to navigate to task:", error);
			}
		},
		[onTaskUpdated],
	);

	if (!task) return null;

	const displaySubtasks = fullTask?.subtasks || task.subtasks || [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-white">
						{isEditing ? "Edit Task" : "Task Details"}
					</DialogTitle>
				</DialogHeader>

				{isEditing ? (
					<TaskForm
						task={{
							...(fullTask || task),
							items: (fullTask || task).task_items?.map((ti) => ({
								item_id: ti.item_id,
								goal_sub_location_id: ti.goal_sub_location_id,
							})),
							item_ids:
								(fullTask || task).task_items?.map((ti) => ti.item_id) || [],
						}}
						mode="edit"
						onSubmit={handleUpdateTask}
						onCancel={() => setIsEditing(false)}
					/>
				) : (
					<TaskDetailView
						task={task}
						fullTask={fullTask}
						currentUserId={currentUserId}
						comments={comments}
						loadingComments={loadingComments}
						onCommentsChange={setComments}
						subtasks={displaySubtasks}
						onNavigateToTask={handleNavigateToTask}
						onCreateSubtask={handleCreateSubtask}
						onEditRequest={() => setIsEditing(true)}
						onApprove={handleApprove}
						onReject={handleReject}
						onToggleBlock={handleToggleBlock}
						onDelete={handleDelete}
						deleting={deleting}
						approving={approving}
						rejecting={rejecting}
						blocking={blocking}
						onFieldSave={handleFieldSave}
						profiles={profiles}
						parentTaskTitle={parentTaskTitle}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
