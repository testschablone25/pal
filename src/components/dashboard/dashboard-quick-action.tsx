"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: Record<string, string> = {
	violet: "bg-violet-600/15 text-violet-400 group-hover:bg-violet-600/20",
	emerald: "bg-emerald-600/15 text-emerald-400 group-hover:bg-emerald-600/20",
	orange: "bg-orange-600/15 text-orange-400 group-hover:bg-orange-600/20",
	indigo: "bg-indigo-600/15 text-indigo-400 group-hover:bg-indigo-600/20",
	pink: "bg-pink-600/15 text-pink-400 group-hover:bg-pink-600/20",
	teal: "bg-teal-600/15 text-teal-400 group-hover:bg-teal-600/20",
	red: "bg-red-600/15 text-red-400 group-hover:bg-red-600/20",
};

interface QuickActionProps {
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	accent?: keyof typeof ACCENT_COLORS;
}

export function DashboardQuickAction({ href, icon: Icon, label, accent }: QuickActionProps) {
	return (
		<Link href={href}>
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg",
					"bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60",
					"hover:bg-zinc-800/70 hover:border-zinc-700/60",
					"transition-all cursor-pointer group",
				)}
			>
				<div
					className={cn(
						"p-2 rounded-md transition-colors",
						accent && ACCENT_COLORS[accent]
							? ACCENT_COLORS[accent]
							: "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300 group-hover:bg-zinc-700",
					)}
				>
					<Icon className="h-4 w-4" />
				</div>
				<span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-medium truncate max-w-full">
					{label}
				</span>
			</div>
		</Link>
	);
}

export { ACCENT_COLORS };
