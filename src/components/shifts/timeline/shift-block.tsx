"use client";

import { useDraggable } from "@dnd-kit/core";
import { Loader2, Trash2 } from "lucide-react";
import type { Shift } from "@/lib/staff-shifts/types";
import { getRoleColor } from "@/lib/staff-shifts/types";
import type { TimelineBounds } from "./timeline-utils";
import {
	getTimePositionPx,
	getTimeWidthPx,
	formatTime,
} from "./timeline-utils";

interface ShiftBlockProps {
	shift: Shift;
	bounds: TimelineBounds;
	pixelsPerHour: number;
	saving?: boolean;
	onClick: () => void;
	onDelete?: () => void;
}

export function ShiftBlock({
	shift,
	bounds,
	pixelsPerHour,
	saving = false,
	onClick,
	onDelete,
}: ShiftBlockProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: `shift-bar-${shift.id}`,
			data: {
				shiftId: shift.id,
				startTime: shift.start_time,
				endTime: shift.end_time,
			},
		});

	const colorClass = getRoleColor(shift.role);
	const left = getTimePositionPx(shift.start_time, bounds, pixelsPerHour);
	const width = getTimeWidthPx(
		shift.start_time,
		shift.end_time,
		bounds,
		pixelsPerHour,
	);

	const style: React.CSSProperties = {
		left: `${left}px`,
		width: `${Math.max(width, 40)}px`,
		transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
		zIndex: isDragging ? 50 : 10,
		opacity: isDragging ? 0.5 : undefined,
		cursor: "grab",
	};

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className={`absolute inset-y-1 ${colorClass} rounded opacity-80 hover:opacity-100 transition-all group flex items-center px-1.5 overflow-hidden`}
			style={style}
			onClick={(e) => {
				e.stopPropagation();
				if (!isDragging) onClick();
			}}
		>
			{saving ? (
				<Loader2 className="h-3 w-3 animate-spin text-white shrink-0" />
			) : (
				<>
					<span className="text-[10px] text-white truncate leading-none">
						{formatTime(shift.start_time)}–{formatTime(shift.end_time)}
					</span>
					{onDelete && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-300 transition-opacity"
						>
							<Trash2 className="h-2.5 w-2.5" />
						</button>
					)}
				</>
			)}
		</div>
	);
}
