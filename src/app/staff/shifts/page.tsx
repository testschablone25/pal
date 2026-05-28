"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Calendar,
	Clock,
	Plus,
	AlertTriangle,
	Users,
	Puzzle,
	Download,
	ArrowUpDown,
	Check,
	X,
	Send,
} from "lucide-react";
import { ShiftTimeline } from "@/components/shifts/timeline/shift-timeline";
import { ShiftFormDialog } from "@/components/shifts/shift-form-dialog";
import type { ShiftFormValues } from "@/lib/staff-shifts/form-schema";
import {
	ShiftClockActions,
	ShiftInfoRow,
} from "@/components/staff-shifts/shift-clock-actions";
import { ShiftBulkCreate } from "@/components/staff-shifts/shift-bulk-create";
import { ShiftTemplateApplyDialog } from "@/components/shift-template-apply-dialog";
import { statusBadgeClass } from "@/lib/utils";
import {
	getLocalTimezoneOffset,
	getTimeInputValue,
} from "@/lib/staff-shifts/utils";
import type { Shift } from "@/lib/staff-shifts/types";
import type {
	Event,
	StaffMember,
	Availability,
	ConflictingShift,
	SwapRequest,
	BulkShiftInput,
} from "@/lib/staff-shifts/types";
import { jsPDF } from "jspdf";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { StaffSubNav } from "@/components/staff/staff-sub-nav";

interface VenueInfo {
	id: string;
	name: string;
}

