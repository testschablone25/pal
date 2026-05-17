// Shared utility functions for staff shifts module

/** Ensure a timestamp string has a timezone suffix (Z or offset) for proper Date parsing */
export function ensureUtc(isoString: string): string {
	if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(isoString)) return isoString;
	return isoString + "Z";
}

/** Parse time parts (hours, minutes) from a timestamp string, converting to local time */
export function parseTimeParts(isoString: string): {
	hours: number;
	minutes: number;
} {
	const d = new Date(ensureUtc(isoString));
	if (!isNaN(d.getTime())) {
		return { hours: d.getHours(), minutes: d.getMinutes() };
	}
	const match = isoString.match(/T(\d{2}):(\d{2})/);
	if (!match) return { hours: 0, minutes: 0 };
	return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

/** Format a timestamp to HH:MM string */
export function formatTime(dateTime: string): string {
	const { hours, minutes } = parseTimeParts(dateTime);
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Get time position as percentage on a 18:00-06:00 timeline */
export function getTimePosition(dateTime: string): number {
	const { hours, minutes } = parseTimeParts(dateTime);
	let hourOffset = hours - 18;
	if (hourOffset < 0) hourOffset += 24;
	const totalMinutes = hourOffset * 60 + minutes;
	return (totalMinutes / (12 * 60)) * 100;
}

/** Get shift bar width as percentage on a 18:00-06:00 timeline */
export function getTimeWidth(startTime: string, endTime: string): number {
	const startParts = parseTimeParts(startTime);
	const endParts = parseTimeParts(endTime);
	const startTotalMinutes = startParts.hours * 60 + startParts.minutes;
	let endTotalMinutes = endParts.hours * 60 + endParts.minutes;
	if (endTotalMinutes <= startTotalMinutes) endTotalMinutes += 24 * 60;
	const diffMinutes = endTotalMinutes - startTotalMinutes;
	return (diffMinutes / (12 * 60)) * 100;
}

/** Snap a timestamp by a delta in minutes, then round to nearest 15 minutes */
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

/** Return the browser's local timezone offset as ISO-8601 suffix (e.g. "+02:00") */
export function getLocalTimezoneOffset(): string {
	const offset = -new Date().getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	const h = String(Math.floor(abs / 60)).padStart(2, "0");
	const m = String(abs % 60).padStart(2, "0");
	return `${sign}${h}:${m}`;
}

/** Format a dateTime to just the time part for form inputs (HH:MM) */
export function getTimeInputValue(dateTime: string): string {
	const { hours, minutes } = parseTimeParts(dateTime);
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
