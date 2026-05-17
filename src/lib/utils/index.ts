import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Map a status string to consistent badge color classes.
 * Falls back to a neutral zinc color for unknown statuses.
 */
export function statusBadgeClass(status: string): string {
	const map: Record<string, string> = {
		// Event statuses
		published: "bg-green-600/20 text-green-400 border-green-600/50",
		draft: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
		cancelled: "bg-red-600/20 text-red-400 border-red-600/50",

		// Task statuses
		done: "bg-green-600/20 text-green-400 border-green-600/50",
		in_progress: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		pending_approval: "bg-amber-600/20 text-amber-400 border-amber-600/50",
		todo: "bg-zinc-600/20 text-zinc-400 border-zinc-600/50",
		blocked: "bg-red-600/20 text-red-400 border-red-600/50",

		// Shift statuses
		scheduled: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		confirmed: "bg-green-600/20 text-green-400 border-green-600/50",
		completed: "bg-zinc-600/20 text-zinc-400 border-zinc-600/50",

		// Item conditions
		new: "bg-green-600/20 text-green-400 border-green-600/50",
		good: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		fair: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
		poor: "bg-orange-600/20 text-orange-400 border-orange-600/50",
		broken: "bg-red-600/20 text-red-400 border-red-600/50",

		// Availability
		available: "bg-green-600/20 text-green-400 border-green-600/50",
		unavailable: "bg-red-600/20 text-red-400 border-red-600/50",

		// Check-in statuses
		checked_in: "bg-green-600/20 text-green-400 border-green-600/50",
		checked_out: "bg-zinc-600/20 text-zinc-400 border-zinc-600/50",

		// Rental statuses
		active: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		returned: "bg-green-600/20 text-green-400 border-green-600/50",
		overdue: "bg-red-600/20 text-red-400 border-red-600/50",

		// Priority
		urgent: "bg-red-600/20 text-red-400 border-red-600/50",
		high: "bg-orange-600/20 text-orange-400 border-orange-600/50",
		medium: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		low: "bg-zinc-600/20 text-zinc-400 border-zinc-600/50",

		// Performance
		confirmed_performance: "bg-green-600/20 text-green-400 border-green-600/50",
		pending_performance:
			"bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
		cancelled_performance: "bg-red-600/20 text-red-400 border-red-600/50",

		// Venue types
		venue: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		storage: "bg-amber-600/20 text-amber-400 border-amber-600/50",
		office: "bg-emerald-600/20 text-emerald-400 border-emerald-600/50",
		mixed: "bg-purple-600/20 text-purple-400 border-purple-600/50",

		// Swap request statuses
		pending: "bg-amber-600/20 text-amber-400 border-amber-600/50",
		accepted: "bg-blue-600/20 text-blue-400 border-blue-600/50",
		approved: "bg-green-600/20 text-green-400 border-green-600/50",
		declined: "bg-red-600/20 text-red-400 border-red-600/50",
	};

	return map[status] || "bg-zinc-600/20 text-zinc-400 border-zinc-600/50";
}
