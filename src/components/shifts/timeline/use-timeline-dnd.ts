"use client";

import { useState, useCallback } from "react";
import {
	DragEndEvent,
	DragStartEvent,
	DragMoveEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import type { Shift } from "@/lib/staff-shifts/types";

interface UseTimelineDndOptions {
	onShiftMoved?: (
		shiftId: string,
		newStartTime: string,
		newEndTime: string,
	) => Promise<void>;
}

interface UseTimelineDndReturn {
	activeDragShift: Shift | null;
	dragDelta: number;
	savingIndicator: string | null;
	sensors: ReturnType<typeof useSensors>;
	handleDragStart: (event: DragStartEvent) => void;
	handleDragMove: (event: DragMoveEvent) => void;
	handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

export function useTimelineDnd(
	shifts: Shift[],
	options: UseTimelineDndOptions = {},
): UseTimelineDndReturn {
	const [activeDragShift, setActiveDragShift] = useState<Shift | null>(null);
	const [dragDelta, setDragDelta] = useState(0);
	const [savingIndicator, setSavingIndicator] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Minimum drag distance to start (distinguish click from drag)
			},
		}),
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const shiftId = event.active.data.current?.shiftId as string;
			const shift = shifts.find((s) => s.id === shiftId);
			if (shift) {
				setActiveDragShift(shift);
				setDragDelta(0);
			}
		},
		[shifts],
	);

	const handleDragMove = useCallback((event: DragMoveEvent) => {
		setDragDelta(event.delta.x);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, delta } = event;
			setActiveDragShift(null);
			setDragDelta(0);

			const shiftId = active.data.current?.shiftId as string;
			const originalStartTime = active.data.current?.startTime as string;
			const originalEndTime = active.data.current?.endTime as string;
			if (!shiftId || !originalStartTime || !originalEndTime) return;

			// Only move if dragged significantly
			if (Math.abs(delta.x) < 5) return;

			// Compute pixel-to-minutes based on container width
			const containerEl = document.querySelector("[data-timeline-container]");
			if (!containerEl) return;
			const containerWidth = containerEl.clientWidth;
			if (containerWidth === 0) return;

			const boundsData = containerEl.getAttribute(
				"data-timeline-total-minutes",
			);
			const totalMinutes = boundsData ? parseInt(boundsData, 10) : 720; // default 12h
			const deltaMinutes = (delta.x / containerWidth) * totalMinutes;

			if (Math.abs(deltaMinutes) < 1) return;

			const snappedDelta = Math.round(deltaMinutes / 15) * 15;
			const newStartTime = snapTo15Min(originalStartTime, snappedDelta);
			const newEndTime = snapTo15Min(originalEndTime, snappedDelta);

			if (newStartTime === originalStartTime && newEndTime === originalEndTime)
				return;

			setSavingIndicator(shiftId);
			try {
				await options.onShiftMoved?.(shiftId, newStartTime, newEndTime);
			} finally {
				setSavingIndicator(null);
			}
		},
		[options.onShiftMoved],
	);

	return {
		activeDragShift,
		dragDelta,
		savingIndicator,
		sensors,
		handleDragStart,
		handleDragMove,
		handleDragEnd,
	};
}

function snapTo15Min(dateStr: string, deltaMinutes: number): string {
	const date = new Date(dateStr);
	date.setTime(date.getTime() + deltaMinutes * 60 * 1000);
	const minutes = date.getMinutes();
	const snappedMinutes = Math.round(minutes / 15) * 15;
	date.setMinutes(snappedMinutes);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.toISOString();
}
