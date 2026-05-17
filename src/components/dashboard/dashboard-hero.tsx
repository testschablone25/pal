"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateFull } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getRoleBadges, type AppRole } from "@/lib/permissions";
import { PartyPopper, Settings, LogOut } from "lucide-react";
import Link from "next/link";

interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
}

interface DashboardEvent {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
	status: string;
	venue_id: string | null;
	venue_name: string | null;
}

interface DashboardHeroProps {
	profile: UserProfile | null;
	todaysEvent: DashboardEvent | null;
	userRoles: AppRole[];
	canAccessAdmin: boolean;
	onSignOut: () => void;
	getInitials: (name: string | null | undefined) => string;
}

export function DashboardHero({
	profile,
	todaysEvent,
	userRoles,
	canAccessAdmin,
	onSignOut,
	getInitials,
}: DashboardHeroProps) {
	const roleBadges = getRoleBadges(userRoles);

	return (
		<div className="relative overflow-hidden rounded-xl bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 shadow-sm">
			<div className="relative p-8">
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
					{/* Left: Greeting */}
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<p className="text-sm text-zinc-500 font-medium tracking-wide uppercase">
								{formatDateFull(new Date().toISOString())}
							</p>
						</div>

						<h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">
							Moin,{" "}
							<span className="text-violet-400">
								{profile?.full_name?.split(" ")[0] ||
									profile?.email?.split("@")[0]}
							</span>
							!
						</h1>

						{todaysEvent ? (
							<div className="flex items-center gap-3 mt-4 p-3 bg-violet-600/10 border border-violet-600/20 rounded-md">
								<div className="p-2 bg-violet-600/20 rounded-md">
									<PartyPopper className="h-5 w-5 text-violet-400" />
								</div>
								<div>
									<p className="text-xs text-violet-400 font-medium uppercase tracking-wider">
										Heute Abend
									</p>
									<p className="text-white font-semibold text-lg">
										{todaysEvent.name}
									</p>
									<p className="text-xs text-zinc-400">
										{todaysEvent.door_time} —{" "}
										{todaysEvent.venue_name || "Venue"}
									</p>
								</div>
							</div>
						) : (
							<p className="text-zinc-500 mt-3 text-sm">
								Kein Event heute — genieße den freien Abend.
							</p>
						)}
					</div>

					{/* Right: Avatar + quick actions */}
					<div className="flex flex-col items-end gap-3 shrink-0">
						<div className="flex items-center gap-2 flex-wrap justify-end">
							{roleBadges.slice(0, 3).map(({ role, label, color }) => (
								<Badge key={role} className={cn("text-xs", color)}>
									{label}
								</Badge>
							))}
						</div>

						<Avatar className="h-14 w-14 border-2 border-violet-800/60 ring-1 ring-violet-900/40">
							<AvatarFallback className="bg-violet-700 text-white text-xl font-bold">
								{getInitials(profile?.full_name)}
							</AvatarFallback>
						</Avatar>

						<div className="flex items-center gap-2">
							{canAccessAdmin && (
								<Link href="/admin">
									<Button
										variant="outline"
										size="sm"
										className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
									>
										<Settings className="h-3.5 w-3.5 mr-1.5" />
										Admin
									</Button>
								</Link>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={onSignOut}
								className="text-zinc-500 hover:text-zinc-300"
							>
								<LogOut className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
