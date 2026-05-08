"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User, X, Loader2, Pencil } from "lucide-react";
import { getInitials, formatDate, type Task, type Profile } from "./types";

interface TaskDetailMetaProps {
	task: Task;
	profiles: Profile[];
	onFieldSave: (field: string, value: string) => Promise<void>;
}

export function TaskDetailMeta({
	task,
	profiles,
	onFieldSave,
}: TaskDetailMetaProps) {
	const [editingAssignee, setEditingAssignee] = useState(false);
	const [savingAssignee, setSavingAssignee] = useState(false);

	const handleAssigneeChange = async (profileId: string) => {
		setSavingAssignee(true);
		try {
			await onFieldSave("assignee_id", profileId);
			setEditingAssignee(false);
		} finally {
			setSavingAssignee(false);
		}
	};

	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="flex items-center gap-2">
				<User className="h-4 w-4 text-zinc-500 shrink-0" />
				<span className="text-sm text-zinc-400">Assignee</span>
				{editingAssignee ? (
					<div className="flex items-center gap-1.5">
						<select
							className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
							defaultValue={task.assignee_id || ""}
							onChange={(e) => handleAssigneeChange(e.target.value)}
							disabled={savingAssignee}
							autoFocus
						>
							<option value="" disabled>
								Select person...
							</option>
							<option value="">— Unassign —</option>
							{profiles.map((p) => (
								<option key={p.id} value={p.id}>
									{p.full_name || p.email || p.id}
								</option>
							))}
						</select>
						{savingAssignee ? (
							<Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin" />
						) : (
							<button
								onClick={() => setEditingAssignee(false)}
								className="text-zinc-500 hover:text-zinc-300"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>
				) : task.assignee ? (
					<button
						onClick={() => setEditingAssignee(true)}
						className="flex items-center gap-1.5 hover:bg-zinc-800/60 rounded px-1 -mx-1 transition-colors group"
					>
						<Avatar className="h-5 w-5">
							<AvatarImage src={task.assignee.avatar_url || undefined} />
							<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
								{getInitials(task.assignee.full_name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-zinc-300">
							{task.assignee.full_name || "Unknown"}
						</span>
						<Pencil className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
					</button>
				) : (
					<button
						onClick={() => setEditingAssignee(true)}
						className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 rounded px-1 -mx-1 transition-colors group"
					>
						<span>+ Assign</span>
						<Pencil className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
					</button>
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
