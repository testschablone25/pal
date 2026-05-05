"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User } from "lucide-react";
import { getInitials, formatDate, type Task, type Profile } from "./types";

interface TaskDetailMetaProps {
	task: Task;
	profiles: Profile[];
	onFieldSave: (field: string, value: string) => Promise<void>;
}

export function TaskDetailMeta({ task, profiles, onFieldSave }: TaskDetailMetaProps) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="flex items-center gap-2">
				<User className="h-4 w-4 text-zinc-500 shrink-0" />
				<span className="text-sm text-zinc-400">Assignee</span>
				{task.assignee ? (
					<div className="flex items-center gap-1.5">
						<Avatar className="h-5 w-5">
							<AvatarImage src={task.assignee.avatar_url || undefined} />
							<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
								{getInitials(task.assignee.full_name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-zinc-300">
							{task.assignee.full_name || "Unknown"}
						</span>
					</div>
				) : (
					<span className="text-sm text-zinc-500">Unassigned</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
				<span className="text-sm text-zinc-400">Created</span>
				<span className="text-sm text-zinc-300">
					{formatDate(task.created_at)}
				</span>
			</div>

			{task.creator && (
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-zinc-500 shrink-0" />
					<span className="text-sm text-zinc-400">Created by</span>
					<div className="flex items-center gap-1.5">
						<Avatar className="h-5 w-5">
							<AvatarImage src={task.creator.avatar_url || undefined} />
							<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
								{getInitials(task.creator.full_name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-zinc-300">
							{task.creator.full_name || "Unknown"}
						</span>
					</div>
				</div>
			)}

			<div className="flex items-center gap-2">
				<Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
				<span className="text-sm text-zinc-400">Due</span>
				<span className="text-sm text-zinc-300">
					{task.due_date ? formatDate(task.due_date) : "—"}
				</span>
			</div>
		</div>
	);
}
