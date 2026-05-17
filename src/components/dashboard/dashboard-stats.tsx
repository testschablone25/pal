"use client";

import { cn } from "@/lib/utils";
import { type AppRole } from "@/lib/permissions";
import { AlertTriangle, Clock, TrendingUp, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface DashboardStatsProps {
	blockedCount: number;
	pendingApprovalCount: number;
	dueThisWeek: number;
	activeRentalsCount: number;
	canApproveTasks: boolean;
	userRoles: AppRole[];
}

export function DashboardStats({
	blockedCount,
	pendingApprovalCount,
	dueThisWeek,
	activeRentalsCount,
	canApproveTasks,
}: DashboardStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
			{blockedCount > 0 && (
				<Link href="/workflow?blocked=true">
					<div className="group rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 border-l-2 border-l-red-600/50 p-4 hover:border-l-red-500/60 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-red-600/15 rounded-md shrink-0">
								<AlertTriangle className="h-5 w-5 text-red-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-white">{blockedCount}</p>
								<p className="text-xs text-red-400/70 font-medium">Blockiert</p>
							</div>
						</div>
					</div>
				</Link>
			)}

			{canApproveTasks && pendingApprovalCount > 0 && (
				<Link href="/workflow?needs_approval=true">
					<div className="group rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 border-l-2 border-l-amber-600/50 p-4 hover:border-l-amber-500/60 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-amber-600/15 rounded-md shrink-0">
								<Clock className="h-5 w-5 text-amber-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-white">
									{pendingApprovalCount}
								</p>
								<p className="text-xs text-amber-400/70 font-medium">
									Offene Genehmigungen
								</p>
							</div>
						</div>
					</div>
				</Link>
			)}

			{dueThisWeek > 0 && (
				<Link href="/workflow">
					<div className="group rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 border-l-2 border-l-teal-600/50 p-4 hover:border-l-teal-500/60 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-teal-600/15 rounded-md shrink-0">
								<TrendingUp className="h-5 w-5 text-teal-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-white">{dueThisWeek}</p>
								<p className="text-xs text-teal-400/70 font-medium">
									Fällig diese Woche
								</p>
							</div>
						</div>
					</div>
				</Link>
			)}

			{activeRentalsCount > 0 && (
				<Link href="/rentals">
					<div className="group rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 border-l-2 border-l-indigo-600/50 p-4 hover:border-l-indigo-500/60 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-indigo-600/15 rounded-md shrink-0">
								<ArrowLeftRight className="h-5 w-5 text-indigo-400" />
							</div>
							<div>
								<p className="text-2xl font-bold text-white">
									{activeRentalsCount}
								</p>
								<p className="text-xs text-indigo-400/70 font-medium">
									Aktive Verleihe
								</p>
							</div>
						</div>
					</div>
				</Link>
			)}
		</div>
	);
}
