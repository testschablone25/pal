"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateShort, formatTime } from "@/lib/dates";
import { canAccessRoute, type AppRole } from "@/lib/permissions";
import { Clock, Users } from "lucide-react";
import Link from "next/link";

interface ShiftEvent {
	id: string;
	name: string;
	date: string;
}

interface ShiftStaffProfile {
	full_name: string | null;
	email: string | null;
}

interface ShiftStaff {
	id: string;
	role: string;
	profiles: ShiftStaffProfile | null;
}

interface Shift {
	id: string;
	event_id: string;
	role: string;
	start_time: string;
	end_time: string;
	status: string;
	event: ShiftEvent | null;
	staff: ShiftStaff | null;
}

interface StaffRecord {
	id: string;
	profile_id: string | null;
	role: string;
}

interface DashboardShiftsProps {
	staffRecord: StaffRecord | null;
	todayShifts: Shift[];
	upcomingShifts: Shift[];
	colleagues: Shift[];
	userRoles: AppRole[];
	getInitials: (name: string | null | undefined) => string;
}

export function DashboardShifts({
	staffRecord,
	todayShifts,
	upcomingShifts,
	colleagues,
	userRoles,
	getInitials,
}: DashboardShiftsProps) {
	return (
		<>
			{/* Today's Shift */}
			<div className="rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 overflow-hidden">
				<div className="px-4 pt-4 pb-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="p-1.5 bg-emerald-600/20 rounded-md">
							<Clock className="h-4 w-4 text-emerald-400" />
						</div>
						<h2 className="text-sm font-semibold text-white">Schichtplan</h2>
					</div>
					<div className="flex items-center gap-2">
						{staffRecord &&
							canAccessRoute(userRoles, "/staff/availability") && (
								<Link href="/staff/availability?view=me">
									<Button
										size="sm"
										className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs h-6 px-2"
									>
										Verfügbarkeit
									</Button>
								</Link>
							)}
					</div>
				</div>

				<div className="px-4 pb-4 space-y-2">
					{!staffRecord ? (
						<p className="text-xs text-zinc-500 py-2">
							Kein Staff-Profil verknüpft.
						</p>
					) : todayShifts.length === 0 && upcomingShifts.length === 0 ? (
						<p className="text-xs text-zinc-500 py-2">
							Keine anstehenden Schichten.
						</p>
					) : (
						<>
							{todayShifts.map((shift) => (
								<div
									key={shift.id}
									className="p-3 bg-emerald-600/10 border border-emerald-700/20 rounded-md"
								>
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm font-semibold text-white">
											{shift.event?.name}
										</span>
										<Badge className="bg-emerald-600/30 text-emerald-300 text-xs border-0">
											{shift.role}
										</Badge>
									</div>
									<div className="flex items-center gap-1.5 text-xs text-zinc-400">
										<Clock className="h-3 w-3" />
										<span>
											{formatTime(shift.start_time)} —{" "}
											{formatTime(shift.end_time)}
										</span>
									</div>
								</div>
							))}

							{upcomingShifts.slice(0, 2).map((shift) => (
								<div key={shift.id} className="p-2.5 bg-zinc-800/40 rounded-lg">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-zinc-200">
												{shift.event?.name}
											</p>
											<p className="text-xs text-zinc-500">
												{formatDateShort(shift.event?.date || "")}
											</p>
										</div>
										<Badge
											variant="outline"
											className="text-xs border-zinc-700 text-zinc-400"
										>
											{shift.role}
										</Badge>
									</div>
								</div>
							))}
						</>
					)}
				</div>
			</div>

			{/* Colleagues */}
			<div className="rounded-lg bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 overflow-hidden">
				<div className="px-4 pt-4 pb-3 flex items-center gap-2">
					<div className="p-1.5 bg-zinc-700/50 rounded-md">
						<Users className="h-4 w-4 text-zinc-400" />
					</div>
					<h2 className="text-sm font-semibold text-white">Team</h2>
					{colleagues.length > 0 && (
						<Badge className="bg-zinc-800 text-zinc-400 text-xs">
							{colleagues.length}
						</Badge>
					)}
				</div>

				<div className="px-4 pb-4">
					{colleagues.length === 0 ? (
						<p className="text-xs text-zinc-500 py-2">
							Keine Kollegen in deinen Schichten.
						</p>
					) : (
						<div className="space-y-2">
							{[...new Map(colleagues.map((c) => [c.staff?.id, c])).values()]
								.slice(0, 6)
								.map((colleague) => {
									const name =
										colleague.staff?.profiles?.full_name ||
										colleague.staff?.profiles?.email?.split("@")[0] ||
										"Unknown";
									return (
										<div
											key={colleague.id}
											className="flex items-center gap-2.5 p-2 bg-zinc-800/40 rounded-lg"
										>
											<Avatar className="h-7 w-7">
												<AvatarFallback className="text-xs bg-zinc-700 text-zinc-300">
													{getInitials(name)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-sm text-zinc-200 truncate">{name}</p>
											</div>
											<Badge
												variant="outline"
												className="text-xs border-zinc-700 text-zinc-400 shrink-0"
											>
												{colleague.staff?.role}
											</Badge>
										</div>
									);
								})}
							{colleagues.length > 6 && (
								<p className="text-xs text-zinc-600 text-center py-1">
									+{colleagues.length - 6} weitere
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
