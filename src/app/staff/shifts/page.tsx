"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	useDraggable,
	useDroppable,
	DragStartEvent,
} from "@dnd-kit/core";
import {
	Calendar,
	Clock,
	Plus,
	Trash2,
	AlertTriangle,
	Loader2,
	Users,
	Puzzle,
	Download,
	ArrowUpDown,
	Check,
	X,
	Send,
} from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShiftTemplateApplyDialog } from "@/components/shift-template-apply-dialog";
import { statusBadgeClass } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";

interface Event {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
}

interface StaffMember {
	id: string;
	role: string;
	contract_type: string;
	profiles?: {
		full_name: string | null;
	} | null;
}

interface Shift {
	id: string;
	event_id: string;
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
	break_minutes: number;
	status: "scheduled" | "confirmed" | "completed" | "cancelled";
	clocked_in_at?: string | null;
	clocked_out_at?: string | null;
	staff?: StaffMember;
}

interface BulkShiftInput {
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
	break_minutes?: number;
}

interface Availability {
	id: string;
	staff_id: string;
	date: string;
	available: boolean;
	reason: string | null;
}

interface ConflictingShift {
	id: string;
	staff_id: string;
	start_time: string;
	end_time: string;
	status: string;
	role: string;
}

interface SwapRequest {
	id: string;
	shiftId: string;
	requestedByStaffId: string;
	requestedToStaffId: string;
	status: "pending" | "accepted" | "declined" | "approved";
	reason?: string;
	requestedByName?: string;
}

const shiftSchema = z.object({
	staff_id: z.string().min(1, "Staff member is required"),
	role: z.string().min(1, "Role is required"),
	start_time: z.string().min(1, "Start time is required"),
	end_time: z.string().min(1, "End time is required"),
	break_minutes: z.number().min(0),
	status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

const STAFF_ROLES = [
	"Bar Staff",
	"Security",
	"Door Staff",
	"Cloakroom",
	"Cleaner",
	"Manager",
	"Sound Engineer",
	"Lighting",
	"VIP Host",
	"Runner",
];

const ROLE_COLORS: Record<string, string> = {
	"Bar Staff": "bg-blue-600",
	Security: "bg-red-600",
	"Door Staff": "bg-orange-600",
	Cloakroom: "bg-cyan-600",
	Cleaner: "bg-gray-600",
	Manager: "bg-yellow-600",
	"Sound Engineer": "bg-pink-600",
	Lighting: "bg-indigo-600",
	"VIP Host": "bg-rose-600",
	Runner: "bg-teal-600",
};

function DraggableShiftBar({
	shift,
	onClick,
}: {
	shift: Shift;
	onClick: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: `shift-bar-${shift.id}`,
			data: {
				shiftId: shift.id,
				startTime: shift.start_time,
				endTime: shift.end_time,
			},
		});

	const colorClass = ROLE_COLORS[shift.role] || "bg-zinc-600";
	const left = getTimePosition(shift.start_time);
	const width = getTimeWidth(shift.start_time, shift.end_time);

	const style: React.CSSProperties = {
		left: `${left}%`,
		width: `${width}%`,
		minWidth: "60px",
		transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
		zIndex: isDragging ? 50 : undefined,
		opacity: isDragging ? 0.5 : undefined,
		cursor: "grab",
	};

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className={`absolute h-full ${colorClass} rounded opacity-80 hover:opacity-100 transition-opacity flex items-center px-2`}
			style={style}
			onClick={() => {
				// Prevent drag click from triggering edit
				if (!isDragging) {
					onClick();
				}
			}}
		>
			<span className="text-xs text-white truncate">
				{formatTime(shift.start_time)} - {formatTime(shift.end_time)}
			</span>
		</div>
	);
}

function DroppableTimelineRow({
	shift,
	children,
}: {
	shift: Shift;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `timeline-row-${shift.id}`,
	});

	return (
		<div
			ref={setNodeRef}
			data-timeline-container
			className={`flex-1 relative h-12 rounded transition-colors ${
				isOver ? "bg-zinc-800" : "bg-zinc-950"
			}`}
		>
			{children}
		</div>
	);
}

