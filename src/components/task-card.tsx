"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	User,
	MessageSquare,
	ShieldAlert,
	CornerDownRight,
	Paperclip,
} from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";
import { formatDateShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface Task {
	id: string;
	title: string;
	description: string | null;
	status: "todo" | "in_progress" | "pending_approval" | "done" | "cancelled";
	priority: "low" | "medium" | "high" | "urgent";
	assignee_id: string | null;
	event_id: string | null;
	created_at: string;
	updated_at: string;
	attachments?: Array<{
		id: string;
		name: string;
		type: "image" | "video" | "file";
		url: string;
		size: number;
		uploaded_at: string;
		mime_type?: string;
	}> | null;
	assignee?: {
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
	assignees?: Array<{
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	}> | null;
	event?: {
		id: string;
		name: string;
		date: string;
	} | null;
	comment_count?: number;
	blocked: boolean;
	blocked_reason: string | null;
	needs_approval: boolean;
	due_date: string | null;
	scheduled_date: string | null;
	item_ids?: string[];
	parent_task_id?: string | null;
	subtasks?: Task[];
	parent_task?: {
		id: string;
		title: string;
		status: string;
	} | null;
	// Extra fields for runtime compatibility with TaskDetailDialog's Task type
	task_items?: Array<{
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
		goal_sub_location: {
			id: string;
			name: string;
			venue: { id: string; name: string } | null;
		} | null;
	}>;
	creator?: {
		id: string;
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
}

interface TaskCardProps {
	task: Task;
	onClick?: () => void;
}

const priorityConfig = {
	low: {
		label: "Niedrig",
		dotClass: "bg-zinc-500",
	},
	medium: {
		label: "Mittel",
		dotClass: "bg-blue-500",
	},
	high: {
		label: "Hoch",
		dotClass: "bg-orange-500",
	},
	urgent: {
		label: "Dringend",
		dotClass: "bg-red-500",
	},
};

export function TaskCard({ task, onClick }: TaskCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const priority = priorityConfig[task.priority];

	const dueDate = task.due_date ? parseISO(task.due_date) : null;
	const dueDateLabel = dueDate
		? isToday(dueDate)
			? "Heute"
			: formatDateShort(dueDate)
		: null;
	const dueDateClass = dueDate
		? isPast(dueDate) && !isToday(dueDate)
			? "text-red-400 border-red-500/40"
			: isToday(dueDate)
				? "text-amber-400 border-amber-500/40"
				: "text-zinc-400 border-zinc-600"
		: null;

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={cn(
				"bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors ",
				isDragging && "opacity-50 shadow-lg shadow-violet-500/20",
				task.blocked && "border-l-2 border-l-red-500",
			)}
			onClick={onClick}
			{...attributes}
			{...listeners}
		>
			<CardContent className="p-3">
				<div className="flex items-start gap-2">
					<div className="flex-1 min-w-0">
						{/* Parent Task Indicator */}
						{task.parent_task && (
							<div className="flex items-center gap-1 mb-1">
								<CornerDownRight className="h-3 w-3 text-zinc-500 shrink-0" />
								<span className="text-xs text-zinc-500 truncate">
									{task.parent_task.title}
								</span>
							</div>
						)}

						{/* Title */}
						<h4 className="text-sm font-medium text-white truncate mb-2">
							{task.title}
						</h4>

						{/* Blocked indicator */}
						{task.blocked && (
							<div className="flex items-center gap-1 mb-1.5">
								<span className="text-xs font-semibold text-red-400">
									⛔ Blockiert
								</span>
							</div>
						)}

						{/* Priority, Event, and Badges */}
						<div className="flex items-center gap-2 mb-2">
							<div className="flex items-center gap-1.5 text-sm font-semibold text-white">
								<div
									className={cn("h-2 w-2 rounded-full", priority.dotClass)}
								/>
								{priority.label}
							</div>
							{task.event && (
								<div className="text-sm font-semibold text-violet-400">
									• {task.event.name}
								</div>
							)}
							<div className="flex items-center gap-1.5 ml-auto">
								{task.needs_approval && (
									<div className="flex items-center gap-1 text-xs text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
										<ShieldAlert className="h-3 w-3" />
										Approval
									</div>
								)}
								{dueDate && (
									<div
										className={cn("text-xs border px-1.5 py-0.5", dueDateClass)}
									>
										{dueDateLabel}
									</div>
								)}
							</div>
						</div>

						{/* Subtasks (compact inline list) */}
						{task.subtasks && task.subtasks.length > 0 && (
							<div className="mb-2 space-y-0.5">
								{task.subtasks.slice(0, 5).map((sub) => (
									<div
										key={sub.id}
										className="flex items-center gap-1.5 text-xs text-zinc-400"
									>
										<CornerDownRight className="h-3 w-3 text-zinc-600 shrink-0" />
										<div
											className={cn(
												"w-1.5 h-1.5 rounded-full shrink-0",
												sub.status === "done"
													? "bg-emerald-500"
													: sub.status === "in_progress"
														? "bg-blue-500"
														: "bg-zinc-600",
											)}
										/>
										<div
											className={cn(
												"w-1 h-1 rounded-full shrink-0",
												sub.priority === "urgent"
													? "bg-red-500"
													: sub.priority === "high"
														? "bg-orange-500"
														: sub.priority === "medium"
															? "bg-blue-500"
															: "bg-zinc-500",
											)}
										/>
										<span className="truncate">{sub.title}</span>
										{sub.blocked && (
											<span
												className="shrink-0 text-[10px]"
												title={sub.blocked_reason || ""}
											>
												⛔
											</span>
										)}
									</div>
								))}
								{task.subtasks.length > 5 && (
									<div className="flex items-center gap-1.5 text-[10px] text-zinc-600 pl-5">
										+{task.subtasks.length - 5} mehr
									</div>
								)}
							</div>
						)}

						{/* Bottom Row: Assignee + Comment Count */}
						<div className="flex items-center justify-between">
							{/* Assignee Avatars — multi-assignee with overflow */}
							{task.assignees && task.assignees.filter(Boolean).length > 0 ? (
								<div className="flex items-center">
									{task.assignees
										.filter(Boolean)
										.slice(0, 3)
										.map((a) => (
											<Avatar
												key={a.id}
												className="h-6 w-6 -ml-1 first:ml-0 border-2 border-zinc-900"
												title={a.full_name || a.email || ""}
											>
												<AvatarImage
													src={
														a.avatar_url ||
														`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.full_name}`
													}
													className="object-cover"
												/>
												<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[9px]">
													{a.full_name?.charAt(0) || "?"}
												</AvatarFallback>
											</Avatar>
										))}
									{task.assignees.length > 3 && (
										<span className="text-xs text-zinc-500 ml-1.5">
											+{task.assignees.length - 3}
										</span>
									)}
								</div>
							) : task.assignee ? (
								<div className="flex items-center gap-2">
									<Avatar className="h-6 w-6">
										<AvatarImage
											src={
												task.assignee.avatar_url ||
												`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.full_name}`
											}
											className="object-cover"
										/>
										<AvatarFallback className="bg-zinc-800 text-zinc-300">
											<User className="h-3 w-3" />
										</AvatarFallback>
									</Avatar>
									<span className="text-xs text-zinc-400 truncate max-w-[100px]">
										{task.assignee.full_name || "Unknown"}
									</span>
								</div>
							) : (
								<div className="h-6" />
							)}

							{/* Comment Count + Attachments */}
							<div className="flex items-center gap-2">
								{task.comment_count !== undefined && task.comment_count > 0 && (
									<div className="flex items-center gap-1 text-zinc-500">
										<MessageSquare className="h-3 w-3" />
										<span className="text-xs">{task.comment_count}</span>
									</div>
								)}
								{task.attachments && task.attachments.length > 0 && (
									<div className="flex items-center gap-1 text-zinc-500">
										<Paperclip className="h-3 w-3" />
										<span className="text-xs">{task.attachments.length}</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
