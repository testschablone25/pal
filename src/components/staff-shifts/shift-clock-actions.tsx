"use client";

import { Button } from "@/components/ui/button";
import { Clock, ArrowUpDown, Trash2, Loader2 } from "lucide-react";
import type { Shift } from "@/lib/staff-shifts/types";
import { formatTime } from "@/lib/staff-shifts/utils";

interface ShiftClockActionsProps {
	shift: Shift;
	clockingIn: string | null;
	clockingOut: string | null;
	onClockIn: (shiftId: string) => void;
	onClockOut: (shiftId: string) => void;
	onOpenSwap: (shift: Shift) => void;
	onDeleteClick: (shift: Shift) => void;
}

export function ShiftClockActions({
	shift,
	clockingIn,
	clockingOut,
	onClockIn,
	onClockOut,
	onOpenSwap,
	onDeleteClick,
}: ShiftClockActionsProps) {
	// Determine if clock-in/out is available based on shift status
	const canClockIn =
		shift.status === "scheduled" ||
		(shift.status === "confirmed" && !shift.clocked_in_at);
	const canClockOut =
		shift.status === "confirmed" &&
		shift.clocked_in_at &&
		!shift.clocked_out_at;

	return (
		<div className="flex items-center gap-2">
			{canClockIn && (
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
					title="Clock In"
					onClick={(e) => {
						e.stopPropagation();
						onClockIn(shift.id);
					}}
					disabled={clockingIn === shift.id}
				>
					{clockingIn === shift.id ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Clock className="h-4 w-4" />
					)}
				</Button>
			)}
			{canClockOut && (
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
					title="Clock Out"
					onClick={(e) => {
						e.stopPropagation();
						onClockOut(shift.id);
					}}
					disabled={clockingOut === shift.id}
				>
					{clockingOut === shift.id ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ArrowUpDown className="h-4 w-4" />
					)}
				</Button>
			)}
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
				title="Request Swap"
				onClick={(e) => {
					e.stopPropagation();
					onOpenSwap(shift);
				}}
			>
				<ArrowUpDown className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
				onClick={(e) => {
					e.stopPropagation();
					onDeleteClick(shift);
				}}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}

interface ShiftInfoRowProps {
	clockedInAt?: string | null;
	clockedOutAt?: string | null;
}

export function ShiftInfoRow({ clockedInAt, clockedOutAt }: ShiftInfoRowProps) {
	return (
		<>
			{clockedInAt && (
				<p className="text-xs text-emerald-400 mt-1">
					Clocked in at {formatTime(clockedInAt)}
				</p>
			)}
			{clockedOutAt && (
				<p className="text-xs text-blue-400 mt-1">
					Clocked out at {formatTime(clockedOutAt)}
				</p>
			)}
		</>
	);
}
