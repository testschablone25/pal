"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canAccessRoute, type AppRole } from "@/lib/permissions";
import { Calendar, ArrowRight } from "lucide-react";
import { parseISO } from "date-fns";
import Link from "next/link";

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

interface DashboardEventsProps {
	upcomingEvents: DashboardEvent[];
	userRoles: AppRole[];
	today: string;
}

export function DashboardEvents({
	upcomingEvents,
	userRoles,
	today,
}: DashboardEventsProps) {
	return (
		<div className="rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 overflow-hidden">
			<div className="px-4 pt-4 pb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-violet-600/20 rounded-md">
						<Calendar className="h-4 w-4 text-violet-400" />
					</div>
					<h2 className="text-sm font-semibold text-white">Events</h2>
				</div>
				{canAccessRoute(userRoles, "/events") && (
					<Link href="/events">
						<Button
							variant="ghost"
							size="sm"
							className="text-zinc-500 hover:text-white text-xs"
						>
							Alle <ArrowRight className="h-3 w-3 ml-1" />
						</Button>
					</Link>
				)}
			</div>

			<div className="px-4 pb-4">
				{upcomingEvents.length === 0 ? (
					<p className="text-xs text-zinc-500 py-2">
						Keine Events diese Woche.
					</p>
				) : (
					<div className="space-y-1.5">
						{upcomingEvents.map((event) => {
							const isToday = event.date === today;
							const eventDate = parseISO(event.date);
							return (
								<Link key={event.id} href={`/events/${event.id}`}>
									<div
										className={cn(
											"flex items-center gap-3 p-2.5 rounded-lg transition-all hover:bg-zinc-800/60 cursor-pointer",
											isToday
												? "bg-violet-600/15 border border-violet-600/25"
												: "hover:bg-zinc-800/50",
										)}
									>
										<div
											className={cn(
												"text-center min-w-[38px] shrink-0",
												isToday ? "text-violet-400" : "text-zinc-400",
											)}
										>
											<div className="text-xl font-bold leading-none">
												{eventDate.getDate()}
											</div>
											<div className="text-[10px] uppercase mt-0.5 tracking-wider">
												{eventDate.toLocaleString("de", {
													month: "short",
												})}
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p
												className={cn(
													"text-sm font-medium truncate",
													isToday ? "text-white" : "text-zinc-200",
												)}
											>
												{event.name}
											</p>
											<p className="text-xs text-zinc-500 truncate">
												{event.door_time} · {event.venue_name || "Venue"}
											</p>
										</div>
										{isToday && (
											<Badge className="bg-violet-600 text-xs shrink-0">
												Heute
											</Badge>
										)}
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
