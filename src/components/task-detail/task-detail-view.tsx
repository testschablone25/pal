"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TaskHistoryTimeline } from "@/components/task-history-timeline";
import { cn, statusBadgeClass } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";
import {
	Calendar,
	User,
	CornerDownRight,
	History,
	MessageSquare,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TaskDetailItems } from "./task-detail-items";
import { TaskDetailActions } from "./task-detail-actions";
import { TaskDetailComments } from "./task-detail-comments";
import { TaskDetailSubtasks } from "./task-detail-subtasks";
import { TaskDetailMeta } from "./task-detail-meta";
import type { Task, Comment, Profile, Event } from "./types";

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

interface TaskDetailViewProps {
	task: Task;
	fullTask: Task | null;
	currentUserId: string | null;

	// Comments
	comments: Comment[];
	loadingComments: boolean;
	onCommentsChange: (comments: Comment[]) => void;

	// Subtasks
	subtasks: Task[];
	onNavigateToTask: (taskId: string) => void;
	onCreateSubtask: (title: string) => Promise<void>;

	// Actions
	onEditRequest: () => void;
	onApprove: () => Promise<void>;
	onReject: (reason: string) => Promise<void>;
	onToggleBlock: (reason: string) => Promise<void>;
	onDelete: () => Promise<void>;

	// Loading states
	deleting?: boolean;
	approving?: boolean;
	rejecting?: boolean;
	blocking?: boolean;

	// Meta
	onFieldSave: (field: string, value: string) => Promise<void>;
	profiles: Profile[];
	parentTaskTitle: string | null;
}

export function TaskDetailView({
	task,
	fullTask,
	currentUserId,
	comments,
	loadingComments,
	onCommentsChange,
	subtasks,
	onNavigateToTask,
	onCreateSubtask,
	onEditRequest,
	onApprove,
	onReject,
	onToggleBlock,
	onDelete,
	deleting,
	approving,
	rejecting,
	blocking,
	onFieldSave,
	profiles,
	parentTaskTitle,
}: TaskDetailViewProps) {
	const { t, locale } = useI18n();

	return (
		<div className="space-y-6">
			{/* Parent breadcrumb */}
			{(fullTask?.parent_task ||
				task.parent_task ||
				(task.parent_task_id && parentTaskTitle)) && (
				<button
					onClick={() => onNavigateToTask(task.parent_task_id!)}
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

			{/* Header */}
			<div>
				<h3 className="text-xl font-semibold text-white">{task.title}</h3>
				<div className="flex items-center gap-2 flex-wrap mt-2">
					<Badge variant="outline" className={statusBadgeClass(task.status)}>
						{STATUSES.find((s) => s.value === task.status)?.labelEn}
					</Badge>
					<Badge variant="outline" className={statusBadgeClass(task.priority)}>
						{PRIORITIES.find((p) => p.value === task.priority)?.labelEn}
					</Badge>
					{task.event && (
						<Badge
							variant="outline"
							className="bg-violet-600/20 text-violet-400 border-violet-600/50"
						>
							{task.event.name}
						</Badge>
					)}
					{task.blocked && (
						<Badge variant="outline" className={statusBadgeClass("blocked")}>
							{t("action.blocked")}
						</Badge>
					)}
					{task.needs_approval && task.status !== "pending_approval" && (
						<Badge
							variant="outline"
							className={statusBadgeClass("pending_approval")}
						>
							{t("action.needs_approval")}
						</Badge>
					)}
				</div>
			</div>

			{/* Approval & blocked banners */}
			<TaskDetailActions
				task={task}
				currentUserId={currentUserId}
				onApprove={onApprove}
				onReject={onReject}
				onToggleBlock={onToggleBlock}
				onEditRequest={onEditRequest}
				onDelete={onDelete}
				deleting={deleting}
				approving={approving}
				rejecting={rejecting}
				blocking={blocking}
			/>

			{/* Description */}
			<div>
				<h4 className="text-sm font-medium text-zinc-400 mb-2">
					{t("detail.description")}
				</h4>
				{task.description ? (
					<p className="text-zinc-300 whitespace-pre-wrap text-sm">
						{task.description}
					</p>
				) : (
					<p className="text-zinc-500 text-sm italic">
						{t("detail.no_description")}
					</p>
				)}
			</div>

			{/* Linked Items */}
			<TaskDetailItems taskItems={task.task_items || []} />

			{/* Meta info (assignee, events, dates) */}
			<TaskDetailMeta
				task={fullTask || task}
				profiles={profiles}
				onFieldSave={onFieldSave}
			/>

			{/* Subtasks */}
			<TaskDetailSubtasks
				task={task}
				subtasks={subtasks}
				currentUserId={currentUserId}
				onNavigate={onNavigateToTask}
				onCreateSubtask={onCreateSubtask}
			/>

			{/* Comments */}
			<Separator className="bg-zinc-800" />
			<div>
				<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
					<MessageSquare className="h-4 w-4" />
					{t("detail.comments")} ({comments.length})
				</h4>
				<TaskDetailComments
					taskId={task.id}
					comments={comments}
					loading={loadingComments}
					currentUserId={currentUserId}
					onCommentsChange={onCommentsChange}
				/>
			</div>

			{/* History */}
			<Separator className="bg-zinc-800" />
			<div>
				<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
					<History className="h-4 w-4" />
					{t("history.title")}
				</h4>
				<TaskHistoryTimeline taskId={task.id} />
			</div>
		</div>
	);
}
