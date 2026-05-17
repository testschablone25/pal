"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";

interface Task {
	id: string;
	title: string;
	status: string;
	priority: string;
	due_date: string | null;
	event?: {
		id: string | null;
		name: string | null;
		date: string | null;
		venue_id: string | null;
		venue_name: string | null;
	} | null;
}

interface TaskRowProps {
	task: Task;
	onClick: () => void;
	muted?: boolean;
}

const PRIORITY_DOT: Record<string, string> = {
	urgent: "bg-red-500 animate-pulse",
	high: "bg-orange-500",
	medium: "bg-blue-500",
	low: "bg-zinc-500",
};

export function DashboardTaskRow({ task, onClick, muted }: TaskRowProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-all",
				"hover:bg-zinc-800/60 group",
				muted ? "opacity-80" : "",
			)}
		>
			<div
				className={cn(
					"h-1.5 w-1.5 rounded-full shrink-0 transition-all",
					task.status === "done"
						? "bg-green-500"
						: task.status === "in_progress"
							? "bg-blue-500 animate-pulse"
							: "bg-zinc-600",
				)}
			/>
			<div
				className={cn(
					"h-1.5 w-1.5 rounded-full shrink-0",
					PRIORITY_DOT[task.priority] || PRIORITY_DOT.low,
				)}
			/>
			<span
				className={cn(
					"flex-1 text-sm truncate transition-colors",
					muted
						? "text-zinc-400 group-hover:text-zinc-300"
						: "text-zinc-200 group-hover:text-white",
				)}
			>
				{task.title}
			</span>
			<div className="flex items-center gap-2 shrink-0">
				{task.event?.name && (
					<span className="text-xs text-zinc-600 truncate max-w-[80px] hidden sm:block">
						{task.event.name}
					</span>
				)}
				{task.due_date && (
					<Badge
						variant="outline"
						className={cn(
							"text-[10px] px-1.5 py-0 border-zinc-700",
							task.due_date < new Date().toISOString().split("T")[0] &&
								!["done", "cancelled"].includes(task.status)
								? "border-red-700 text-red-400"
								: "text-zinc-500",
						)}
					>
						{formatDateShort(task.due_date)}
					</Badge>
				)}
				{!task.due_date && !task.event?.name && (
					<Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-800 text-zinc-600">
						—
					</Badge>
				)}
				<ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all -translate-x-1 group-hover:translate-x-0" />
			</div>
		</button>
	);
}
