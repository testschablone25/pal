import {
	format,
	formatDistanceToNow,
	parseISO,
	isToday,
	isTomorrow,
	isYesterday,
} from "date-fns";
import { de } from "date-fns/locale";

/**
 * Format a date string to German locale (e.g. "18.04.2026")
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return format(date, "dd.MM.yyyy", { locale: de });
}

/**
 * Format a date string to German short format (e.g. "18.04.")
 */
export function formatDateShort(
	dateStr: string | Date | null | undefined,
): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return format(date, "dd.MM.", { locale: de });
}

/**
 * Format a time string (e.g. "14:30")
 */
export function formatTime(dateStr: string | Date | null | undefined): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return format(date, "HH:mm", { locale: de });
}

/**
 * Format a date with time (e.g. "18.04.2026, 14:30")
 */
export function formatDateTime(
	dateStr: string | Date | null | undefined,
): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return format(date, "dd.MM.yyyy HH:mm", { locale: de });
}

/**
 * Format a full German date with weekday (e.g. "Samstag, 18. April 2026")
 */
export function formatDateFull(
	dateStr: string | Date | null | undefined,
): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return format(date, "EEEE, dd. MMMM yyyy", { locale: de });
}

/**
 * Human-readable relative time (e.g. "vor 2 Stunden")
 */
export function formatRelative(
	dateStr: string | Date | null | undefined,
): string {
	if (!dateStr) return "";
	const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
	return formatDistanceToNow(date, { addSuffix: true, locale: de });
}

/**
 * Check if a date string is today
 */
export function isDateToday(dateStr: string | null | undefined): boolean {
	if (!dateStr) return false;
	return isToday(parseISO(dateStr));
}

/**
 * Get a short human-readable label for a date
 */
export function formatDateLabel(dateStr: string | null | undefined): string {
	if (!dateStr) return "";
	const date = parseISO(dateStr);
	if (isToday(date)) return "Heute";
	if (isTomorrow(date)) return "Morgen";
	if (isYesterday(date)) return "Gestern";
	return format(date, "EEEE", { locale: de });
}
