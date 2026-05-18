"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User, Briefcase } from "lucide-react";
import type { Shift } from "@/lib/staff-shifts/types";
import { statusBadgeClass } from "@/lib/utils";
import { formatTime } from "./timeline/timeline-utils";

interface ShiftDetailsProps {
	shift: Shift;
	subLocationName?: string | null;
}

export function ShiftDetails({ shift, subLocationName }: ShiftDetailsProps) {
	const start = new Date(shift.start_time);
	const end = new Date(shift.end_time);
	const durationHours = (
		(end.getTime() - start.getTime()) /
		(1000 * 60 * 60)
	).toFixed(1);

	return (
		<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
			<CardContent className="pt-6">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex items-start gap-2">
						<User className="h-4 w-4 text-zinc-400 mt-0.5" />
						<div>
							<p className="text-xs text-zinc-500">Staff</p>
							<p className="text-sm text-white">
								{shift.staff?.profiles?.full_name || "Unknown"}
							</p>
						</div>
					</div>
					<div className="flex items-start gap-2">
						<Briefcase className="h-4 w-4 text-zinc-400 mt-0.5" />
						<div>
							<p className="text-xs text-zinc-500">Role</p>
							<p className="text-sm text-white">{shift.role}</p>
						</div>
					</div>
					<div className="flex items-start gap-2">
						<Clock className="h-4 w-4 text-zinc-400 mt-0.5" />
						<div>
							<p className="text-xs text-zinc-500">Time</p>
							<p className="text-sm text-white">
								{formatTime(shift.start_time)} - {formatTime(shift.end_time)}
							</p>
						</div>
					</div>
					<div className="flex items-start gap-2">
						<MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
						<div>
							<p className="text-xs text-zinc-500">Area</p>
							<p className="text-sm text-white">
								{subLocationName || "No specific area"}
							</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800">
					<Badge className={statusBadgeClass(shift.status)}>
						{shift.status}
					</Badge>
					<span className="text-xs text-zinc-500">
						{durationHours}h duration
						{shift.break_minutes > 0 && ` • ${shift.break_minutes}min break`}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
