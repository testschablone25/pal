"use client";

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	type ReactNode,
} from "react";

// ============================================
// Types
// ============================================

export type SupportedLocale = "de" | "en";

export interface TranslationDict {
	[key: string]: string;
}

export type LocaleDict = Record<SupportedLocale, TranslationDict>;

// ============================================
// Task Types (shared constant)
// ============================================

export const TASK_TYPES = [
	{ value: "setup", de: "Aufbau", en: "Setup" },
	{ value: "teardown", de: "Abbau", en: "Teardown" },
	{ value: "repair", de: "Reparatur", en: "Repair" },
	{ value: "maintenance", de: "Wartung", en: "Maintenance" },
	{ value: "logistics", de: "Logistik", en: "Logistics" },
	{ value: "procurement", de: "Beschaffung", en: "Procurement" },
	{ value: "tech_check", de: "Technik Check", en: "Tech Check" },
	{ value: "crew", de: "Personal", en: "Crew" },
	{ value: "booking", de: "Buchung", en: "Booking" },
	{ value: "cleanup", de: "Reinigung", en: "Cleanup" },
	{ value: "safety", de: "Sicherheit", en: "Safety" },
	{ value: "inventory", de: "Inventur", en: "Inventory" },
	{ value: "catering", de: "Verpflegung", en: "Catering" },
	{ value: "transportation", de: "Transport", en: "Transportation" },
	{ value: "documentation", de: "Dokumentation", en: "Documentation" },
] as const;

export type TaskType = (typeof TASK_TYPES)[number]["value"];

// ============================================
// Dictionary — All workflow UI strings
// ============================================

