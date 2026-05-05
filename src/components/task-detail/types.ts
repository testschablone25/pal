// Shared types for task-detail subcomponents

export interface SubLocation {
	id: string;
	name: string;
	venue: { id: string; name: string } | null;
}

export interface TaskItemEntry {
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

export interface Task {
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

export interface Comment {
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

export interface Profile {
	id: string;
	full_name: string | null;
	email: string | null;
}

export interface Event {
	id: string;
	name: string;
	date: string;
}

export function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export const priorityDotConfig: Record<string, string> = {
	low: "bg-zinc-500",
	medium: "bg-blue-500",
	high: "bg-orange-500",
	urgent: "bg-red-500",
};

export const statusDotConfig: Record<string, string> = {
	todo: "bg-zinc-500",
	in_progress: "bg-blue-500",
	pending_approval: "bg-amber-500",
	done: "bg-green-500",
	cancelled: "bg-red-500",
};
