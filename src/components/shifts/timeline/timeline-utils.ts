/**
 * Event-driven timeline utilities.
 * Computes positions and widths relative to an event's door_time → end_time span,
 * instead of the old hardcoded 18:00-06:00.
 */

export interface TimelineBounds {
	startHour: number; // hour of door_time (e.g. 20)
	startMinute: number; // minute of door_time (e.g. 0)
	endHour: number; // hour of end_time (e.g. 4)
	endMinute: number; // minute of end_time (e.g. 0)
	totalMinutes: number; // total span in minutes
}

/** Parse "HH:MM" string into hours and minutes */
export function parseTimeString(time: string): {
	hours: number;
	minutes: number;
} {
	const [h, m] = time.split(":").map(Number);
	return { hours: h || 0, minutes: m || 0 };
}

/** Compute timeline bounds from door_time and end_time */
export function getTimelineBounds(
	doorTime: string | null,
	endTime: string | null,
): TimelineBounds {
	const door = doorTime ? parseTimeString(doorTime) : { hours: 18, minutes: 0 };
	const end = endTime ? parseTimeString(endTime) : { hours: 6, minutes: 0 };

	const startTotal = door.hours * 60 + door.minutes;
	let endTotal = end.hours * 60 + end.minutes;

	// If end is before or equal to start, it wraps past midnight
	if (endTotal <= startTotal) {
		endTotal += 24 * 60;
	}

	return {
		startHour: door.hours,
		startMinute: door.minutes,
		endHour: end.hours,
		endMinute: end.minutes,
		totalMinutes: endTotal - startTotal,
	};
}

/**
 * Compute timeline bounds from the union of:
 * - The event's door_time → end_time (if provided)
 * - The earliest shift start → latest shift end among actual shifts
 * This ensures shifts starting before door_time (e.g. setup at 11:00, doors at 22:00)
 * are still visible on the timeline.
 */
export function getBoundsFromShifts(
	doorTime: string | null,
	endTime: string | null,
	shifts: { start_time: string; end_time: string }[],
): TimelineBounds {
	// Start with event hours as baseline
	const door = doorTime ? parseTimeString(doorTime) : { hours: 18, minutes: 0 };
	const end = endTime ? parseTimeString(endTime) : { hours: 6, minutes: 0 };

	let earliestHour = door.hours;
	let earliestMin = door.minutes;
	let latestHour = end.hours;
	let latestMin = end.minutes;

	// Expand bounds to cover all shifts
	for (const shift of shifts) {
		const start = parseTimeParts(shift.start_time);
		const shiftEnd = parseTimeParts(shift.end_time);

		// Earliest shift start (compare as minutes since midnight)
		const startMins = start.hours * 60 + start.minutes;
		const earliestMins = earliestHour * 60 + earliestMin;
		if (startMins < earliestMins) {
			earliestHour = start.hours;
			earliestMin = start.minutes;
		}

		// Latest shift end (compare as minutes since midnight, accounting for wrap)
		let shiftEndMins = shiftEnd.hours * 60 + shiftEnd.minutes;
		let latestMins = latestHour * 60 + latestMin;

		// Normalize: if shift end is before the current end, it might wrap past midnight
		if (shiftEndMins <= earliestMins && shiftEndMins < 12 * 60) {
			shiftEndMins += 24 * 60;
		}
		if (latestMins <= earliestMins && latestMins < 12 * 60) {
			latestMins += 24 * 60;
		}

		if (shiftEndMins > latestMins) {
			// Shift end is later (normalized for wrap) — update latest
			latestHour = shiftEnd.hours;
			latestMin = shiftEnd.minutes;
		}
	}

	const startTotal = earliestHour * 60 + earliestMin;
	let endTotal = latestHour * 60 + latestMin;

	// If end is before or equal to start, it wraps past midnight
	if (endTotal <= startTotal) {
		endTotal += 24 * 60;
	}

	return {
		startHour: earliestHour,
		startMinute: earliestMin,
		endHour: latestHour,
		endMinute: latestMin,
		totalMinutes: endTotal - startTotal,
	};
}

