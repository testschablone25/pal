"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CornerDownRight, Plus, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";
import {
	getInitials,
	statusDotConfig,
	priorityDotConfig,
	type Task,
} from "./types";

interface SubtaskTreeItemProps {
	sub: Task;
	depth: number;
	onNavigate: (id: string) => void;
}

function SubtaskTreeItem({ sub, depth, onNavigate }: SubtaskTreeItemProps) {
	return (
		<div className="relative">
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
				{depth > 0 && (
					<div
						className="absolute w-3 h-px bg-zinc-700"
						style={{ left: `${depth * 20 + 10}px`, top: "18px" }}
					/>
				)}

				<div
					className={cn(
						"w-2.5 h-2.5 rounded-full shrink-0",
						statusDotConfig[sub.status] || "bg-zinc-500",
					)}
				/>
				<div
					className={cn(
						"w-2 h-2 rounded-full shrink-0",
						priorityDotConfig[sub.priority] || "bg-zinc-500",
					)}
				/>

				<div className="flex-1 min-w-0">
					<p className="text-sm text-zinc-200 truncate">{sub.title}</p>
				</div>

				{sub.blocked && (
					<span
						className="text-xs text-red-400 shrink-0"
						title={sub.blocked_reason || ""}
					>
						⛔
					</span>
				)}
				{sub.needs_approval && (
					<span className="text-xs text-amber-400 shrink-0">⚠️</span>
				)}
				{sub.due_date && (
					<span className="text-[10px] text-zinc-500 border border-zinc-700 px-1 py-0.5 shrink-0">
						{formatDateShort(sub.due_date)}
					</span>
				)}
				{sub.assignee && (
					<Avatar className="h-5 w-5 shrink-0">
						<AvatarImage src={sub.assignee.avatar_url || undefined} />
						<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
							{getInitials(sub.assignee.full_name)}
						</AvatarFallback>
					</Avatar>
				)}
			</div>

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

interface TaskDetailSubtasksProps {
	subtasks: Task[];
	onNavigate: (taskId: string) => void;
	onCreateSubtask: (title: string) => Promise<void>;
}

export function TaskDetailSubtasks({
	subtasks,
	onNavigate,
	onCreateSubtask,
}: TaskDetailSubtasksProps) {
	const { toast } = useToast();
	const [subtaskTitle, setSubtaskTitle] = useState("");
	const [showSubtaskForm, setShowSubtaskForm] = useState(false);
	const [creatingSubtask, setCreatingSubtask] = useState(false);

	const subtasksDone = subtasks.filter((s) => s.status === "done").length;
	const subtasksTotal = subtasks.length;

	const handleCreateSubtask = async () => {
		if (!subtaskTitle.trim()) return;
		setCreatingSubtask(true);
		try {
			await onCreateSubtask(subtaskTitle.trim());
			setSubtaskTitle("");
			setShowSubtaskForm(false);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Subtask konnte nicht erstellt werden",
			});
		} finally {
			setCreatingSubtask(false);
		}
	};

	return (
		<div>
			<Separator className="bg-zinc-800 mb-4" />
			<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
				<CornerDownRight className="h-4 w-4" />
				Subtasks
				{subtasksTotal > 0 && (
					<Badge
						variant="outline"
						className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2"
					>
						{subtasksDone}/{subtasksTotal}
					</Badge>
				)}
			</h4>

			{subtasksTotal > 0 && (
				<div className="space-y-1 mb-3">
					{subtasks.map((sub) => (
						<SubtaskTreeItem
							key={sub.id}
							sub={sub}
							depth={0}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}

			{showSubtaskForm ? (
				<div className="flex gap-2">
					<Input
						value={subtaskTitle}
						onChange={(e) => setSubtaskTitle(e.target.value)}
						placeholder="Subtask title"
						className="bg-zinc-950 border-zinc-800 h-9 text-sm flex-1"
						autoFocus
						onKeyDown={(e) => e.key === "Enter" && handleCreateSubtask()}
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
						Create
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setShowSubtaskForm(false);
							setSubtaskTitle("");
						}}
						className="border-zinc-700"
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
					Add Subtask
				</Button>
			)}
		</div>
	);
}