function formatTime(dateTime: string) {
	const date = new Date(dateTime);
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function getTimePosition(dateTime: string) {
	const date = new Date(dateTime);
	const hours = date.getHours();
	const minutes = date.getMinutes();
	// Timeline spans 18:00 to 06:00 (12 hours)
	let hourOffset = hours - 18;
	if (hourOffset < 0) hourOffset += 24;
	const totalMinutes = hourOffset * 60 + minutes;
	return (totalMinutes / (12 * 60)) * 100;
}

function getTimeWidth(startTime: string, endTime: string) {
	const start = new Date(startTime);
	const end = new Date(endTime);
	let diffMs = end.getTime() - start.getTime();
	// Handle cross-midnight shifts (end time is before start time)
	if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
	const diffMinutes = diffMs / (1000 * 60);
	return (diffMinutes / (12 * 60)) * 100;
}

function snapTo15Minutes(dateStr: string, deltaMinutes: number): string {
	const date = new Date(dateStr);
	date.setTime(date.getTime() + deltaMinutes * 60 * 1000);
	const minutes = date.getMinutes();
	const snappedMinutes = Math.round(minutes / 15) * 15;
	date.setMinutes(snappedMinutes);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.toISOString();
}

export default function ShiftsPage() {
	const { toast } = useToast();
	const [events, setEvents] = useState<Event[]>([]);
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [availability, setAvailability] = useState<Availability[]>([]);
	const [selectedEventId, setSelectedEventId] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [editingShift, setEditingShift] = useState<Shift | null>(null);
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [shiftSearch, setShiftSearch] = useState<string>("");
	const [activeDragShift, setActiveDragShift] = useState<Shift | null>(null);
	const [dragDelta, setDragDelta] = useState<number>(0);
	const [savingIndicator, setSavingIndicator] = useState<string | null>(null);
	const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
	const [conflictData, setConflictData] = useState<{
		conflictingShifts: ConflictingShift[];
		pendingSubmit: () => Promise<void>;
	} | null>(null);

	// Bulk assignment state
	const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
	const [selectedBulkStaff, setSelectedBulkStaff] = useState<string[]>([]);
	const [bulkRole, setBulkRole] = useState<string>("");
	const [bulkStartTime, setBulkStartTime] = useState<string>("");
	const [bulkEndTime, setBulkEndTime] = useState<string>("");
	const [bulkBreakMinutes, setBulkBreakMinutes] = useState<number>(0);
	const [bulkSubmitting, setBulkSubmitting] = useState(false);

	// Template dialog state
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

	// Swap request state
	const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
	const [swapDialogOpen, setSwapDialogOpen] = useState(false);
	const [swapTargetShift, setSwapTargetShift] = useState<Shift | null>(null);
	const [swapSelectedStaff, setSwapSelectedStaff] = useState<string>("");
	const [swapReason, setSwapReason] = useState<string>("");

	// Clock-in/out state
	const [clockingIn, setClockingIn] = useState<string | null>(null);
	const [clockingOut, setClockingOut] = useState<string | null>(null);

	const form = useForm<ShiftFormValues>({
		resolver: zodResolver(shiftSchema),
		defaultValues: {
			staff_id: "",
			role: "",
			start_time: "",
			end_time: "",
			break_minutes: 0,
			status: "scheduled",
		},
	});

	useEffect(() => {
		fetchEvents();
		fetchStaff();
	}, []);

	useEffect(() => {
		if (selectedEventId) {
			fetchShifts();
			fetchAvailability();
		}
	}, [selectedEventId]);

	const fetchEvents = async () => {
		try {
			const response = await fetch("/api/events");
			const data = await response.json();
			setEvents(data.events || []);
			if (data.events?.length > 0 && !selectedEventId) {
				setSelectedEventId(data.events[0].id);
			}
		} catch (error) {
			console.error("Failed to fetch events:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchStaff = async () => {
		try {
			const response = await fetch("/api/staff");
			const data = await response.json();
			setStaff(data.staff || []);
		} catch (error) {
			console.error("Failed to fetch staff:", error);
		}
	};

	const fetchShifts = async () => {
		try {
			const response = await fetch(`/api/shifts?event_id=${selectedEventId}`);
			const data = await response.json();
			setShifts(data.shifts || []);
		} catch (error) {
			console.error("Failed to fetch shifts:", error);
		}
	};

	const fetchAvailability = async () => {
		try {
			const selectedEvent = events.find((e) => e.id === selectedEventId);
			if (!selectedEvent) return;

			const response = await fetch(
				`/api/availability?date_from=${selectedEvent.date}&date_to=${selectedEvent.date}`,
			);
			const data = await response.json();
			setAvailability(data.availability || []);
		} catch (error) {
			console.error("Failed to fetch availability:", error);
		}
	};

	const checkForConflicts = async (
		staffId: string,
		eventId: string,
		startTime: string,
		endTime: string,
		excludeShiftId?: string,
	): Promise<{
		hasConflict: boolean;
		conflictingShifts: ConflictingShift[];
	}> => {
		try {
			const params = new URLSearchParams({
				check_conflict: "true",
				staff_id: staffId,
				event_id: eventId,
				start_time: startTime,
				end_time: endTime,
			});
			if (excludeShiftId) {
				params.set("exclude_shift_id", excludeShiftId);
			}

			const response = await fetch(`/api/shifts?${params}`);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Failed to check conflicts:", error);
			return { hasConflict: false, conflictingShifts: [] };
		}
	};

	const getTimeInputValue = (dateTime: string) => {
		const date = new Date(dateTime);
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	const openCreateDialog = () => {
		setEditingShift(null);
		form.reset({
			staff_id: "",
			role: "",
			start_time: "",
			end_time: "",
			break_minutes: 0,
			status: "scheduled",
		});
		setShiftDialogOpen(true);
	};

	const openEditDialog = (shift: Shift) => {
		setEditingShift(shift);
		form.reset({
			staff_id: shift.staff_id,
			role: shift.role,
			start_time: getTimeInputValue(shift.start_time),
			end_time: getTimeInputValue(shift.end_time),
			break_minutes: shift.break_minutes,
			status: shift.status,
		});
		setShiftDialogOpen(true);
	};

	const onSubmit = async (values: ShiftFormValues) => {
		if (!selectedEventId) return;

		const selectedEvent = events.find((e) => e.id === selectedEventId);
		if (!selectedEvent) return;

		const startDateTime = `${selectedEvent.date}T${values.start_time}:00`;
		let endDateTime = `${selectedEvent.date}T${values.end_time}:00`;
		// Handle cross-midnight shifts: if end is before start, end is next day
		if (values.end_time <= values.start_time) {
			const nextDay = new Date(selectedEvent.date);
			nextDay.setDate(nextDay.getDate() + 1);
			endDateTime = `${nextDay.toISOString().split("T")[0]}T${values.end_time}:00`;
		}

		// Check for conflicts before submitting
		const conflictResult = await checkForConflicts(
			values.staff_id,
			selectedEventId,
			startDateTime,
			endDateTime,
			editingShift?.id,
		);

		if (conflictResult.hasConflict) {
			// Show conflict dialog, store the submit action
			return new Promise<void>((resolve) => {
				setConflictData({
					conflictingShifts: conflictResult.conflictingShifts,
					pendingSubmit: async () => {
						setConflictDialogOpen(false);
						setConflictData(null);
						await performSubmit(values, startDateTime, endDateTime);
						resolve();
					},
				});
				setConflictDialogOpen(true);
			});
		}

		await performSubmit(values, startDateTime, endDateTime);
	};

	const performSubmit = async (
		values: ShiftFormValues,
		startDateTime: string,
		endDateTime: string,
	) => {
		if (!selectedEventId) return;

		setSaving(true);
		try {
			if (editingShift) {
				// UPDATE
				const response = await fetch(`/api/shifts/${editingShift.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						event_id: selectedEventId,
						staff_id: values.staff_id,
						role: values.role,
						start_time: startDateTime,
						end_time: endDateTime,
						break_minutes: values.break_minutes,
						status: values.status,
					}),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to update shift");
				}
			} else {
				// CREATE
				const response = await fetch("/api/shifts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						event_id: selectedEventId,
						staff_id: values.staff_id,
						role: values.role,
						start_time: startDateTime,
						end_time: endDateTime,
						break_minutes: values.break_minutes,
						status: values.status,
					}),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to create shift");
				}
			}

			setShiftDialogOpen(false);
			setEditingShift(null);
			form.reset();
			fetchShifts();
			toast({
				title: editingShift ? "Schicht aktualisiert" : "Schicht erstellt",
				description: editingShift
					? "Die Schicht wurde erfolgreich aktualisiert."
					: "Die Schicht wurde erfolgreich erstellt.",
			});
		} catch (error) {
			console.error("Error saving shift:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Speichern der Schicht.",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteClick = (shift: Shift) => {
		setShiftToDelete(shift);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!shiftToDelete) return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/shifts/${shiftToDelete.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete shift");
			}

			setDeleteDialogOpen(false);
			setShiftToDelete(null);
			fetchShifts();
			toast({
				title: "Schicht gelöscht",
				description: "Die Schicht wurde erfolgreich gelöscht.",
			});
		} catch (error) {
			console.error("Error deleting shift:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Löschen der Schicht.",
			});
		} finally {
			setDeleting(false);
		}
	};

	const isStaffUnavailable = (staffId: string) => {
		return availability.some((a) => a.staff_id === staffId && !a.available);
	};

	const getAvailabilityReason = (staffId: string) => {
		const avail = availability.find(
			(a) => a.staff_id === staffId && !a.available,
		);
		return avail?.reason;
	};

	// Filter shifts by selected role
	const filteredShifts = shifts.filter((s) => {
		const matchesRole = roleFilter === "all" || s.role === roleFilter;
		const matchesSearch =
			!shiftSearch ||
			(s.staff?.profiles?.full_name || "")
				.toLowerCase()
				.includes(shiftSearch.toLowerCase());
		return matchesRole && matchesSearch;
	});

	const selectedEvent = events.find((e) => e.id === selectedEventId);

	// Generate timeline hours (18:00 to 06:00)
	const timelineHours = [];
	for (let i = 18; i < 24; i++) {
		timelineHours.push(`${i}:00`);
	}
	for (let i = 0; i < 6; i++) {
		timelineHours.push(`${i.toString().padStart(2, "0")}:00`);
	}

	// Handle drag end for timeline shifts
	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, delta } = event;
			setActiveDragShift(null);
			setDragDelta(0);

			const shiftId = active.data.current?.shiftId as string;
			const originalStartTime = active.data.current?.startTime as string;
			const originalEndTime = active.data.current?.endTime as string;

			if (!shiftId || !originalStartTime || !originalEndTime) return;

			// Get container width
			const containerEl = document.querySelector("[data-timeline-container]");
			if (!containerEl) return;

			const containerWidth = containerEl.clientWidth;
			if (containerWidth === 0) return;

			// Convert pixel delta to minutes
			const deltaMinutes = (delta.x / containerWidth) * (12 * 60);

			// Only proceed if dragged more than 1 minute
			if (Math.abs(deltaMinutes) < 1) return;

			// Snap to 15-minute intervals
			const snappedDelta = Math.round(deltaMinutes / 15) * 15;

			// Calculate new times
			const newStartTime = snapTo15Minutes(originalStartTime, snappedDelta);
			const newEndTime = snapTo15Minutes(originalEndTime, snappedDelta);

			// Don't update if times haven't changed
			if (newStartTime === originalStartTime && newEndTime === originalEndTime)
				return;

			setSavingIndicator(shiftId);
			try {
				const response = await fetch(`/api/shifts/${shiftId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						start_time: newStartTime,
						end_time: newEndTime,
					}),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to update shift");
				}

				fetchShifts();
				toast({
					title: "Schicht verschoben",
					description: "Die Schicht wurde erfolgreich verschoben.",
				});
			} catch (error) {
				console.error("Error updating shift time:", error);
				toast({
					variant: "destructive",
					title: "Fehler",
					description:
						error instanceof Error
							? error.message
							: "Fehler beim Verschieben der Schicht.",
				});
			} finally {
				setSavingIndicator(null);
			}
		},
		[fetchShifts],
	);

	const handleDragMove = useCallback((event: { delta: { x: number } }) => {
		setDragDelta(event.delta.x);
	}, []);

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

	const handleBulkSubmit = async () => {
		if (!selectedEventId || !selectedEvent) return;
		if (selectedBulkStaff.length === 0) return;
		if (!bulkStartTime || !bulkEndTime) return;
		if (!bulkRole) return;

		setBulkSubmitting(true);
		try {
			const startDateTime = `${selectedEvent.date}T${bulkStartTime}:00`;
			let endDateTime = `${selectedEvent.date}T${bulkEndTime}:00`;
			// Handle cross-midnight shifts
			if (bulkEndTime <= bulkStartTime) {
				const nextDay = new Date(selectedEvent.date);
				nextDay.setDate(nextDay.getDate() + 1);
				endDateTime = `${nextDay.toISOString().split("T")[0]}T${bulkEndTime}:00`;
			}

			const shiftsToCreate: BulkShiftInput[] = selectedBulkStaff.map(
				(staffId) => ({
					staff_id: staffId,
					role: bulkRole,
					start_time: startDateTime,
					end_time: endDateTime,
					break_minutes: bulkBreakMinutes,
				}),
			);

			const response = await fetch("/api/shifts/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: selectedEventId,
					shifts: shiftsToCreate,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create bulk shifts");
			}

			setBulkDialogOpen(false);
			setSelectedBulkStaff([]);
			setBulkRole("");
			setBulkStartTime("");
			setBulkEndTime("");
			setBulkBreakMinutes(0);
			fetchShifts();
			toast({
				title: "Massenschichten erstellt",
				description: `${selectedBulkStaff.length} Schichten wurden erfolgreich erstellt.`,
			});
		} catch (error) {
			console.error("Error creating bulk shifts:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Erstellen der Massenschichten.",
			});
		} finally {
			setBulkSubmitting(false);
		}
	};

	const handleTemplateApplied = () => {
		fetchShifts();
	};

	const toggleBulkStaff = (staffId: string) => {
		setSelectedBulkStaff((prev) =>
			prev.includes(staffId)
				? prev.filter((id) => id !== staffId)
				: [...prev, staffId],
		);
	};

	// Clock-In Handler
	const handleClockIn = async (shiftId: string) => {
		setClockingIn(shiftId);
		try {
			const response = await fetch(`/api/shifts/${shiftId}/clock-in`, {
				method: "POST",
			});
			if (!response.ok) {
				throw new Error("Failed to clock in");
			}
			await fetchShifts();
			toast({
				title: "Eingestempelt",
				description: "Der Mitarbeiter wurde erfolgreich eingestempelt.",
			});
		} catch (error) {
			console.error("Error clocking in:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error ? error.message : "Fehler beim Einstempeln.",
			});
		} finally {
			setClockingIn(null);
		}
	};

	// Clock-Out Handler
	const handleClockOut = async (shiftId: string) => {
		setClockingOut(shiftId);
		try {
			const response = await fetch(`/api/shifts/${shiftId}/clock-out`, {
				method: "POST",
			});
			if (!response.ok) {
				throw new Error("Failed to clock out");
			}
			await fetchShifts();
			toast({
				title: "Ausgestempelt",
				description: "Der Mitarbeiter wurde erfolgreich ausgestempelt.",
			});
		} catch (error) {
			console.error("Error clocking out:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error ? error.message : "Fehler beim Ausstempeln.",
			});
		} finally {
			setClockingOut(null);
		}
	};

	// Swap Request Handlers
	const handleOpenSwapDialog = (shift: Shift) => {
		setSwapTargetShift(shift);
		setSwapSelectedStaff("");
		setSwapReason("");
		setSwapDialogOpen(true);
	};

	const handleSubmitSwapRequest = () => {
		if (!swapTargetShift || !swapSelectedStaff) return;

		const requestingStaffMember = staff.find(
			(s) => s.id === swapTargetShift.staff_id,
		);

		const newSwapRequest: SwapRequest = {
			id: `swap-${Date.now()}`,
			shiftId: swapTargetShift.id,
			requestedByStaffId: swapTargetShift.staff_id,
			requestedToStaffId: swapSelectedStaff,
			status: "pending",
			reason: swapReason || undefined,
			requestedByName: requestingStaffMember?.profiles?.full_name || "Unknown",
		};

		setSwapRequests((prev) => [...prev, newSwapRequest]);
		setSwapDialogOpen(false);
		setSwapTargetShift(null);
	};

	const handleAcceptSwap = (swapId: string) => {
		setSwapRequests((prev) =>
			prev.map((sr) =>
				sr.id === swapId ? { ...sr, status: "accepted" as const } : sr,
			),
		);
	};

	const handleDeclineSwap = (swapId: string) => {
		setSwapRequests((prev) =>
			prev.map((sr) =>
				sr.id === swapId ? { ...sr, status: "declined" as const } : sr,
			),
		);
	};

	const handleApproveSwap = (swapId: string) => {
		const swap = swapRequests.find((sr) => sr.id === swapId);
		if (!swap) return;

		// When swap is approved, swap the staff_id on both shifts
		setShifts((prev) =>
			prev.map((s) => {
				if (s.id === swap.shiftId) {
					return { ...s, staff_id: swap.requestedToStaffId };
				}
				// Also swap any other shift belonging to the target staff for this event
				if (s.staff_id === swap.requestedToStaffId) {
					return { ...s, staff_id: swap.requestedByStaffId };
				}
				return s;
			}),
		);

		setSwapRequests((prev) =>
			prev.map((sr) =>
				sr.id === swapId ? { ...sr, status: "approved" as const } : sr,
			),
		);
	};

	// Export Handlers
	const handleExportCSV = () => {
		if (!selectedEvent) return;

		const headers = [
			"Staff Name",
			"Role",
			"Start Time",
			"End Time",
			"Duration (h)",
			"Break (min)",
			"Status",
		];

		const rows = filteredShifts.map((shift) => {
			const start = new Date(shift.start_time);
			const end = new Date(shift.end_time);
			const durationHours = (
				(end.getTime() - start.getTime()) /
				(1000 * 60 * 60)
			).toFixed(1);

			return [
				shift.staff?.profiles?.full_name || "Unknown",
				shift.role,
				formatTime(shift.start_time),
				formatTime(shift.end_time),
				durationHours,
				shift.break_minutes.toString(),
				shift.status,
			];
		});

		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.join(",")),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `shift-schedule-${selectedEvent.name.replace(/\s+/g, "-")}-${selectedEvent.date}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPDF = () => {
		if (!selectedEvent) return;

		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.getWidth();

		doc.setFontSize(16);
		doc.text(
			`Shift Schedule - ${selectedEvent.name} - ${selectedEvent.date}`,
			pageWidth / 2,
			20,
			{ align: "center" },
		);

		doc.setFontSize(10);
		const tableHeaders = ["Name", "Role", "Start", "End", "Status"];
		const columnWidths = [50, 40, 30, 30, 30];
		let yPos = 35;

		// Draw header
		doc.setFont("helvetica", "bold");
		let xPos = 10;
		tableHeaders.forEach((header, i) => {
			doc.text(header, xPos, yPos);
			xPos += columnWidths[i];
		});
		yPos += 8;

		// Draw rows
		doc.setFont("helvetica", "normal");
		filteredShifts.forEach((shift) => {
			if (yPos > 270) {
				doc.addPage();
				yPos = 20;
			}

			xPos = 10;
			const rowData = [
				shift.staff?.profiles?.full_name || "Unknown",
				shift.role,
				formatTime(shift.start_time),
				formatTime(shift.end_time),
				shift.status,
			];

			rowData.forEach((cell, i) => {
				doc.text(cell, xPos, yPos);
				xPos += columnWidths[i];
			});
			yPos += 7;
		});

		doc.save(
			`shift-schedule-${selectedEvent.name.replace(/\s+/g, "-")}-${selectedEvent.date}.pdf`,
		);
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Shift Scheduling</h1>
				<p className="text-zinc-400 mt-2">
					Plan and assign staff shifts for events
				</p>
			</div>

			{/* Event Selector */}
			<Card className="bg-zinc-900 border-zinc-800 mb-6">
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
						<div className="flex-1 w-full md:w-auto">
							<label className="text-sm text-zinc-400 mb-2 block">
								Select Event
							</label>
							<Select
								value={selectedEventId}
								onValueChange={setSelectedEventId}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800 w-full md:w-[300px]">
									<SelectValue placeholder="Choose an event" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{events.map((event) => (
										<SelectItem key={event.id} value={event.id}>
											{event.name} - {new Date(event.date).toLocaleDateString()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex gap-2">
							<Button
								onClick={() => setBulkDialogOpen(true)}
								disabled={!selectedEventId}
								variant="outline"
								className="border-zinc-800"
							>
								<Users className="h-4 w-4 mr-2" />
								Bulk Assign
							</Button>
							<Button
								onClick={() => setTemplateDialogOpen(true)}
								disabled={!selectedEventId}
								variant="outline"
								className="border-zinc-800"
							>
								<Puzzle className="h-4 w-4 mr-2" />
								Apply Template
							</Button>
							<Button
								onClick={openCreateDialog}
								disabled={!selectedEventId}
								className="bg-violet-600 hover:bg-violet-700"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Shift
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										disabled={!selectedEventId}
										variant="outline"
										className="border-zinc-800"
									>
										<Download className="h-4 w-4 mr-2" />
										Export
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="bg-zinc-900 border-zinc-800">
									<DropdownMenuItem
										onClick={handleExportCSV}
										className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
									>
										Export as CSV
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={handleExportPDF}
										className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
									>
										Export as PDF
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardContent>
			</Card>

			{loading ? (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="pt-6 space-y-4">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-16 w-full bg-zinc-800" />
						))}
					</CardContent>
				</Card>
			) : !selectedEventId ? (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="py-12 text-center">
						<Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
						<p className="text-zinc-400">
							Select an event to view and manage shifts
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Event Info */}
					{selectedEvent && (
						<Card className="bg-zinc-900 border-zinc-800 mb-6">
							<CardContent className="pt-6">
								<div className="flex flex-wrap gap-6">
									<div>
										<p className="text-sm text-zinc-400">Event</p>
										<p className="text-white font-medium">
											{selectedEvent.name}
										</p>
									</div>
									<div>
										<p className="text-sm text-zinc-400">Date</p>
										<p className="text-white font-medium">
											{new Date(selectedEvent.date).toLocaleDateString(
												"en-US",
												{
													weekday: "long",
													year: "numeric",
													month: "long",
													day: "numeric",
												},
											)}
										</p>
									</div>
									{selectedEvent.door_time && (
										<div>
											<p className="text-sm text-zinc-400">Door Time</p>
											<p className="text-white font-medium">
												{selectedEvent.door_time}
											</p>
										</div>
									)}
									{selectedEvent.end_time && (
										<div>
											<p className="text-sm text-zinc-400">End Time</p>
											<p className="text-white font-medium">
												{selectedEvent.end_time}
											</p>
										</div>
									)}
									<div>
										<p className="text-sm text-zinc-400">Total Shifts</p>
										<p className="text-white font-medium">{shifts.length}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Timeline View */}
					<Card className="bg-zinc-900 border-zinc-800 mb-6">
						<CardHeader>
							<CardTitle className="text-white flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Timeline View
							</CardTitle>
						</CardHeader>
						<CardContent>
							{/* Role Filter + Timeline Header */}
							<div className="flex items-center gap-4 mb-4">
								<div className="flex-1 max-w-sm">
									<SearchFilterBar
										placeholder="Search staff..."
										searchValue={shiftSearch}
										onSearchChange={setShiftSearch}
										filters={[
											{
												key: "role",
												label: "All Roles",
												options: [
													{ value: "all", label: "All Roles" },
													...STAFF_ROLES.map((role) => ({
														value: role,
														label: role,
													})),
												],
												value: roleFilter,
												onChange: setRoleFilter,
											},
										]}
									/>
								</div>
								<div className="flex-1 relative h-8">
									{timelineHours.map((hour, i) => (
										<div
											key={hour}
											className="absolute text-xs text-zinc-500"
											style={{ left: `${(i / 12) * 100}%` }}
										>
											{hour}
										</div>
									))}
								</div>
							</div>

							{/* Shift Bars */}
							<DndContext
								onDragEnd={handleDragEnd}
								onDragStart={handleDragStart}
								onDragMove={handleDragMove}
							>
								{filteredShifts.length === 0 ? (
									<EmptyState
										icon={Clock}
										title={
											roleFilter !== "all"
												? `Keine Schichten mit Rolle "${roleFilter}"`
												: "Keine Schichten geplant"
										}
										description="Füge eine Schicht für dieses Event hinzu"
										className="py-8"
									/>
								) : (
									<div className="space-y-2">
										{filteredShifts.map((shift) => (
											<div key={shift.id} className="flex items-center group">
												<div className="w-48 flex-shrink-0 pr-4">
													<p className="text-sm text-white truncate">
														{shift.staff?.profiles?.full_name || "Unknown"}
													</p>
													<p className="text-xs text-zinc-400">{shift.role}</p>
												</div>
												<DroppableTimelineRow shift={shift}>
													<DraggableShiftBar
														shift={shift}
														onClick={() => openEditDialog(shift)}
													/>
													{savingIndicator === shift.id && (
														<div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 rounded z-40">
															<Loader2 className="h-4 w-4 animate-spin text-violet-400" />
															<span className="text-xs text-violet-400 ml-2">
																Saving...
															</span>
														</div>
													)}
												</DroppableTimelineRow>
												<Button
													variant="ghost"
													size="icon"
													className="ml-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-600/10 flex-shrink-0"
													onClick={() => handleDeleteClick(shift)}
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										))}
									</div>
								)}

								{/* Drag Overlay */}
								<DragOverlay>
									{activeDragShift
										? (() => {
												const containerEl = document.querySelector(
													"[data-timeline-container]",
												);
												const containerWidth = containerEl?.clientWidth || 1;
												const deltaMinutes =
													(dragDelta / containerWidth) * (12 * 60);
												const snappedDelta = Math.round(deltaMinutes / 15) * 15;

												const newStart = snapTo15Minutes(
													activeDragShift.start_time,
													snappedDelta,
												);
												const newEnd = snapTo15Minutes(
													activeDragShift.end_time,
													snappedDelta,
												);
												const hasMoved = Math.abs(snappedDelta) >= 15;

												return (
													<div
														className={`h-12 ${ROLE_COLORS[activeDragShift.role] || "bg-zinc-600"} rounded opacity-90 flex items-center px-2 shadow-lg border border-white/10`}
														style={{
															width: `${getTimeWidth(activeDragShift.start_time, activeDragShift.end_time)}%`,
															minWidth: "60px",
														}}
													>
														<div className="flex flex-col leading-tight">
															<span className="text-xs text-white font-medium">
																{hasMoved ? (
																	<>
																		<span className="line-through opacity-50 mr-1">
																			{formatTime(activeDragShift.start_time)}
																		</span>
																		<span className="text-violet-300">
																			{formatTime(newStart)}
																		</span>
																	</>
																) : (
																	formatTime(activeDragShift.start_time)
																)}
																{" - "}
																{hasMoved ? (
																	<>
																		<span className="line-through opacity-50 mr-1">
																			{formatTime(activeDragShift.end_time)}
																		</span>
																		<span className="text-violet-300">
																			{formatTime(newEnd)}
																		</span>
																	</>
																) : (
																	formatTime(activeDragShift.end_time)
																)}
															</span>
															{hasMoved && (
																<span className="text-[10px] text-violet-300/70 mt-0.5">
																	↕ {Math.round(snappedDelta)} Min.
																</span>
															)}
														</div>
													</div>
												);
											})()
										: null}
								</DragOverlay>
							</DndContext>

							{/* Legend */}
							<div className="mt-6 pt-4 border-t border-zinc-800">
								<p className="text-sm text-zinc-400 mb-2">Role Colors</p>
								<div className="flex flex-wrap gap-2">
									{Object.entries(ROLE_COLORS).map(([role, colorClass]) => (
										<div key={role} className="flex items-center gap-1">
											<div className={`w-3 h-3 rounded ${colorClass}`}></div>
											<span className="text-xs text-zinc-400">{role}</span>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Shifts List */}
					<Card className="bg-zinc-900 border-zinc-800">
						<CardHeader>
							<CardTitle className="text-white">All Shifts</CardTitle>
						</CardHeader>
						<CardContent>
							{filteredShifts.length === 0 ? (
								<EmptyState
									icon={Clock}
									title={
										roleFilter !== "all"
											? `Keine Schichten mit Rolle "${roleFilter}"`
											: "Keine Schichten geplant"
									}
									description="Füge eine Schicht hinzu"
									className="py-8"
								/>
							) : (
								<div className="space-y-3">
									{filteredShifts.map((shift) => {
										const isUnavailable = isStaffUnavailable(shift.staff_id);
										const unavailReason = getAvailabilityReason(shift.staff_id);

										return (
											<div
												key={shift.id}
												className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
												onClick={() => openEditDialog(shift)}
											>
												<div className="flex items-center gap-4">
													<div
														className={`w-2 h-12 rounded ${ROLE_COLORS[shift.role] || "bg-zinc-600"}`}
													></div>
													<div>
														<div className="flex items-center gap-2">
															<p className="font-medium text-white">
																{shift.staff?.profiles?.full_name ||
																	"Unknown Staff"}
															</p>
															{isUnavailable && (
																<Badge
																	className={statusBadgeClass("unavailable")}
																>
																	<AlertTriangle className="h-3 w-3 mr-1" />
																	Unavailable
																</Badge>
															)}
														</div>
														<p className="text-sm text-zinc-400">
															{shift.role} • {formatTime(shift.start_time)} -{" "}
															{formatTime(shift.end_time)}
															{shift.break_minutes > 0 &&
																` • ${shift.break_minutes}min break`}
														</p>
														{shift.clocked_in_at && (
															<p className="text-xs text-emerald-400 mt-1">
																Clocked in at {formatTime(shift.clocked_in_at)}
															</p>
														)}
														{shift.clocked_out_at && (
															<p className="text-xs text-blue-400 mt-1">
																Clocked out at{" "}
																{formatTime(shift.clocked_out_at)}
															</p>
														)}
														{isUnavailable && unavailReason && (
															<p className="text-xs text-amber-400 mt-1">
																Reason: {unavailReason}
															</p>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Badge className={statusBadgeClass(shift.status)}>
														{shift.status}
													</Badge>
													{/* Clock-In Button */}
													{(shift.status === "scheduled" ||
														(shift.status === "confirmed" &&
															!shift.clocked_in_at)) && (
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
															title="Clock In"
															onClick={(e) => {
																e.stopPropagation();
																handleClockIn(shift.id);
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
													{/* Clock-Out Button */}
													{shift.status === "confirmed" &&
														shift.clocked_in_at &&
														!shift.clocked_out_at && (
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
																title="Clock Out"
																onClick={(e) => {
																	e.stopPropagation();
																	handleClockOut(shift.id);
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
													{/* Request Swap Button */}
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
														title="Request Swap"
														onClick={(e) => {
															e.stopPropagation();
															handleOpenSwapDialog(shift);
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
															handleDeleteClick(shift);
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Pending Swaps */}
					{swapRequests.length > 0 && (
						<Card className="bg-zinc-900 border-zinc-800 mt-6">
							<CardHeader>
								<CardTitle className="text-white flex items-center gap-2">
									<ArrowUpDown className="h-5 w-5" />
									Pending Swap Requests
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{swapRequests.map((sr) => {
									const relatedShift = shifts.find((s) => s.id === sr.shiftId);
									const targetStaff = staff.find(
										(s) => s.id === sr.requestedToStaffId,
									);
									const requestingStaff = staff.find(
										(s) => s.id === sr.requestedByStaffId,
									);

									return (
										<div
											key={sr.id}
											className="p-4 bg-zinc-950 border border-zinc-800 rounded"
										>
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm text-white font-medium">
														{sr.requestedByName ||
															requestingStaff?.profiles?.full_name ||
															"Someone"}{" "}
														wants to swap with{" "}
														{targetStaff?.profiles?.full_name || "Unknown"}
													</p>
													<p className="text-xs text-zinc-400 mt-1">
														Shift:{" "}
														{relatedShift
															? formatTime(relatedShift.start_time) +
																" - " +
																formatTime(relatedShift.end_time)
															: "Unknown"}
														{sr.reason && <> • Reason: {sr.reason}</>}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<Badge className={statusBadgeClass(sr.status)}>
														{sr.status}
													</Badge>
													{sr.status === "pending" && (
														<>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
																onClick={() => handleAcceptSwap(sr.id)}
															>
																<Check className="h-3 w-3 mr-1" />
																Accept
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-600/10"
																onClick={() => handleDeclineSwap(sr.id)}
															>
																<X className="h-3 w-3 mr-1" />
																Decline
															</Button>
														</>
													)}
													{sr.status === "accepted" && (
														<Button
															variant="ghost"
															size="sm"
															className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-600/10"
															onClick={() => handleApproveSwap(sr.id)}
														>
															<Send className="h-3 w-3 mr-1" />
															Approve
														</Button>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* Add/Edit Shift Dialog */}
			<Dialog
				open={shiftDialogOpen}
				onOpenChange={(open) => {
					setShiftDialogOpen(open);
					if (!open) {
						setEditingShift(null);
					}
				}}
			>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white">
							{editingShift ? "Edit Shift" : "Add New Shift"}
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							{editingShift
								? `Update shift for ${editingShift.staff?.profiles?.full_name || "staff member"}`
								: `Schedule a staff member for ${selectedEvent?.name}`}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="staff_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Staff Member *</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select staff member" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												{staff.map((member) => {
													const unavailable = isStaffUnavailable(member.id);
													return (
														<SelectItem key={member.id} value={member.id}>
															<div className="flex items-center gap-2">
																{member.profiles?.full_name || "Unknown"}
																{unavailable && (
																	<AlertTriangle className="h-3 w-3 text-amber-400" />
																)}
															</div>
														</SelectItem>
													);
												})}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role *</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												{STAFF_ROLES.map((role) => (
													<SelectItem key={role} value={role}>
														{role}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="start_time"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Start Time *</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="time"
													className="bg-zinc-950 border-zinc-800"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="end_time"
									render={({ field }) => (
										<FormItem>
											<FormLabel>End Time *</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="time"
													className="bg-zinc-950 border-zinc-800"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="break_minutes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Break (minutes)</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="number"
												placeholder="0"
												className="bg-zinc-950 border-zinc-800"
												onChange={(e) =>
													field.onChange(parseInt(e.target.value) || 0)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Status</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												<SelectItem value="scheduled">Scheduled</SelectItem>
												<SelectItem value="confirmed">Confirmed</SelectItem>
												<SelectItem value="completed">Completed</SelectItem>
												<SelectItem value="cancelled">Cancelled</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setShiftDialogOpen(false);
										setEditingShift(null);
									}}
									className="border-zinc-800"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={saving}
									className="bg-violet-600 hover:bg-violet-700"
								>
									{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{editingShift ? "Update Shift" : "Add Shift"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800">
					<DialogHeader>
						<DialogTitle className="text-white">Delete Shift</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Are you sure you want to delete this shift? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							className="border-zinc-800"
						>
							Cancel
						</Button>
						<Button
							onClick={handleDeleteConfirm}
							disabled={deleting}
							className="bg-red-600 hover:bg-red-700"
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Conflict Warning Dialog */}
			<AlertDialog
				open={conflictDialogOpen}
				onOpenChange={setConflictDialogOpen}
			>
				<AlertDialogContent className="bg-zinc-900 border-zinc-800">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-amber-400" />
							Shift Conflict Detected
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							This staff member has an overlapping shift
							{conflictData?.conflictingShifts?.[0] && (
								<>
									{" "}
									on{" "}
									<span className="text-zinc-300">
										{formatTime(conflictData.conflictingShifts[0].start_time)} -{" "}
										{formatTime(conflictData.conflictingShifts[0].end_time)}
										{conflictData.conflictingShifts[0].role &&
											` (${conflictData.conflictingShifts[0].role})`}
									</span>
								</>
							)}
							. Do you want to save anyway?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-800 text-zinc-400 hover:text-white">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (conflictData) {
									conflictData.pendingSubmit();
								}
							}}
							className="bg-amber-600 hover:bg-amber-700 text-white"
						>
							Save Anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk Shift Assignment Dialog */}
			<Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-md max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">
							Bulk Shift Assignment
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Assign the same shift to multiple staff members at once
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Role selector */}
						<div className="space-y-2">
							<label className="text-sm text-zinc-400">Role *</label>
							<Select value={bulkRole} onValueChange={setBulkRole}>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{STAFF_ROLES.map((role) => (
										<SelectItem key={role} value={role}>
											{role}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Staff multi-select */}
						<div className="space-y-2">
							<label className="text-sm text-zinc-400">
								Staff Members * ({selectedBulkStaff.length} selected)
							</label>
							<ScrollArea className="h-48 bg-zinc-950 border border-zinc-800 rounded-md p-2">
								{staff.length === 0 ? (
									<p className="text-sm text-zinc-500 p-2">
										No staff members available
									</p>
								) : (
									<div className="space-y-1">
										{staff.map((member) => {
											const isSelected = selectedBulkStaff.includes(member.id);
											return (
												<label
													key={member.id}
													className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800 transition-colors"
												>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => toggleBulkStaff(member.id)}
														className="rounded border-zinc-700 bg-zinc-800 text-violet-600"
													/>
													<span className="text-sm text-zinc-300">
														{member.profiles?.full_name || "Unknown"}
													</span>
													<span className="text-xs text-zinc-500 ml-auto">
														{member.role}
													</span>
												</label>
											);
										})}
									</div>
								)}
							</ScrollArea>
						</div>

						{/* Time inputs */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm text-zinc-400">Start Time *</label>
								<Input
									type="time"
									value={bulkStartTime}
									onChange={(e) => setBulkStartTime(e.target.value)}
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm text-zinc-400">End Time *</label>
								<Input
									type="time"
									value={bulkEndTime}
									onChange={(e) => setBulkEndTime(e.target.value)}
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
						</div>

						{/* Break minutes */}
						<div className="space-y-2">
							<label className="text-sm text-zinc-400">Break (minutes)</label>
							<Input
								type="number"
								min={0}
								value={bulkBreakMinutes}
								onChange={(e) =>
									setBulkBreakMinutes(parseInt(e.target.value) || 0)
								}
								placeholder="0"
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setBulkDialogOpen(false);
								setSelectedBulkStaff([]);
								setBulkRole("");
								setBulkStartTime("");
								setBulkEndTime("");
								setBulkBreakMinutes(0);
							}}
							className="border-zinc-800"
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkSubmit}
							disabled={
								bulkSubmitting ||
								selectedBulkStaff.length === 0 ||
								!bulkRole ||
								!bulkStartTime ||
								!bulkEndTime
							}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{bulkSubmitting && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Assign{" "}
							{selectedBulkStaff.length > 0 && `(${selectedBulkStaff.length})`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Swap Request Dialog */}
			<Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white">Request Shift Swap</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Select a colleague to swap shifts with
							{swapTargetShift && (
								<>
									{" "}
									for {formatTime(swapTargetShift.start_time)} -{" "}
									{formatTime(swapTargetShift.end_time)}
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm text-zinc-400">
								Select Colleague *
							</label>
							<Select
								value={swapSelectedStaff}
								onValueChange={setSwapSelectedStaff}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Choose a staff member" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{staff
										.filter(
											(s) =>
												swapTargetShift &&
												s.role === swapTargetShift.role &&
												s.id !== swapTargetShift.staff_id,
										)
										.map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.profiles?.full_name || "Unknown"}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm text-zinc-400">Reason (optional)</label>
							<textarea
								value={swapReason}
								onChange={(e) => setSwapReason(e.target.value)}
								placeholder="Why do you want to swap?"
								className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-zinc-300 resize-none"
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setSwapDialogOpen(false)}
							className="border-zinc-800"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmitSwapRequest}
							disabled={!swapSelectedStaff}
							className="bg-violet-600 hover:bg-violet-700"
						>
							<Send className="h-4 w-4 mr-2" />
							Send Request
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Shift Template Apply Dialog */}
			<ShiftTemplateApplyDialog
				eventId={selectedEventId}
				eventDate={selectedEvent?.date || ""}
				doorTime={selectedEvent?.door_time || null}
				staff={staff}
				open={templateDialogOpen}
				onOpenChange={setTemplateDialogOpen}
				onApplied={handleTemplateApplied}
			/>
		</div>
	);
}