/** Parse a timestamp (ISO string) into local hours/minutes */
export function parseTimeParts(isoString: string): {
	hours: number;
	minutes: number;
} {
	const d = new Date(isoString);
	if (!isNaN(d.getTime())) {
		return { hours: d.getHours(), minutes: d.getMinutes() };
	}
	// Fallback: extract from ISO string
	const match = isoString.match(/T(\d{2}):(\d{2})/);
	if (!match) return { hours: 0, minutes: 0 };
	return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

/** Format a timestamp to HH:MM string */
export function formatTime(dateTime: string): string {
	const { hours, minutes } = parseTimeParts(dateTime);
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Get position as percentage from door_time start */
export function getTimePosition(
	dateTime: string,
	bounds: TimelineBounds,
): number {
	const { hours, minutes } = parseTimeParts(dateTime);
	const startTotal = bounds.startHour * 60 + bounds.startMinute;
	let itemTotal = hours * 60 + minutes;

	// If item time is before door_time (wrapped past midnight), add 24h
	if (itemTotal < startTotal) {
		itemTotal += 24 * 60;
	}

	const offsetMinutes = itemTotal - startTotal;
	return (offsetMinutes / bounds.totalMinutes) * 100;
}

/** Get shift bar width as percentage of timeline */
export function getTimeWidth(
	startTime: string,
	endTime: string,
	bounds: TimelineBounds,
): number {
	const startParts = parseTimeParts(startTime);
	const endParts = parseTimeParts(endTime);

	const startTotal = bounds.startHour * 60 + bounds.startMinute;
	let itemStart = startParts.hours * 60 + startParts.minutes;
	let itemEnd = endParts.hours * 60 + endParts.minutes;

	// Handle midnight wrap
	if (itemStart < startTotal) itemStart += 24 * 60;
	if (itemEnd < startTotal) itemEnd += 24 * 60;
	if (itemEnd <= itemStart) itemEnd += 24 * 60;

	const diffMinutes = itemEnd - itemStart;
	return (diffMinutes / bounds.totalMinutes) * 100;
}

/** Generate hour labels for the timeline header */
export function generateHourLabels(bounds: TimelineBounds): string[] {
	const labels: string[] = [];
	const totalHours = Math.ceil(bounds.totalMinutes / 60);

	for (let i = 0; i <= totalHours; i++) {
		const currentMinutes =
			(bounds.startHour * 60 + bounds.startMinute + i * 60) % (24 * 60);
		const h = Math.floor(currentMinutes / 60);
		const m = currentMinutes % 60;
		labels.push(
			`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
		);
	}

	return labels;
}

/** Snap a timestamp by a delta in minutes, round to nearest 15 min */
export function ensureUtc(isoString: string): string {
	if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(isoString)) return isoString;
	return isoString + "Z";
}

export function snapTo15Minutes(dateStr: string, deltaMinutes: number): string {
	const date = new Date(ensureUtc(dateStr));
	date.setTime(date.getTime() + deltaMinutes * 60 * 1000);
	const minutes = date.getMinutes();
	const snappedMinutes = Math.round(minutes / 15) * 15;
	date.setMinutes(snappedMinutes);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.toISOString();
}

/** Get browser's local timezone offset as ISO-8601 suffix */
export function getLocalTimezoneOffset(): string {
	const offset = -new Date().getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	const h = String(Math.floor(abs / 60)).padStart(2, "0");
	const m = String(abs % 60).padStart(2, "0");
	return `${sign}${h}:${m}`;
}

/** Get time input value (HH:MM) from a timestamp */
export function getTimeInputValue(dateTime: string): string {
	const { hours, minutes } = parseTimeParts(dateTime);
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Pixel-based timeline (horizontal scroll + dynamic zoom)            */
/* ------------------------------------------------------------------ */

export const DEFAULT_PX_PER_HOUR = 100;
export const MIN_PX_PER_HOUR = 60;
export const MAX_PX_PER_HOUR = 200;

/** Total inner width of the scrollable timeline in pixels */
export function getTimelineInnerWidth(
	bounds: TimelineBounds,
	pxPerHour: number,
): number {
	return (bounds.totalMinutes / 60) * pxPerHour;
}

/** Get shift bar left offset in pixels */
export function getTimePositionPx(
	dateTime: string,
	bounds: TimelineBounds,
	pxPerHour: number,
): number {
	const { hours, minutes } = parseTimeParts(dateTime);
	const startTotal = bounds.startHour * 60 + bounds.startMinute;
	let itemTotal = hours * 60 + minutes;
	if (itemTotal < startTotal) itemTotal += 24 * 60;
	const offsetMinutes = itemTotal - startTotal;
	return (offsetMinutes * pxPerHour) / 60;
}

/** Get shift bar width in pixels */
export function getTimeWidthPx(
	startTime: string,
	endTime: string,
	bounds: TimelineBounds,
	pxPerHour: number,
): number {
	const startParts = parseTimeParts(startTime);
	const endParts = parseTimeParts(endTime);
	const startTotal = bounds.startHour * 60 + bounds.startMinute;
	let itemStart = startParts.hours * 60 + startParts.minutes;
	let itemEnd = endParts.hours * 60 + endParts.minutes;
	if (itemStart < startTotal) itemStart += 24 * 60;
	if (itemEnd < startTotal) itemEnd += 24 * 60;
	if (itemEnd <= itemStart) itemEnd += 24 * 60;
	return ((itemEnd - itemStart) * pxPerHour) / 60;
}
