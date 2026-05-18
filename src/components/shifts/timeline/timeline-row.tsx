"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { TimelineBounds } from "./timeline-utils";

interface TimelineRowProps {
	id: string;
	bounds: TimelineBounds;
	pixelsPerHour: number;
	children: ReactNode;
}

/** Droppable row with gridlines in pixels. Labels are rendered by the parent's fixed column. */
export function TimelineRow({
	id,
	bounds,
	pixelsPerHour,
	children,
}: TimelineRowProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: `timeline-row-${id}`,
	});

	const totalHours = Math.ceil(bounds.totalMinutes / 60);

	return (
		<div
			ref={setNodeRef}
			data-timeline-container
			data-timeline-total-minutes={bounds.totalMinutes}
			className={`flex-1 relative h-10 rounded transition-colors ${
				isOver ? "bg-zinc-800" : "bg-zinc-950"
			}`}
		>
			{/* Hour gridlines */}
			{Array.from({ length: totalHours + 1 }, (_, i) => (
				<div
					key={i}
					className="absolute top-0 bottom-0 border-l border-zinc-800/30"
					style={{ left: `${i * pixelsPerHour}px` }}
				/>
			))}
			{/* Half-hour gridlines (subtle) */}
			{Array.from({ length: totalHours }, (_, i) => (
				<div
					key={`half-${i}`}
					className="absolute top-0 bottom-0 border-l border-zinc-800/10"
					style={{ left: `${(i + 0.5) * pixelsPerHour}px` }}
				/>
			))}
			{children}
		</div>
	);
}
