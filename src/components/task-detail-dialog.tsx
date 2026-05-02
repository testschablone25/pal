"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TaskForm } from "./task-form";
import { TaskHistoryTimeline } from "./task-history-timeline";
import { ItemQRDialog } from "./item-qr-dialog";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
	Edit,
	Trash2,
	MessageSquare,
	Calendar,
	User,
	Loader2,
	Send,
	History,
	ShieldCheck,
	ShieldX,
	AlertTriangle,
	Unlock,
	Package,
	Pencil,
	MapPin,
	CheckCircle2,
	Plus,
	QrCode,
	Camera,
	X,
	CornerDownRight,
	Check,
} from "lucide-react";
import { cn, statusBadgeClass } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";

// ===== Types =====

interface SubLocation {
	id: string;
	name: string;
	venue: { id: string; name: string } | null;
}

interface TaskItemEntry {
	item_id: string;
	goal_sub_location_id: string | null;
	delivered_at: string | null;
	item: {
		id: string;
		name: string;
		category: string;
		serial_number: string | null;
		current_location: string | null;
		sub_location_id: string | null;
		qr_token: string | null;
	} | null;
	goal_sub_location: SubLocation | null;
}

interface Task {
	id: string;
	title: string;
	description: string | null;
	status: "todo" | "in_progress" | "pending_approval" | "done" | "cancelled";
	priority: "low" | "medium" | "high" | "urgent";
	assignee_id: string | null;
	event_id: string | null;
	parent_task_id?: string | null;
	parent_task?: {
		id: string;
		title: string;
		status: string;
	} | null;
	created_at: string;
	updated_at: string;
	blocked: boolean;
	blocked_reason: string | null;
	needs_approval: boolean;
	due_date: string | null;
	scheduled_date: string | null;
	assignee?: {
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
	event?: {
		id: string;
		name: string;
		date: string;
	} | null;
	creator?: {
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
	task_items?: TaskItemEntry[];
	subtasks?: Task[];
	comment_count?: number;
}

interface Comment {
	id: string;
	task_id: string;
	author_id: string | null;
	content: string;
	created_at: string;
	author?: {
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
}

interface Profile {
	id: string;
	full_name: string | null;
	email: string | null;
}

interface Event {
	id: string;
	name: string;
	date: string;
}

interface TaskDetailDialogProps {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTaskUpdated: (task: Task) => void;
	onTaskDeleted: (taskId: string) => void;
}

// ===== Constants =====

const PRIORITIES = [
	{ value: "low" as const, labelEn: "Low", labelDe: "Niedrig" },
	{ value: "medium" as const, labelEn: "Medium", labelDe: "Mittel" },
	{ value: "high" as const, labelEn: "High", labelDe: "Hoch" },
	{ value: "urgent" as const, labelEn: "Urgent", labelDe: "Dringend" },
];

const STATUSES = [
	{ value: "todo" as const, labelEn: "To Do", labelDe: "To Do" },
	{
		value: "in_progress" as const,
		labelEn: "In Progress",
		labelDe: "In Bearbeitung",
	},
	{
		value: "pending_approval" as const,
		labelEn: "Pending Approval",
		labelDe: "Freigabe ausstehend",
	},
	{ value: "done" as const, labelEn: "Done", labelDe: "Erledigt" },
	{ value: "cancelled" as const, labelEn: "Cancelled", labelDe: "Abgebrochen" },
];

// ===== Helpers =====

function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ===== Inline Edit Field Component =====

function InlineEditField({
	label,
	value,
	onSave,
	type = "text",
	options,
	children,
}: {
	label: string;
	value: string;
	onSave: (val: string) => Promise<void>;
	type?: "text" | "select" | "date";
	options?: { value: string; label: string }[];
	children?: React.ReactNode;
}) {
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState(value);
	const [saving, setSaving] = useState(false);

	const handleSave = useCallback(async () => {
		if (editValue === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(editValue);
			setEditing(false);
		} catch {
			setEditValue(value);
		} finally {
			setSaving(false);
		}
	}, [editValue, value, onSave]);

	if (editing) {
		return (
			<div className="flex items-center gap-2">
				{type === "select" && options ? (
					<Select
						value={editValue}
						onValueChange={(v) => {
							setEditValue(v);
							setTimeout(() => handleSave(), 0);
						}}
					>
						<SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-800 w-auto min-w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-zinc-900 border-zinc-800">
							{options.map((opt) => (
								<SelectItem
									key={opt.value}
									value={opt.value}
									className="text-xs"
								>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : type === "date" ? (
					<Input
						type="date"
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						onBlur={handleSave}
						className="h-7 text-xs bg-zinc-950 border-zinc-800 w-auto"
						autoFocus
					/>
				) : (
					<Input
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						onBlur={handleSave}
						onKeyDown={(e) => e.key === "Enter" && handleSave()}
						className="h-7 text-xs bg-zinc-950 border-zinc-800 w-auto min-w-[120px]"
						autoFocus
					/>
				)}
				{saving && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
			</div>
		);
	}

	return (
		<div className="group flex items-center gap-2">
			{children || (
				<span className="text-sm text-zinc-300">{value || "—"}</span>
			)}
			<button
				onClick={() => {
					setEditValue(value);
					setEditing(true);
				}}
				className="opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<Pencil className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
			</button>
		</div>
	);
}

// ===== Priority Config (shared) =====

const priorityDotConfig: Record<string, string> = {
	low: "bg-zinc-500",
	medium: "bg-blue-500",
	high: "bg-orange-500",
	urgent: "bg-red-500",
};

const statusDotConfig: Record<string, string> = {
	todo: "bg-zinc-500",
	in_progress: "bg-blue-500",
	pending_approval: "bg-amber-500",
	done: "bg-green-500",
	cancelled: "bg-red-500",
};

// ===== Sub-task Tree Item (recursive) =====

function SubtaskTreeItem({
	sub,
	depth,
	onNavigate,
}: {
	sub: Task;
	depth: number;
	onNavigate: (id: string) => void;
}) {
	return (
		<div className="relative">
			{/* Vertical tree line */}
			{depth > 0 && (
				<div
					className="absolute left-[9px] top-0 bottom-0 w-px bg-zinc-700"
					style={{ height: "calc(100% - 8px)" }}
				/>
			)}
			<div
				className={cn(
					"flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pr-3 cursor-pointer hover:border-zinc-600 transition-colors",
					sub.blocked && "border-l-2 border-l-red-500",
					sub.needs_approval && "border-l-amber-500/50",
				)}
				style={{ paddingLeft: depth > 0 ? `${depth * 20 + 28}px` : "10px" }}
				onClick={() => onNavigate(sub.id)}
			>
				{/* Tree branch connector */}
				{depth > 0 && (
					<div
						className="absolute w-3 h-px bg-zinc-700"
						style={{ left: `${depth * 20 + 10}px`, top: "18px" }}
					/>
				)}

				{/* Status dot */}
				<div
					className={cn(
						"w-2.5 h-2.5 rounded-full shrink-0",
						statusDotConfig[sub.status] || "bg-zinc-500",
					)}
				/>

				{/* Priority dot */}
				<div
					className={cn(
						"w-2 h-2 rounded-full shrink-0",
						priorityDotConfig[sub.priority] || "bg-zinc-500",
					)}
				/>

				{/* Title */}
				<div className="flex-1 min-w-0">
					<p className="text-sm text-zinc-200 truncate">{sub.title}</p>
				</div>

				{/* Blocked badge */}
				{sub.blocked && (
					<span
						className="text-xs text-red-400 shrink-0"
						title={sub.blocked_reason || ""}
					>
						⛔
					</span>
				)}

				{/* Needs approval badge */}
				{sub.needs_approval && (
					<span className="text-xs text-amber-400 shrink-0">⚠️</span>
				)}

				{/* Due date badge (urgent) */}
				{sub.due_date && (
					<span className="text-[10px] text-zinc-500 border border-zinc-700 px-1 py-0.5 shrink-0">
						{formatDateShort(sub.due_date)}
					</span>
				)}

				{/* Assignee avatar */}
				{sub.assignee && (
					<Avatar className="h-5 w-5 shrink-0">
						<AvatarImage src={sub.assignee.avatar_url || undefined} />
						<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
							{getInitials(sub.assignee.full_name)}
						</AvatarFallback>
					</Avatar>
				)}
			</div>

			{/* Recursive children */}
			{sub.subtasks && sub.subtasks.length > 0 && (
				<div className="space-y-1 mt-1">
					{sub.subtasks.map((child) => (
						<SubtaskTreeItem
							key={child.id}
							sub={child}
							depth={depth + 1}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ===== Main Component =====

export function TaskDetailDialog({
	task,
	open,
	onOpenChange,
	onTaskUpdated,
	onTaskDeleted,
}: TaskDetailDialogProps) {
	const { t, locale } = useI18n();
	const { toast } = useToast();

	// Mode
	const [isEditing, setIsEditing] = useState(false);

	// Current user
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	// Comments
	const [comments, setComments] = useState<Comment[]>([]);
	const [newComment, setNewComment] = useState("");
	const [loadingComments, setLoadingComments] = useState(false);
	const [submittingComment, setSubmittingComment] = useState(false);

	// Delete
	const [deleting, setDeleting] = useState(false);

	// Approval
	const [approving, setApproving] = useState(false);
	const [rejectReason, setRejectReason] = useState("");
	const [showRejectInput, setShowRejectInput] = useState(false);
	const [rejecting, setRejecting] = useState(false);

	// Block
	const [blockReason, setBlockReason] = useState("");
	const [showBlockInput, setShowBlockInput] = useState(false);
	const [blocking, setBlocking] = useState(false);

	// Sub-tasks
	const [subtaskTitle, setSubtaskTitle] = useState("");
	const [showSubtaskForm, setShowSubtaskForm] = useState(false);
	const [creatingSubtask, setCreatingSubtask] = useState(false);

	// QR
	const [qrDialogOpen, setQrDialogOpen] = useState(false);
	const [qrItemId, setQrItemId] = useState<string | null>(null);
	const [scannerOpen, setScannerOpen] = useState(false);

	// Reference data for inline editing
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [events, setEvents] = useState<Event[]>([]);

	// Full task data fetched from API (includes subtasks, parent_task)
	const [fullTask, setFullTask] = useState<Task | null>(null);

	// Parent task title (for breadcrumb when parent_task not in API response)
	const [parentTaskTitle, setParentTaskTitle] = useState<string | null>(null);

	// Inline saving
	const [savingField, setSavingField] = useState<string | null>(null);

	useEffect(() => {
		if (open && task) {
			fetchComments();
			getCurrentUser();
			fetchProfiles();
			fetchEvents();

			// Fetch full task data from API to get subtasks and parent info
			fetch(`/api/tasks/${task.id}`)
				.then((r) => {
					if (!r.ok) throw new Error("Failed to fetch full task");
					return r.json();
				})
				.then((fetched) => {
					setFullTask(fetched);
					// Also set parent title from fetched data
					if (fetched.parent_task) {
						setParentTaskTitle(fetched.parent_task.title);
					} else {
						setParentTaskTitle(null);
					}
				})
				.catch((err) => {
					console.error("Failed to fetch full task:", err);
					setFullTask(null);
				});
		} else {
			setFullTask(null);
			setParentTaskTitle(null);
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

	const fetchEvents = async () => {
		try {
			const response = await fetch("/api/events");
			const data = await response.json();
			setEvents(data.events || []);
		} catch (error) {
			console.error("Failed to fetch events:", error);
		}
	};

	// ===== Inline field save =====

	const inlineSave = async (field: string, value: string) => {
		if (!task || !currentUserId) return;
		setSavingField(field);

		const body: Record<string, unknown> = {
			[field]: value === "" && field !== "title" ? null : value,
			changed_by: currentUserId,
		};

		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error("Failed to update");
			const updated = await response.json();
			onTaskUpdated(updated);
			toast({
				title: "Aufgabe aktualisiert",
				description: `Feld „${field}" wurde aktualisiert.`,
			});
		} catch (error) {
			console.error("Inline save failed:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Aktualisieren des Felds.",
			});
		} finally {
			setSavingField(null);
		}
	};

	// ===== Comment =====

	const handleAddComment = async () => {
		if (!task || !newComment.trim()) return;
		setSubmittingComment(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/comments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: newComment, author_id: currentUserId }),
			});
			if (!response.ok) throw new Error("Failed to add comment");
			const comment = await response.json();
			setComments([...comments, comment]);
			setNewComment("");
			toast({
				title: "Kommentar hinzugefügt",
				description: "Der Kommentar wurde erfolgreich hinzugefügt.",
			});
		} catch (error) {
			console.error("Error adding comment:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Hinzufügen des Kommentars.",
			});
		} finally {
			setSubmittingComment(false);
		}
	};

	// ===== Approval =====

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
			toast({
				title: "Aufgabe freigegeben",
				description: "Die Aufgabe wurde erfolgreich freigegeben.",
			});
		} catch (error) {
			console.error("Error approving task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error ? error.message : "Fehler bei der Freigabe.",
			});
		} finally {
			setApproving(false);
		}
	};

	const handleReject = async () => {
		if (!task || !currentUserId || !rejectReason.trim()) return;
		setRejecting(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/reject`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rejected_by: currentUserId,
					reason: rejectReason.trim(),
				}),
			});
			if (!response.ok) throw new Error("Failed to reject");
			const updatedTask = await response.json();
			onTaskUpdated({ ...updatedTask, task_items: task.task_items });
			setShowRejectInput(false);
			setRejectReason("");
			toast({
				title: "Aufgabe abgelehnt",
				description: "Die Aufgabe wurde abgelehnt.",
			});
		} catch (error) {
			console.error("Error rejecting task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error ? error.message : "Fehler bei der Ablehnung.",
			});
		} finally {
			setRejecting(false);
		}
	};

	// ===== Block =====

	const handleToggleBlock = async () => {
		if (!task || !currentUserId) return;
		const shouldBlock = !task.blocked;
		if (shouldBlock && !blockReason.trim()) return;
		setBlocking(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}/block`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					blocked: shouldBlock,
					blocked_reason: shouldBlock ? blockReason.trim() : null,
					changed_by: currentUserId,
				}),
			});
			if (!response.ok) throw new Error("Failed to update block");
			const updatedTask = await response.json();
			onTaskUpdated({ ...updatedTask, task_items: task.task_items });
			setShowBlockInput(false);
			setBlockReason("");
			toast({
				title: shouldBlock ? "Aufgabe blockiert" : "Blockierung aufgehoben",
				description: shouldBlock
					? "Die Aufgabe wurde blockiert."
					: "Die Blockierung wurde aufgehoben.",
			});
		} catch (error) {
			console.error("Error toggling block:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Aktualisieren des Blockstatus.",
			});
		} finally {
			setBlocking(false);
		}
	};

	// ===== Sub-task =====

	const handleCreateSubtask = async () => {
		if (!task || !currentUserId || !subtaskTitle.trim()) return;
		setCreatingSubtask(true);
		try {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: subtaskTitle.trim(),
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
			setSubtaskTitle("");
			setShowSubtaskForm(false);
			toast({
				title: "Unteraufgabe erstellt",
				description: `${subtaskTitle.trim()} wurde erfolgreich erstellt.`,
			});
		} catch (error) {
			console.error("Error creating sub-task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Erstellen der Unteraufgabe.",
			});
		} finally {
			setCreatingSubtask(false);
		}
	};

	// ===== Navigation (breadcrumb / sub-task click) =====

	const handleNavigateToTask = useCallback(
		async (taskId: string) => {
			try {
				const response = await fetch(`/api/tasks/${taskId}`);
				if (!response.ok) {
					const errBody = await response.json().catch(() => ({}));
					console.error("Navigate API error:", response.status, errBody);
					throw new Error(
						errBody.error || `Failed to fetch task (${response.status})`,
					);
				}
				const fullTask = await response.json();
				onTaskUpdated(fullTask);
			} catch (error) {
				console.error("Failed to navigate to task:", error);
			}
		},
		[onTaskUpdated],
	);

	// ===== Main form update =====

	const handleUpdateTask = async (values: Record<string, unknown>) => {
		if (!task) return;
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			if (!response.ok) throw new Error("Failed to update task");
			const updatedTask = await response.json();
			onTaskUpdated(updatedTask);
			setIsEditing(false);
			toast({
				title: "Aufgabe aktualisiert",
				description: "Die Aufgabe wurde erfolgreich aktualisiert.",
			});
		} catch (error) {
			console.error("Error updating task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Aktualisieren der Aufgabe.",
			});
			throw error;
		}
	};