const dict: LocaleDict = {
	de: {
		// General
		"app.title": "Workflow",
		"app.subtitle":
			"Aufgaben verwalten und Fortschritt im Kanban-Board verfolgen",
		"app.loading": "Laden...",
		"app.error": "Fehler",
		"app.save": "Speichern",
		"app.cancel": "Abbrechen",
		"app.delete": "Löschen",
		"app.edit": "Bearbeiten",
		"app.create": "Erstellen",
		"app.close": "Schließen",
		"app.search": "Suchen...",
		"app.confirm": "Bestätigen",
		"app.send": "Senden",
		"app.restart": "Neu starten",
		"app.no_results": "Keine Ergebnisse",
		"app.no_data": "Keine Daten",
		"app.unknown": "Unbekannt",
		"app.unassigned": "Nicht zugewiesen",
		"app.print": "Drucken",
		"app.scan": "Scannen",
		"app.filter": "Filter",
		"app.sort": "Sortieren",
		"app.group": "Gruppieren",
		"app.clear": "Zurücksetzen",
		"app.back": "Zurück",

		// Status
		"status.todo": "To Do",
		"status.in_progress": "In Bearbeitung",
		"status.pending_approval": "Freigabe ausstehend",
		"status.done": "Erledigt",
		"status.cancelled": "Abgebrochen",

		// Priority
		"priority.low": "Niedrig",
		"priority.medium": "Mittel",
		"priority.high": "Hoch",
		"priority.urgent": "Dringend",

		// Buttons & Actions
		"action.new_task": "Neue Aufgabe",
		"action.edit_task": "Aufgabe bearbeiten",
		"action.delete_task": "Aufgabe löschen",
		"action.add_comment": "Kommentar hinzufügen",
		"action.block_task": "Aufgabe blockieren",
		"action.unblock_task": "Blockierung aufheben",
		"action.approve": "Freigeben",
		"action.reject": "Ablehnen",
		"action.confirm_reject": "Ablehnung bestätigen",
		"action.confirm_block": "Blockierung bestätigen",
		"action.add_subtask": "Unteraufgabe hinzufügen",
		"action.scan_item_qr": "Item-QR scannen",
		"action.view_qr_code": "QR-Code anzeigen",
		"action.my_tasks": "Meine Aufgaben",
		"action.all_tasks": "Alle Aufgaben",
		"action.blocked": "Blockiert",
		"action.needs_approval": "Freigabe nötig",

		// Field labels
		"field.title": "Titel",
		"field.description": "Beschreibung",
		"field.status": "Status",
		"field.priority": "Priorität",
		"field.assignee": "Bearbeiter",
		"field.event": "Event",
		"field.due_date": "Fällig am",
		"field.scheduled_date": "Geplant am",
		"field.goal_location": "Zielort",
		"field.current_location": "Aktueller Ort",
		"field.goal_location_prompt":
			"Zielort auswählen (Veranstaltungsort > Bereich)",
		"field.venue": "Veranstaltungsort",
		"field.category": "Kategorie",
		"field.serial_number": "Seriennummer",
		"field.item_name": "Artikelname",
		"field.parent_task": "Übergeordnete Aufgabe",
		"field.no_parent": "Keine übergeordnete Aufgabe",
		"field.parent_task_placeholder": "Aufgabe suchen...",
		"parent_task.inherited":
			"Werte werden von übergeordneter Aufgabe übernommen",
		"field.type": "Typ",
		"type.none": "Kein Typ",
		"type.setup": "Aufbau",
		"type.teardown": "Abbau",
		"type.repair": "Reparatur",
		"type.maintenance": "Wartung",
		"type.logistics": "Logistik",
		"type.procurement": "Beschaffung",
		"type.tech_check": "Technik Check",
		"type.crew": "Personal",
		"type.booking": "Buchung",
		"type.cleanup": "Reinigung",
		"type.safety": "Sicherheit",
		"type.inventory": "Inventur",
		"type.catering": "Verpflegung",
		"type.transportation": "Transport",
		"type.documentation": "Dokumentation",

		// Filter chips
		"filter.all_priorities": "Alle Prioritäten",
		"filter.all_assignees": "Alle Bearbeiter",
		"filter.all_events": "Alle Events",
		"filter.all_venues": "Alle Veranstaltungsorte",
		"filter.search_placeholder": "Aufgaben durchsuchen...",
		"filter.sort_priority": "Nach Priorität",
		"filter.sort_due_date": "Nach Fälligkeit",
		"filter.sort_venue": "Nach Veranstaltungsort",
		"filter.group_by_venue": "Nach Ort gruppieren",
		"filter.filter_by_venue": "Nach Ort filtern",

		// Task detail sections
		"detail.task_details": "Aufgabendetails",
		"detail.description": "Beschreibung",
		"detail.linked_items": "Verknüpfte Artikel",
		"detail.comments": "Kommentare",
		"detail.history": "Verlauf",
		"detail.subtasks": "Unteraufgaben",
		"detail.meta_info": "Informationen",
		"detail.created_by": "Erstellt von",
		"detail.created_at": "Erstellt am",
		"detail.updated_at": "Aktualisiert am",
		"detail.assignee_label": "Bearbeiter:",
		"detail.no_assignee": "Nicht zugewiesen",
		"detail.due_label": "Fällig:",
		"detail.scheduled_label": "Geplant:",
		"detail.created_label": "Erstellt:",
		"detail.created_by_label": "Erstellt von:",
		"detail.no_description": "Keine Beschreibung",

		// Task detail - linked items
		"item.current_location": "Aktueller Ort",
		"item.goal_location": "Zielort",
		"item.status_delivered": "Geliefert",
		"item.status_pending": "Ausstehend",
		"item.status_goal_mismatch": "Nicht am Zielort",
		"item.status_at_goal": "Am Zielort",

		// Subtasks
		"subtask.progress": "{done}/{total} erledigt",
		"subtask.add_title": "Titel der Unteraufgabe",
		"subtask.no_subtasks": "Keine Unteraufgaben",

		// Comments
		"comment.placeholder": "Kommentar hinzufügen...",
		"comment.no_comments": "Noch keine Kommentare",
		"comment.send": "Senden",

		// History
		"history.title": "Verlauf",
		"history.no_history": "Noch kein Verlauf",
		"history.just_now": "Gerade eben",
		"history.min_ago": "vor {n}m",
		"history.hours_ago": "vor {n}h",
		"history.yesterday": "Gestern",
		"history.days_ago": "vor {n}Tagen",

		// History entries
		"history.created": "hat die Aufgabe erstellt",
		"history.status_change": "hat von {from} nach {to} verschoben",
		"history.approved": "hat die Aufgabe freigegeben",
		"history.rejected": "hat abgelehnt: {reason}",
		"history.blocked": "hat blockiert: {reason}",
		"history.unblocked": "hat die Blockierung aufgehoben",
		"history.edited": "hat bearbeitet: {reason}",

		// Approval section
		"approval.title": "Freigabe ausstehend",
		"approval.description":
			"Diese Aufgabe wurde zur Freigabe eingereicht. Details prüfen und freigeben oder ablehnen.",
		"approval.reject_placeholder": "Grund für Ablehnung...",

		// Block section
		"block.reason_placeholder": "Grund für Blockierung...",

		// Scan delivery
		"scan.title": "QR-Code scannen",
		"scan.instructions":
			"QR-Code des Artikels scannen, um Lieferung zu bestätigen",
		"scan.success": "Artikel erfolgreich als geliefert markiert!",
		"scan.error_location_mismatch": "Standort stimmt nicht mit Zielort überein",
		"scan.error_no_goal": "Dieser Artikel hat kein Zielort für diese Aufgabe",
		"scan.confirm_location": "Aktuellen Standort bestätigen",
		"scan.select_location": "Standort auswählen...",

		// Task card
		"card.today": "Heute",
		"card.overdue": "Überfällig",
		"card.blocked_label": "Blockiert",
		"card.comments": "Kommentare",
		"card.parent_task": "← Übergeordnete Aufgabe",

		// Errors
		"error.create_task": "Fehler beim Erstellen der Aufgabe",
		"error.update_task": "Fehler beim Aktualisieren der Aufgabe",
		"error.delete_task": "Fehler beim Löschen der Aufgabe",
		"error.fetch_tasks": "Fehler beim Laden der Aufgaben",
		"error.fetch_comments": "Fehler beim Laden der Kommentare",
	},

	en: {
		// General
		"app.title": "Workflow",
		"app.subtitle": "Manage tasks and track progress with Kanban boards",
		"app.loading": "Loading...",
		"app.error": "Error",
		"app.save": "Save",
		"app.cancel": "Cancel",
		"app.delete": "Delete",
		"app.edit": "Edit",
		"app.create": "Create",
		"app.close": "Close",
		"app.search": "Search...",
		"app.confirm": "Confirm",
		"app.send": "Send",
		"app.restart": "Restart",
		"app.no_results": "No results",
		"app.no_data": "No data",
		"app.unknown": "Unknown",
		"app.unassigned": "Unassigned",
		"app.print": "Print",
		"app.scan": "Scan",
		"app.filter": "Filter",
		"app.sort": "Sort",
		"app.group": "Group",
		"app.clear": "Clear",
		"app.back": "Back",

		// Status
		"status.todo": "To Do",
		"status.in_progress": "In Progress",
		"status.pending_approval": "Pending Approval",
		"status.done": "Done",
		"status.cancelled": "Cancelled",

		// Priority
		"priority.low": "Low",
		"priority.medium": "Medium",
		"priority.high": "High",
		"priority.urgent": "Urgent",

		// Buttons & Actions
		"action.new_task": "New Task",
		"action.edit_task": "Edit Task",
		"action.delete_task": "Delete Task",
		"action.add_comment": "Add Comment",
		"action.block_task": "Block Task",
		"action.unblock_task": "Unblock",
		"action.approve": "Approve",
		"action.reject": "Reject",
		"action.confirm_reject": "Confirm Reject",
		"action.confirm_block": "Confirm Block",
		"action.add_subtask": "Add Sub-Task",
		"action.scan_item_qr": "Scan Item QR",
		"action.view_qr_code": "View QR Code",
		"action.my_tasks": "My Tasks",
		"action.all_tasks": "All Tasks",
		"action.blocked": "Blocked",
		"action.needs_approval": "Needs Approval",

		// Field labels
		"field.title": "Title",
		"field.description": "Description",
		"field.status": "Status",
		"field.priority": "Priority",
		"field.assignee": "Assignee",
		"field.event": "Event",
		"field.due_date": "Due Date",
		"field.scheduled_date": "Scheduled Date",
		"field.goal_location": "Goal Location",
		"field.current_location": "Current Location",
		"field.goal_location_prompt": "Select goal location (Venue > Area)",
		"field.venue": "Venue",
		"field.category": "Category",
		"field.serial_number": "Serial Number",
		"field.item_name": "Item Name",
		"field.parent_task": "Parent Task",
		"field.no_parent": "No parent task",
		"field.parent_task_placeholder": "Search tasks...",
		"parent_task.inherited": "Values will be inherited from parent task",
		"field.type": "Type",
		"type.none": "No type",
		"type.setup": "Setup",
		"type.teardown": "Teardown",
		"type.repair": "Repair",
		"type.maintenance": "Maintenance",
		"type.logistics": "Logistics",
		"type.procurement": "Procurement",
		"type.tech_check": "Tech Check",
		"type.crew": "Crew",
		"type.booking": "Booking",
		"type.cleanup": "Cleanup",
		"type.safety": "Safety",
		"type.inventory": "Inventory",
		"type.catering": "Catering",
		"type.transportation": "Transportation",
		"type.documentation": "Documentation",

		// Filter chips
		"filter.all_priorities": "All priorities",
		"filter.all_assignees": "All assignees",
		"filter.all_events": "All events",
		"filter.all_venues": "All venues",
		"filter.search_placeholder": "Search tasks...",
		"filter.sort_priority": "Sort by Priority",
		"filter.sort_due_date": "Sort by Due Date",
		"filter.sort_venue": "Sort by Venue",
		"filter.group_by_venue": "Group by Venue",
		"filter.filter_by_venue": "Filter by Venue",

		// Task detail sections
		"detail.task_details": "Task Details",
		"detail.description": "Description",
		"detail.linked_items": "Linked Items",
		"detail.comments": "Comments",
		"detail.history": "History",
		"detail.subtasks": "Sub-Tasks",
		"detail.meta_info": "Information",
		"detail.created_by": "Created by",
		"detail.created_at": "Created at",
		"detail.updated_at": "Updated at",
		"detail.assignee_label": "Assignee:",
		"detail.no_assignee": "Unassigned",
		"detail.due_label": "Due:",
		"detail.scheduled_label": "Scheduled:",
		"detail.created_label": "Created:",
		"detail.created_by_label": "Created by:",
		"detail.no_description": "No description",

		// Task detail - linked items
		"item.current_location": "Current Location",
		"item.goal_location": "Goal Location",
		"item.status_delivered": "Delivered",
		"item.status_pending": "Pending",
		"item.status_goal_mismatch": "Not at goal location",
		"item.status_at_goal": "At goal location",

		// Subtasks
		"subtask.progress": "{done}/{total} done",
		"subtask.add_title": "Sub-task title",
		"subtask.no_subtasks": "No sub-tasks",

		// Comments
		"comment.placeholder": "Add a comment...",
		"comment.no_comments": "No comments yet",
		"comment.send": "Send",

		// History
		"history.title": "History",
		"history.no_history": "No history yet",
		"history.just_now": "just now",
		"history.min_ago": "{n}m ago",
		"history.hours_ago": "{n}h ago",
		"history.yesterday": "yesterday",
		"history.days_ago": "{n}d ago",

		// History entries
		"history.created": "created the task",
		"history.status_change": "moved from {from} to {to}",
		"history.approved": "approved the task",
		"history.rejected": "rejected: {reason}",
		"history.blocked": "blocked: {reason}",
		"history.unblocked": "unblocked the task",
		"history.edited": "edited: {reason}",

		// Approval section
		"approval.title": "Awaiting Approval",
		"approval.description":
			"This task has been submitted for approval. Review the details below and approve or reject.",
		"approval.reject_placeholder": "Reason for rejection...",

		// Block section
		"block.reason_placeholder": "Reason for blocking...",

		// Scan delivery
		"scan.title": "Scan QR Code",
		"scan.instructions": "Scan item QR code to confirm delivery",
		"scan.success": "Item successfully marked as delivered!",
		"scan.error_location_mismatch": "Location does not match goal location",
		"scan.error_no_goal": "This item has no goal location for this task",
		"scan.confirm_location": "Confirm current location",
		"scan.select_location": "Select location...",

		// Task card
		"card.today": "Today",
		"card.overdue": "Overdue",
		"card.blocked_label": "Blocked",
		"card.comments": "Comments",
		"card.parent_task": "← Parent Task",

		// Errors
		"error.create_task": "Failed to create task",
		"error.update_task": "Failed to update task",
		"error.delete_task": "Failed to delete task",
		"error.fetch_tasks": "Failed to fetch tasks",
		"error.fetch_comments": "Failed to fetch comments",
	},
};