export default function ShiftsPage() {
	const { toast } = useToast();
	const [events, setEvents] = useState<Event[]>([]);
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [availability, setAvailability] = useState<Availability[]>([]);
	const [selectedEventId, setSelectedEventId] = useState<string>("");
	const [selectedVenue, setSelectedVenue] = useState<VenueInfo | null>(null);
	const [loading, setLoading] = useState(true);

	// Shift form dialog
	const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editingShift, setEditingShift] = useState<Shift | null>(null);

	// Delete dialog
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Timeline filtering
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [shiftSearch, setShiftSearch] = useState<string>("");

	// Conflict dialog
	const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
	const [conflictData, setConflictData] = useState<{
		conflictingShifts: ConflictingShift[];
		pendingSubmit: () => Promise<void>;
	} | null>(null);

	// Bulk assignment dialog
	const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

	// Template dialog
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

	// Hydration guard: prevent SSR/CSR mismatch on boolean HTML attributes
	useEffect(() => {
		fetchEvents();
		fetchStaff();
	}, []);

	useEffect(() => {
		if (selectedEventId) {
			fetchShifts();
			fetchAvailability();
			fetchEventVenue();
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

	const fetchEventVenue = async () => {
		try {
			const selectedEvent = events.find((e) => e.id === selectedEventId);
			if (!selectedEvent) return;
			const response = await fetch(`/api/events/${selectedEventId}`);
			const data = await response.json();
			if (data.venue_id) {
				setSelectedVenue({ id: data.venue_id, name: "" });
			} else {
				setSelectedVenue(null);
			}
		} catch (error) {
			console.error("Failed to fetch event venue:", error);
			setSelectedVenue(null);
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
			if (excludeShiftId) params.set("exclude_shift_id", excludeShiftId);
			const response = await fetch(`/api/shifts?${params}`);
			return await response.json();
		} catch (error) {
			console.error("Failed to check conflicts:", error);
			return { hasConflict: false, conflictingShifts: [] };
		}
	};

	const openCreateDialog = () => {
		setEditingShift(null);
		setShiftDialogOpen(true);
	};

	const openEditDialog = (shift: Shift) => {
		setEditingShift(shift);
		setShiftDialogOpen(true);
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

	const handleFormSubmit = async (values: ShiftFormValues) => {
		if (!selectedEventId) return;
		const selectedEvent = events.find((e) => e.id === selectedEventId);
		if (!selectedEvent) return;

		const tz = getLocalTimezoneOffset();
		const startDateTime = `${selectedEvent.date}T${values.start_time}:00${tz}`;
		let endDateTime = `${selectedEvent.date}T${values.end_time}:00${tz}`;
		if (values.end_time <= values.start_time) {
			const nextDay = new Date(selectedEvent.date);
			nextDay.setDate(nextDay.getDate() + 1);
			endDateTime = `${nextDay.toISOString().split("T")[0]}T${values.end_time}:00${tz}`;
		}

		const conflictResult = await checkForConflicts(
			values.staff_id,
			selectedEventId,
			startDateTime,
			endDateTime,
			editingShift?.id,
		);

		if (conflictResult.hasConflict) {
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
			const url = editingShift
				? `/api/shifts/${editingShift.id}`
				: "/api/shifts";
			const method = editingShift ? "PUT" : "POST";
			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: selectedEventId,
					staff_id: values.staff_id,
					role: values.role,
					sub_location_id: values.sub_location_id || null,
					start_time: startDateTime,
					end_time: endDateTime,
					break_minutes: values.break_minutes,
					status: values.status,
				}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save shift");
			}
			setShiftDialogOpen(false);
			setEditingShift(null);
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

	// Drag-to-move handler for timeline
	const handleShiftMoved = useCallback(
		async (shiftId: string, newStartTime: string, newEndTime: string) => {
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
					let errorMsg = "Failed to update shift";
					try {
						const errBody = await response.json();
						errorMsg = errBody.error || errBody.details || errorMsg;
					} catch {
						// Response was not valid JSON, use fallback message
					}
					throw new Error(errorMsg);
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
			}
		},
		[fetchShifts, toast],
	);

	const selectedEvent = events.find((e) => e.id === selectedEventId);

	// Delete handler
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
			if (!response.ok) throw new Error("Failed to delete shift");
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
				description: "Fehler beim Löschen der Schicht.",
			});
		} finally {
			setDeleting(false);
		}
	};

	// Bulk submit handler
	const handleBulkSubmit = async (data: {
		eventId: string;
		staffIds: string[];
		role: string;
		startTime: string;
		endTime: string;
		breakMinutes: number;
	}) => {
		const ev = events.find((e) => e.id === data.eventId);
		if (!ev) return;

		const tz = getLocalTimezoneOffset();
		const startDateTime = `${ev.date}T${data.startTime}:00${tz}`;
		let endDateTime = `${ev.date}T${data.endTime}:00${tz}`;
		if (data.endTime <= data.startTime) {
			const nextDay = new Date(ev.date);
			nextDay.setDate(nextDay.getDate() + 1);
			endDateTime = `${nextDay.toISOString().split("T")[0]}T${data.endTime}:00${tz}`;
		}

		const shiftsToCreate: BulkShiftInput[] = data.staffIds.map((staffId) => ({
			staff_id: staffId,
			role: data.role,
			start_time: startDateTime,
			end_time: endDateTime,
			break_minutes: data.breakMinutes,
		}));

		const response = await fetch("/api/shifts/bulk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				event_id: data.eventId,
				shifts: shiftsToCreate,
			}),
		});

		if (!response.ok) {
			const err = await response.json();
			throw new Error(err.error || "Failed to create bulk shifts");
		}

		setBulkDialogOpen(false);
		fetchShifts();
		toast({
			title: "Massenschichten erstellt",
			description: `${data.staffIds.length} Schichten wurden erfolgreich erstellt.`,
		});
	};

	const handleTemplateApplied = () => {
		fetchShifts();
	};

	// Clock handlers
	const handleClockIn = async (shiftId: string) => {
		setClockingIn(shiftId);
		try {
			const response = await fetch(`/api/shifts/${shiftId}/clock-in`, {
				method: "POST",
			});
			if (!response.ok) throw new Error("Failed to clock in");
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
				description: "Fehler beim Einstempeln.",
			});
		} finally {
			setClockingIn(null);
		}
	};

	const handleClockOut = async (shiftId: string) => {
		setClockingOut(shiftId);
		try {
			const response = await fetch(`/api/shifts/${shiftId}/clock-out`, {
				method: "POST",
			});
			if (!response.ok) throw new Error("Failed to clock out");
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
				description: "Fehler beim Ausstempeln.",
			});
		} finally {
			setClockingOut(null);
		}
	};

	// Swap handlers
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
			requestedByName:
				requestingStaffMember?.full_name ||
				requestingStaffMember?.profiles?.full_name ||
				"Unknown",
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
		setShifts((prev) =>
			prev.map((s) => {
				if (s.id === swap.shiftId)
					return { ...s, staff_id: swap.requestedToStaffId };
				if (s.staff_id === swap.requestedToStaffId)
					return { ...s, staff_id: swap.requestedByStaffId };
				return s;
			}),
		);
		setSwapRequests((prev) =>
			prev.map((sr) =>
				sr.id === swapId ? { ...sr, status: "approved" as const } : sr,
			),
		);
	};

	// Export handlers
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
		const rows = shifts.map((shift) => {
			const start = new Date(shift.start_time);
			const end = new Date(shift.end_time);
			const durationHours = (
				(end.getTime() - start.getTime()) /
				(1000 * 60 * 60)
			).toFixed(1);
			return [
				shift.staff?.full_name || shift.staff?.profiles?.full_name || "Unknown",
				shift.role,
				getTimeInputValue(shift.start_time),
				getTimeInputValue(shift.end_time),
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
		doc.setFont("helvetica", "bold");
		let xPos = 10;
		tableHeaders.forEach((header, i) => {
			doc.text(header, xPos, yPos);
			xPos += columnWidths[i];
		});
		yPos += 8;
		doc.setFont("helvetica", "normal");
		shifts.forEach((shift) => {
			if (yPos > 270) {
				doc.addPage();
				yPos = 20;
			}
			xPos = 10;
			[
				shift.staff?.full_name || shift.staff?.profiles?.full_name || "Unknown",
				shift.role,
				getTimeInputValue(shift.start_time),
				getTimeInputValue(shift.end_time),
				shift.status,
			].forEach((cell, i) => {
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

			<StaffSubNav />

			{/* Event Selector */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
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
								<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
								<DropdownMenuContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<CardContent className="pt-6 space-y-4">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-16 w-full bg-zinc-800" />
						))}
					</CardContent>
				</Card>
			) : !selectedEventId ? (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
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

					{/* Timeline — now event-driven with sub-location support */}
					<ShiftTimeline
						shifts={shifts}
						doorTime={selectedEvent?.door_time || null}
						endTime={selectedEvent?.end_time || null}
						searchValue={shiftSearch}
						onSearchChange={setShiftSearch}
						roleFilter={roleFilter}
						onRoleFilterChange={setRoleFilter}
						onEditShift={openEditDialog}
						onDeleteShift={handleDeleteClick}
						onShiftMoved={handleShiftMoved}
					/>

					{/* Shifts List */}
					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
						<CardHeader>
							<CardTitle className="text-white">All Shifts</CardTitle>
						</CardHeader>
						<CardContent>
							{shifts.length === 0 ? (
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
									{shifts.map((shift) => {
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
														className={`w-2 h-12 rounded ${"bg-zinc-600"}`}
													/>
													<div>
														<div className="flex items-center gap-2">
															<p className="font-medium text-white">
																{shift.staff?.full_name ||
																	shift.staff?.profiles?.full_name ||
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
															{shift.role} •{" "}
															{getTimeInputValue(shift.start_time)} -{" "}
															{getTimeInputValue(shift.end_time)}
															{shift.break_minutes > 0 &&
																` • ${shift.break_minutes}min break`}
														</p>
														<ShiftInfoRow
															clockedInAt={shift.clocked_in_at}
															clockedOutAt={shift.clocked_out_at}
														/>
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
													<ShiftClockActions
														shift={shift}
														clockingIn={clockingIn}
														clockingOut={clockingOut}
														onClockIn={handleClockIn}
														onClockOut={handleClockOut}
														onOpenSwap={handleOpenSwapDialog}
														onDeleteClick={handleDeleteClick}
													/>
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
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mt-6">
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
														{targetStaff?.full_name ||
															targetStaff?.profiles?.full_name ||
															"Unknown"}
													</p>
													<p className="text-xs text-zinc-400 mt-1">
														Shift:{" "}
														{relatedShift
															? `${getTimeInputValue(relatedShift.start_time)} - ${getTimeInputValue(relatedShift.end_time)}`
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

			{/* Shift Form Dialog — now with sub-location selector */}
			<ShiftFormDialog
				open={shiftDialogOpen}
				onOpenChange={(open) => {
					setShiftDialogOpen(open);
					if (!open) setEditingShift(null);
				}}
				editingShift={editingShift}
				staff={staff}
				venueId={selectedVenue?.id || null}
				eventName={selectedEvent?.name}
				saving={saving}
				onSubmit={handleFormSubmit}
				isStaffUnavailable={isStaffUnavailable}
			/>

			{/* Delete Confirmation */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white">
							Delete Shift
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							Are you sure you want to delete this shift? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-800 text-zinc-400 hover:text-white">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-red-600 hover:bg-red-700"
						>
							{deleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Conflict Warning */}
			<AlertDialog
				open={conflictDialogOpen}
				onOpenChange={setConflictDialogOpen}
			>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
										{getTimeInputValue(
											conflictData.conflictingShifts[0].start_time,
										)}{" "}
										-{" "}
										{getTimeInputValue(
											conflictData.conflictingShifts[0].end_time,
										)}
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
							onClick={() => conflictData?.pendingSubmit()}
							className="bg-amber-600 hover:bg-amber-700 text-white"
						>
							Save Anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk Shift Assignment */}
			<ShiftBulkCreate
				open={bulkDialogOpen}
				onOpenChange={setBulkDialogOpen}
				selectedEvent={selectedEvent || null}
				staff={staff}
				onBulkSubmit={handleBulkSubmit}
			/>

			{/* Swap Request Dialog */}
			<Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white">Request Shift Swap</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Select a colleague to swap shifts with
							{swapTargetShift && (
								<>
									{" "}
									for {getTimeInputValue(swapTargetShift.start_time)} -{" "}
									{getTimeInputValue(swapTargetShift.end_time)}
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
								<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
									{staff
										.filter(
											(s) =>
												swapTargetShift &&
												s.role === swapTargetShift.role &&
												s.id !== swapTargetShift.staff_id,
										)
										.map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.full_name ||
													member.profiles?.full_name ||
													"Unknown"}
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

			{/* Template Apply Dialog */}
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
