"use client";

import type { TimelineBounds } from "./timeline-utils";
import { generateHourLabels } from "./timeline-utils";

interface TimelineHeaderProps {
	bounds: TimelineBounds;
	pixelsPerHour: number;
}

/** Renders hour labels using pixel positioning. Must be inside the shared scroll container. */
export function TimelineHeader({ bounds, pixelsPerHour }: TimelineHeaderProps) {
	const hours = generateHourLabels(bounds);

	return (
		<div className="relative h-6">
			{hours.map((hour, i) => (
				<div
					key={hour}
					className="absolute text-[10px] text-zinc-500"
					style={{
						left: `${i * pixelsPerHour}px`,
						transform: "translateX(-50%)",
					}}
				>
					{hour}
				</div>
			))}
		</div>
	);
}

/** Generate minute tick marks — 4 ticks per hour, 15 min intervals */
export function generateTicks(bounds: TimelineBounds): number[] {
	const ticks: number[] = [];
	const totalMins = bounds.totalMinutes;
	for (let m = 0; m <= totalMins; m += 15) {
		ticks.push(m);
	}
	return ticks;
}