// ============================================
// React Context
// ============================================

interface I18nContextType {
	locale: SupportedLocale;
	setLocale: (locale: SupportedLocale) => void;
	toggleLocale: () => void;
	t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
	locale: "de",
	setLocale: () => {},
	toggleLocale: () => {},
	t: (key: string) => key,
});

// ============================================
// Provider
// ============================================

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocale] = useState<SupportedLocale>("de");

	const toggleLocale = useCallback(() => {
		setLocale((prev) => (prev === "de" ? "en" : "de"));
	}, []);

	const t = useCallback(
		(key: string, params?: Record<string, string | number>): string => {
			const active = dict[locale];
			let value = active?.[key] ?? dict.en?.[key] ?? key;
			if (params) {
				for (const [k, v] of Object.entries(params)) {
					value = value.replace(`{${k}}`, String(v));
				}
			}
			return value;
		},
		[locale],
	);

	const ctx = useMemo(
		() => ({ locale, setLocale, toggleLocale, t }),
		[locale, toggleLocale, t],
	);

	return (
		<I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>
	);
}

// ============================================
// Hook
// ============================================

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return ctx;
}

// ============================================
// Direct utility (for non-React code)
// ============================================

export function translate(
	locale: SupportedLocale,
	key: string,
	params?: Record<string, string | number>,
): string {
	let value = dict[locale]?.[key] ?? dict.en?.[key] ?? key;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			value = value.replace(`{${k}}`, String(v));
		}
	}
	return value;
}