	const handleDeleteTask = async () => {
		if (!task) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete task");
			onTaskDeleted(task.id);
			onOpenChange(false);
			toast({
				title: "Aufgabe gelöscht",
				description: "Die Aufgabe wurde erfolgreich gelöscht.",
			});
		} catch (error) {
			console.error("Error deleting task:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Löschen der Aufgabe.",
			});
		} finally {
			setDeleting(false);
		}
	};

	// ===== Deliver via QR scan simulation =====

	const handleDeliverItem = async (
		itemId: string,
		goalSubLocationId: string,
	) => {
		if (!task || !currentUserId) return;
		try {
			const response = await fetch(`/api/tasks/${task.id}/deliver-item`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					item_id: itemId,
					scanned_sub_location_id: goalSubLocationId,
					scanned_by: currentUserId,
				}),
			});
			if (!response.ok) {
				const err = await response.json();
				console.error("Delivery failed:", err);
				return;
			}
			// Refresh task to get updated delivered_at
			const taskResponse = await fetch(`/api/tasks/${task.id}`);
			if (taskResponse.ok) {
				const updated = await taskResponse.json();
				onTaskUpdated(updated);
			}
		} catch (error) {
			console.error("Error delivering item:", error);
		}
	};

	if (!task) return null;

	const displaySubtasks = fullTask?.subtasks || task.subtasks || [];
	const subtasksDone = displaySubtasks.filter(
		(s) => s.status === "done",
	).length;
	const subtasksTotal = displaySubtasks.length;

	// Helper: render a location string from a SubLocation
	const formatLocation = (sl: SubLocation | null): string => {
		if (!sl) return "—";
		return sl.venue ? `${sl.venue.name} > ${sl.name}` : sl.name;
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">
							{isEditing ? t("action.edit_task") : t("detail.task_details")}
						</DialogTitle>
					</DialogHeader>

					{/* === PARENT BREADCRUMB === */}
					{(fullTask?.parent_task ||
						task.parent_task ||
						(task.parent_task_id && parentTaskTitle)) && (
						<button
							onClick={() => handleNavigateToTask(task.parent_task_id!)}
							className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-400 transition-colors mb-2 group"
						>
							<CornerDownRight className="h-3.5 w-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
							<span className="truncate">
								{fullTask?.parent_task?.title ||
									task.parent_task?.title ||
									parentTaskTitle}
							</span>
							{(fullTask?.parent_task?.status || task.parent_task?.status) && (
								<Badge
									variant="outline"
									className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]"
								>
									{fullTask?.parent_task?.status || task.parent_task?.status}
								</Badge>
							)}
						</button>
					)}

					{isEditing ? (
						<TaskForm
							task={{
								...task,
								items: task.task_items?.map((ti) => ({
									item_id: ti.item_id,
									goal_sub_location_id: ti.goal_sub_location_id,
								})),
								item_ids: task.task_items?.map((ti) => ti.item_id) || [],
							}}
							mode="edit"
							onSubmit={handleUpdateTask}
							onCancel={() => setIsEditing(false)}
						/>
					) : (
						<div className="space-y-6">
							{/* === HEADER === */}
							<div>
								<InlineEditField
									label="title"
									value={task.title}
									onSave={(v) => inlineSave("title", v)}
								>
									<h3 className="text-xl font-semibold text-white">
										{task.title}
									</h3>
								</InlineEditField>
								<div className="flex items-center gap-2 flex-wrap mt-2">
									{/* Status inline edit */}
									<InlineEditField
										label="status"
										value={task.status}
										onSave={(v) => inlineSave("status", v)}
										type="select"
										options={STATUSES.map((s) => ({
											value: s.value,
											label: locale === "de" ? s.labelDe : s.labelEn,
										}))}
									>
										<Badge
											variant="outline"
											className={statusBadgeClass(task.status)}
										>
											{STATUSES.find((s) => s.value === task.status)?.labelEn}
										</Badge>
									</InlineEditField>

									{/* Priority inline edit */}
									<InlineEditField
										label="priority"
										value={task.priority}
										onSave={(v) => inlineSave("priority", v)}
										type="select"
										options={PRIORITIES.map((p) => ({
											value: p.value,
											label: locale === "de" ? p.labelDe : p.labelEn,
										}))}
									>
										<Badge
											variant="outline"
											className={statusBadgeClass(task.priority)}
										>
											{
												PRIORITIES.find((p) => p.value === task.priority)
													?.labelEn
											}
										</Badge>
									</InlineEditField>

									{task.event && (
										<Badge
											variant="outline"
											className="bg-violet-600/20 text-violet-400 border-violet-600/50"
										>
											{task.event.name}
										</Badge>
									)}
									{task.blocked && (
										<Badge
											variant="outline"
											className={statusBadgeClass("blocked")}
										>
											<AlertTriangle className="h-3 w-3 mr-1" />
											{t("action.blocked")}
										</Badge>
									)}
									{task.needs_approval &&
										task.status !== "pending_approval" && (
											<Badge
												variant="outline"
												className={statusBadgeClass("pending_approval")}
											>
												{t("action.needs_approval")}
											</Badge>
										)}
								</div>
							</div>

							{/* === APPROVAL === */}
							{task.status === "pending_approval" && (
								<div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
									<div className="flex items-center gap-2 mb-3">
										<ShieldCheck className="h-4 w-4 text-yellow-400" />
										<span className="text-sm font-medium text-yellow-400">
											{t("approval.title")}
										</span>
									</div>
									<p className="text-sm text-zinc-400 mb-3">
										{t("approval.description")}
									</p>
									{showRejectInput ? (
										<div className="space-y-2">
											<Textarea
												value={rejectReason}
												onChange={(e) => setRejectReason(e.target.value)}
												placeholder={t("approval.reject_placeholder")}
												className="bg-zinc-950 border-zinc-800 min-h-[80px]"
											/>
											<div className="flex gap-2">
												<Button
													onClick={handleReject}
													disabled={!rejectReason.trim() || rejecting}
													size="sm"
													className="bg-red-600 hover:bg-red-700"
												>
													{rejecting ? (
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													) : (
														<ShieldX className="h-4 w-4 mr-2" />
													)}
													{t("action.confirm_reject")}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setShowRejectInput(false);
														setRejectReason("");
													}}
													className="border-zinc-800"
												>
													{t("app.cancel")}
												</Button>
											</div>
										</div>
									) : (
										<div className="flex gap-2">
											<Button
												onClick={handleApprove}
												disabled={approving}
												size="sm"
												className="bg-green-600 hover:bg-green-700"
											>
												{approving ? (
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												) : (
													<ShieldCheck className="h-4 w-4 mr-2" />
												)}
												{t("action.approve")}
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setShowRejectInput(true)}
												className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
											>
												<ShieldX className="h-4 w-4 mr-2" />
												{t("action.reject")}
											</Button>
										</div>
									)}
								</div>
							)}

							{task.blocked && task.blocked_reason && (
								<div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
									<div className="flex items-center gap-2 mb-1">
										<AlertTriangle className="h-4 w-4 text-red-400" />
										<span className="text-sm font-medium text-red-400">
											{t("action.blocked")}
										</span>
									</div>
									<p className="text-sm text-zinc-400">{task.blocked_reason}</p>
								</div>
							)}

							{/* === DESCRIPTION === */}
							<div>
								<h4 className="text-sm font-medium text-zinc-400 mb-2">
									{t("detail.description")}
								</h4>
								<InlineEditField
									label="description"
									value={task.description || ""}
									onSave={(v) => inlineSave("description", v)}
								>
									{task.description ? (
										<p className="text-zinc-300 whitespace-pre-wrap text-sm">
											{task.description}
										</p>
									) : (
										<p className="text-zinc-500 text-sm italic">
											{t("detail.no_description")}
										</p>
									)}
								</InlineEditField>
							</div>

							{/* === LINKED ITEMS === */}
							{task.task_items && task.task_items.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
										<Package className="h-4 w-4" />
										{t("detail.linked_items")} ({task.task_items.length})
									</h4>
									<div className="space-y-2">
										{task.task_items.map((entry) => {
											const item = entry.item;
											const goalLoc = entry.goal_sub_location;
											const delivered = !!entry.delivered_at;
											const goalName = formatLocation(goalLoc);
											const currentName = item?.current_location || "—";

											return (
												<div
													key={entry.item_id}
													className={cn(
														"flex items-start gap-3 border rounded-lg p-3",
														delivered
															? "bg-emerald-900/10 border-emerald-700/40"
															: "bg-zinc-800/50 border-zinc-700",
													)}
												>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<p className="text-sm font-medium text-zinc-200 truncate">
																{item?.name || "Unknown"}
															</p>
															{delivered && (
																<Badge
																	variant="outline"
																	className={cn(
																		statusBadgeClass("done"),
																		"text-[10px]",
																	)}
																>
																	<Check className="h-3 w-3 mr-0.5" />
																	{t("item.status_delivered")}
																</Badge>
															)}
														</div>
														{item?.serial_number && (
															<p className="text-xs text-zinc-500">
																{t("field.serial_number")}: {item.serial_number}
															</p>
														)}
														<div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
															<span className="flex items-center gap-1">
																<MapPin className="h-3 w-3" />
																{t("item.current_location")}:{" "}
																<span className="text-zinc-400">
																	{currentName}
																</span>
															</span>
															<span className="flex items-center gap-1">
																<MapPin className="h-3 w-3 text-violet-400" />
																{t("item.goal_location")}:{" "}
																<span
																	className={
																		goalLoc
																			? "text-violet-400"
																			: "text-zinc-600"
																	}
																>
																	{goalName}
																</span>
															</span>
														</div>
													</div>

													<div className="flex items-center gap-1 shrink-0">
														{/* QR code button */}
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() => {
																setQrItemId(entry.item_id);
																setQrDialogOpen(true);
															}}
															title={t("action.view_qr_code")}
														>
															<QrCode className="h-3.5 w-3.5 text-zinc-500" />
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* === META INFO === */}
							<div className="grid grid-cols-2 gap-3">
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-zinc-500 shrink-0" />
									<span className="text-sm text-zinc-400">
										{t("detail.assignee_label")}
									</span>
									<InlineEditField
										label="assignee_id"
										value={task.assignee_id || ""}
										onSave={(v) => inlineSave("assignee_id", v)}
										type="select"
										options={[
											{ value: "", label: t("detail.no_assignee") },
											...profiles.map((p) => ({
												value: p.id,
												label: p.full_name || p.email || t("app.unknown"),
											})),
										]}
									>
										{task.assignee ? (
											<div className="flex items-center gap-1.5">
												<Avatar className="h-5 w-5">
													<AvatarImage
														src={task.assignee.avatar_url || undefined}
													/>
													<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
														{getInitials(task.assignee.full_name)}
													</AvatarFallback>
												</Avatar>
												<span className="text-sm text-zinc-300">
													{task.assignee.full_name || t("app.unknown")}
												</span>
											</div>
										) : (
											<span className="text-sm text-zinc-500">
												{t("detail.no_assignee")}
											</span>
										)}
									</InlineEditField>
								</div>

								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
									<span className="text-sm text-zinc-400">
										{t("detail.created_label")}
									</span>
									<span className="text-sm text-zinc-300">
										{formatDate(task.created_at)}
									</span>
								</div>

								{task.creator && (
									<div className="flex items-center gap-2">
										<User className="h-4 w-4 text-zinc-500 shrink-0" />
										<span className="text-sm text-zinc-400">
											{t("detail.created_by_label")}
										</span>
										<div className="flex items-center gap-1.5">
											<Avatar className="h-5 w-5">
												<AvatarImage
													src={task.creator.avatar_url || undefined}
												/>
												<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
													{getInitials(task.creator.full_name)}
												</AvatarFallback>
											</Avatar>
											<span className="text-sm text-zinc-300">
												{task.creator.full_name || t("app.unknown")}
											</span>
										</div>
									</div>
								)}

								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
									<span className="text-sm text-zinc-400">
										{t("detail.due_label")}
									</span>
									<InlineEditField
										label="due_date"
										value={task.due_date || ""}
										onSave={(v) => inlineSave("due_date", v)}
										type="date"
									>
										<span className="text-sm text-zinc-300">
											{task.due_date ? formatDate(task.due_date) : "—"}
										</span>
									</InlineEditField>
								</div>

								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
									<span className="text-sm text-zinc-400">
										{t("detail.scheduled_label")}
									</span>
									<InlineEditField
										label="scheduled_date"
										value={task.scheduled_date || ""}
										onSave={(v) => inlineSave("scheduled_date", v)}
										type="date"
									>
										<span className="text-sm text-zinc-300">
											{task.scheduled_date
												? formatDate(task.scheduled_date)
												: "—"}
										</span>
									</InlineEditField>
								</div>
							</div>

							{/* === ACTIONS === */}
							<div className="flex gap-2 flex-wrap">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(true)}
									className="border-zinc-800"
								>
									<Edit className="h-4 w-4 mr-2" />
									{t("app.edit")}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleDeleteTask}
									disabled={deleting}
									className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
								>
									{deleting ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Trash2 className="h-4 w-4 mr-2" />
									)}
									{t("app.delete")}
								</Button>

								{task.status === "in_progress" && !task.blocked && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowBlockInput(true)}
										className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
									>
										<AlertTriangle className="h-4 w-4 mr-2" />
										{t("action.block_task")}
									</Button>
								)}

								{task.blocked && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleToggleBlock}
										disabled={blocking}
										className="border-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
									>
										{blocking ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Unlock className="h-4 w-4 mr-2" />
										)}
										{t("action.unblock_task")}
									</Button>
								)}
							</div>

							{/* Block Input */}
							{showBlockInput && (
								<div className="space-y-2">
									<Textarea
										value={blockReason}
										onChange={(e) => setBlockReason(e.target.value)}
										placeholder={t("block.reason_placeholder")}
										className="bg-zinc-950 border-zinc-800 min-h-[80px]"
									/>
									<div className="flex gap-2">
										<Button
											onClick={handleToggleBlock}
											disabled={!blockReason.trim() || blocking}
											size="sm"
											className="bg-red-600 hover:bg-red-700"
										>
											{blocking ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : (
												<AlertTriangle className="h-4 w-4 mr-2" />
											)}
											{t("action.confirm_block")}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setShowBlockInput(false);
												setBlockReason("");
											}}
											className="border-zinc-800"
										>
											{t("app.cancel")}
										</Button>
									</div>
								</div>
							)}

							{/* === SUB-TASKS === */}
							<Separator className="bg-zinc-800" />
							<div>
								<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
									<CornerDownRight className="h-4 w-4" />
									{t("detail.subtasks")}
									{subtasksTotal > 0 && (
										<Badge
											variant="outline"
											className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2"
										>
											{subtasksDone}/{subtasksTotal}{" "}
											{t("subtask.progress", {
												done: subtasksDone,
												total: subtasksTotal,
											})}
										</Badge>
									)}
								</h4>

								{subtasksTotal > 0 && (
									<div className="space-y-1 mb-3">
										{displaySubtasks.map((sub) => (
											<SubtaskTreeItem
												key={sub.id}
												sub={sub}
												depth={0}
												onNavigate={handleNavigateToTask}
											/>
										))}
									</div>
								)}

								{showSubtaskForm ? (
									<div className="flex gap-2">
										<Input
											value={subtaskTitle}
											onChange={(e) => setSubtaskTitle(e.target.value)}
											placeholder={t("subtask.add_title")}
											className="bg-zinc-950 border-zinc-800 h-9 text-sm flex-1"
											autoFocus
											onKeyDown={(e) =>
												e.key === "Enter" && handleCreateSubtask()
											}
										/>
										<Button
											onClick={handleCreateSubtask}
											disabled={!subtaskTitle.trim() || creatingSubtask}
											size="sm"
											className="bg-violet-600 hover:bg-violet-700"
										>
											{creatingSubtask ? (
												<Loader2 className="h-4 w-4 mr-1 animate-spin" />
											) : (
												<Check className="h-4 w-4 mr-1" />
											)}
											{t("app.create")}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setShowSubtaskForm(false);
												setSubtaskTitle("");
											}}
											className="border-zinc-800"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								) : (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowSubtaskForm(true)}
										className="border-zinc-800 w-full"
									>
										<Plus className="h-4 w-4 mr-2" />
										{t("action.add_subtask")}
									</Button>
								)}
							</div>

							{/* === COMMENTS === */}
							<Separator className="bg-zinc-800" />
							<div>
								<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
									<MessageSquare className="h-4 w-4" />
									{t("detail.comments")} ({comments.length})
								</h4>

								<div className="space-y-4 mb-4">
									{loadingComments ? (
										<div className="flex items-center justify-center py-4">
											<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
										</div>
									) : comments.length === 0 ? (
										<p className="text-sm text-zinc-500 text-center py-4">
											{t("comment.no_comments")}
										</p>
									) : (
										comments.map((comment) => (
											<div key={comment.id} className="flex gap-3">
												<Avatar className="h-8 w-8 shrink-0">
													<AvatarImage
														src={comment.author?.avatar_url || undefined}
													/>
													<AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
														{getInitials(comment.author?.full_name || null)}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-1">
														<span className="text-sm font-medium text-zinc-300">
															{comment.author?.full_name || t("app.unknown")}
														</span>
														<span className="text-xs text-zinc-500">
															{formatDate(comment.created_at)}
														</span>
													</div>
													<p className="text-sm text-zinc-400 whitespace-pre-wrap">
														{comment.content}
													</p>
												</div>
											</div>
										))
									)}
								</div>

								<div className="flex gap-2">
									<Textarea
										value={newComment}
										onChange={(e) => setNewComment(e.target.value)}
										placeholder={t("comment.placeholder")}
										className="bg-zinc-950 border-zinc-800 min-h-[80px]"
									/>
								</div>
								<div className="flex justify-end mt-2">
									<Button
										onClick={handleAddComment}
										disabled={!newComment.trim() || submittingComment}
										size="sm"
										className="bg-violet-600 hover:bg-violet-700"
									>
										{submittingComment ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Send className="h-4 w-4 mr-2" />
										)}
										{t("comment.send")}
									</Button>
								</div>
							</div>

							{/* === HISTORY === */}
							<Separator className="bg-zinc-800" />
							<div>
								<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
									<History className="h-4 w-4" />
									{t("history.title")}
								</h4>
								<TaskHistoryTimeline taskId={task.id} />
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Item QR Code Dialog */}
			{qrItemId && (
				<ItemQRDialog
					itemId={qrItemId}
					itemName={
						task.task_items?.find((ti) => ti.item_id === qrItemId)?.item
							?.name || ""
					}
					open={qrDialogOpen}
					onOpenChange={setQrDialogOpen}
				/>
			)}
		</>
	);
}
