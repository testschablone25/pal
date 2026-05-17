"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ClipboardList,
	Users,
	Calendar,
	Package,
	MapPin,
	AlertTriangle,
	Loader2,
	Clock,
	CheckCircle2,
	Circle,
	Building2,
	Plus,
	ArrowRight,
	X,
} from "lucide-react";
import { statusBadgeClass, cn } from "@/lib/utils";
import { formatDateShort, formatTime } from "@/lib/dates";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/browser";

// ============================================
// Types
// ============================================

interface VenueDetail {
	id: string;
	name: string;
	address: string | null;
	capacity: number;
	venue_type: string | null;
	notes: string | null;
	contact_name: string | null;
	contact_phone: string | null;
	contact_email: string | null;
	sub_locations: Array<{
		id: string;
		name: string;
		description: string | null;
		capacity: number | null;
	}>;
	events: Array<{
		id: string;
		name: string;
		date: string;
		status: string;
		door_time: string | null;
		end_time: string | null;
		max_capacity: number | null;
	}>;
	tasks: Array<{
		id: string;
		title: string;
		status: string;
		priority: string;
		due_date: string | null;
		scheduled_date: string | null;
		task_type: string | null;
		assignee: {
			id: string;
			full_name: string | null;
			email: string | null;
		} | null;
	}>;
	staff_shifts: Array<{
		id: string;
		role: string;
		start_time: string;
		end_time: string;
		status: string;
		staff: {
			id: string;
			role: string;
			profiles: { full_name: string | null; email: string | null } | null;
		} | null;
		event: { id: string; name: string; date: string } | null;
	}>;
	inventory: Array<{
		id: string;
		name: string;
		category: string;
		condition_enum: string | null;
		serial_number: string | null;
		sub_location: { id: string; name: string } | null;
	}>;
	stats: {
		open_tasks: number;
		urgent_tasks: number;
		upcoming_events: number;
		total_inventory: number;
		sub_locations_count: number;
	};
}

interface VenueExpandedViewProps {
	venueId: string;
	onCapacityChange?: () => void;
}

interface StaffMember {
	id: string;
	role: string;
	profiles: {
		id: string;
		full_name: string | null;
		email: string | null;
	} | null;
}

interface TaskFormData {
	title: string;
	description: string;
	priority: string;
	due_date: string;
	assignee_id: string;
}

interface ShiftFormData {
	event_id: string;
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
}

// ============================================
// Component
// ============================================

export function VenueExpandedView({
	venueId,
	onCapacityChange,
}: VenueExpandedViewProps) {
	const { toast } = useToast();
	const [detail, setDetail] = useState<VenueDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Settings form state
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		address: "",
		capacity: 0,
		venue_type: "",
		contact_name: "",
		contact_phone: "",
		contact_email: "",
		notes: "",
	});

	// Task creation dialog state
	const [taskDialogOpen, setTaskDialogOpen] = useState(false);
	const [taskForm, setTaskForm] = useState<TaskFormData>({
		title: "",
		description: "",
		priority: "medium",
		due_date: "",
		assignee_id: "",
	});
	const [taskSaving, setTaskSaving] = useState(false);

	// Shift creation dialog state
	const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
	const [shiftForm, setShiftForm] = useState<ShiftFormData>({
		event_id: "",
		staff_id: "",
		role: "",
		start_time: "",
		end_time: "",
	});
	const [shiftSaving, setShiftSaving] = useState(false);

	// Inventory move dialog state
	const [moveDialogOpen, setMoveDialogOpen] = useState(false);
	const [moveItem, setMoveItem] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [moveTarget, setMoveTarget] = useState("");
	const [moveSaving, setMoveSaving] = useState(false);

	// Link event dialog state
	const [linkEventDialogOpen, setLinkEventDialogOpen] = useState(false);
	const [availableEvents, setAvailableEvents] = useState<
		Array<{ id: string; name: string; date: string; status: string }>
	>([]);
	const [linkingEventId, setLinkingEventId] = useState<string | null>(null);

	// Staff members list
	const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

	useEffect(() => {
		fetchDetail(true);
	}, [venueId]);

	useEffect(() => {
		if (taskDialogOpen || shiftDialogOpen) {
			fetchStaffMembers();
		}
	}, [taskDialogOpen, shiftDialogOpen]);

	const fetchDetail = async (isInitial = false) => {
		if (isInitial) setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/venues/${venueId}`);
			if (!response.ok) throw new Error("Failed to fetch venue details");
			const data = await response.json();
			setDetail(data);
			setFormData({
				name: data.name || "",
				address: data.address || "",
				capacity: data.capacity || 0,
				venue_type: data.venue_type || "",
				contact_name: data.contact_name || "",
				contact_phone: data.contact_phone || "",
				contact_email: data.contact_email || "",
				notes: data.notes || "",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load venue");
		} finally {
			if (isInitial) setLoading(false);
		}
	};

	const fetchStaffMembers = async () => {
		try {
			const response = await fetch("/api/staff?limit=100");
			if (!response.ok) return;
			const data = await response.json();
			setStaffMembers(data.staff || []);
		} catch {
			// Silently fail - staff list is optional
		}
	};

	const getCurrentUserId = async (): Promise<string | null> => {
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			return user?.id || null;
		} catch {
			return null;
		}
	};

	const handleSaveSettings = async () => {
		setSaving(true);
		try {
			const response = await fetch(`/api/venues/${venueId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save");
			}
			toast({
				title: "Gespeichert",
				description: "Venue-Einstellungen wurden aktualisiert.",
			});
			fetchDetail();
			onCapacityChange?.();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error ? err.message : "Fehler beim Speichern.",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleSubLocationCapacity = async (
		subLocId: string,
		name: string,
		capacity: number,
	) => {
		try {
			const response = await fetch(
				`/api/venues/${venueId}/sublocations/${subLocId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, capacity }),
				},
			);
			if (!response.ok) throw new Error("Failed to update capacity");
			fetchDetail();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error ? err.message : "Fehler beim Aktualisieren.",
			});
		}
	};

	const handleCreateTask = async () => {
		if (!taskForm.title.trim()) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description: "Titel ist erforderlich.",
			});
			return;
		}

		setTaskSaving(true);
		try {
			const userId = await getCurrentUserId();
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: taskForm.title.trim(),
					description: taskForm.description.trim() || null,
					priority: taskForm.priority,
					due_date: taskForm.due_date || null,
					assignee_id: taskForm.assignee_id || null,
					venue_id: venueId,
					created_by: userId,
					status: "todo",
				}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create task");
			}
			toast({
				title: "Aufgabe erstellt",
				description: "Die Aufgabe wurde erfolgreich erstellt.",
			});
			setTaskDialogOpen(false);
			setTaskForm({
				title: "",
				description: "",
				priority: "medium",
				due_date: "",
				assignee_id: "",
			});
			fetchDetail();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Erstellen der Aufgabe.",
			});
		} finally {
			setTaskSaving(false);
		}
	};

	const handleCreateShift = async () => {
		if (!shiftForm.event_id || !shiftForm.staff_id || !shiftForm.role.trim()) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description: "Event, Staff und Role sind erforderlich.",
			});
			return;
		}

		if (!shiftForm.start_time || !shiftForm.end_time) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description: "Start- und Endzeit sind erforderlich.",
			});
			return;
		}

		setShiftSaving(true);
		try {
			const response = await fetch("/api/shifts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: shiftForm.event_id,
					staff_id: shiftForm.staff_id,
					role: shiftForm.role.trim(),
					start_time: shiftForm.start_time,
					end_time: shiftForm.end_time,
					status: "scheduled",
				}),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create shift");
			}
			toast({
				title: "Schicht erstellt",
				description: "Die Schicht wurde erfolgreich erstellt.",
			});
			setShiftDialogOpen(false);
			setShiftForm({
				event_id: "",
				staff_id: "",
				role: "",
				start_time: "",
				end_time: "",
			});
			fetchDetail();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Erstellen der Schicht.",
			});
		} finally {
			setShiftSaving(false);
		}
	};

	// Fetch events not yet at this venue
	const fetchAvailableEvents = async () => {
		try {
			const response = await fetch("/api/events?limit=100");
			if (!response.ok) throw new Error("Failed to fetch events");
			const data = await response.json();
			const currentEventIds = new Set(detail?.events?.map((e) => e.id) || []);
			const available = (data.events || []).filter(
				(e: { id: string }) => !currentEventIds.has(e.id),
			);
			setAvailableEvents(available);
		} catch {
			setAvailableEvents([]);
		}
	};

	const handleLinkEvent = async (eventId: string) => {
		setLinkingEventId(eventId);
		try {
			const response = await fetch(`/api/events/${eventId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ venue_id: venueId }),
			});
			if (!response.ok) throw new Error("Failed to link event");
			toast({
				title: "Event zugewiesen",
				description: "Das Event wurde diesem Veranstaltungsort zugewiesen.",
			});
			setLinkingEventId(null);
			setLinkEventDialogOpen(false);
			fetchDetail();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Zuweisen des Events.",
			});
			setLinkingEventId(null);
		}
	};

	const handleUnlinkEvent = async (eventId: string) => {
		// Optimistic update — remove event, its tasks, and its shifts immediately
		if (detail) {
			setDetail({
				...detail,
				events: detail.events.filter((e) => e.id !== eventId),
				tasks: detail.tasks.filter((t) => {
					const taskRecord = t as unknown as Record<string, unknown>;
					return taskRecord.event_id !== eventId;
				}),
				staff_shifts: detail.staff_shifts.filter((s) => {
					const eventObj = s.event as { id: string } | null;
					return eventObj?.id !== eventId;
				}),
			});
		}

		try {
			const response = await fetch(`/api/events/${eventId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ venue_id: null }),
			});
			if (!response.ok) throw new Error("Failed to unlink event");
			toast({
				title: "Event entfernt",
				description: "Das Event wurde vom Veranstaltungsort entfernt.",
			});
		} catch (err) {
			// Revert on error
			fetchDetail();
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Entfernen des Events.",
			});
		}
	};

	const handleMoveItem = async () => {
		if (!moveItem || !moveTarget) return;

		setMoveSaving(true);
		try {
			const response = await fetch(`/api/items/${moveItem.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sub_location_id: moveTarget || null }),
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to move item");
			}
			toast({
				title: "Artikel verschoben",
				description: `"${moveItem.name}" wurde erfolgreich verschoben.`,
			});
			setMoveDialogOpen(false);
			setMoveItem(null);
			setMoveTarget("");
			fetchDetail();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error ? err.message : "Fehler beim Verschieben.",
			});
		} finally {
			setMoveSaving(false);
		}
	};

	const getPriorityDot = (priority: string) => {
		switch (priority) {
			case "urgent":
				return "bg-red-500";
			case "high":
				return "bg-orange-500";
			case "medium":
				return "bg-blue-500";
			default:
				return "bg-zinc-500";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "done":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "in_progress":
				return <Circle className="h-4 w-4 text-blue-500 fill-blue-500/20" />;
			default:
				return <Circle className="h-4 w-4 text-zinc-500" />;
		}
	};

	if (loading) {
		return (
			<div className="p-6 text-center text-zinc-400">
				<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
				Loading venue details...
			</div>
		);
	}

	if (error || !detail) {
		return (
			<div className="p-6 text-center text-red-400">
				{error || "Venue not found"}
			</div>
		);
	}

	return (
		<>
			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="bg-zinc-800 border border-zinc-700 mb-4">
					<TabsTrigger
						value="overview"
						className="data-[state=active]:bg-violet-600"
					>
						Overview
					</TabsTrigger>
					<TabsTrigger
						value="tasks"
						className="data-[state=active]:bg-violet-600"
					>
						Tasks
						{detail.stats.open_tasks > 0 && (
							<Badge className="ml-1.5 bg-zinc-700 text-xs h-5 px-1.5">
								{detail.stats.open_tasks}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="staff"
						className="data-[state=active]:bg-violet-600"
					>
						Staff
						{detail.stats.sub_locations_count > 0 && (
							<Badge className="ml-1.5 bg-zinc-700 text-xs h-5 px-1.5">
								{detail.staff_shifts.length}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="events"
						className="data-[state=active]:bg-violet-600"
					>
						Events
						{detail.stats.upcoming_events > 0 && (
							<Badge className="ml-1.5 bg-zinc-700 text-xs h-5 px-1.5">
								{detail.stats.upcoming_events}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="inventory"
						className="data-[state=active]:bg-violet-600"
					>
						Inventory
						{detail.stats.total_inventory > 0 && (
							<Badge className="ml-1.5 bg-zinc-700 text-xs h-5 px-1.5">
								{detail.stats.total_inventory}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="settings"
						className="data-[state=active]:bg-violet-600"
					>
						Settings
					</TabsTrigger>
				</TabsList>

				{/* ===== OVERVIEW TAB ===== */}
				<TabsContent value="overview" className="space-y-4">
					{/* Urgent Tasks Warning */}
					{detail.stats.urgent_tasks > 0 && (
						<div className="flex items-center gap-3 p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
							<AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
							<div>
								<p className="text-sm font-medium text-red-400">
									{detail.stats.urgent_tasks} urgent task
									{detail.stats.urgent_tasks !== 1 ? "s" : ""} require attention
								</p>
								<p className="text-xs text-red-400/70">
									Urgent or overdue tasks need to be completed
								</p>
							</div>
						</div>
					)}

					{/* Stats Dashboard */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<StatCard
							icon={<ClipboardList className="h-4 w-4" />}
							label="Open Tasks"
							value={detail.stats.open_tasks}
							accent={detail.stats.urgent_tasks > 0 ? "red" : "default"}
						/>
						<StatCard
							icon={<Calendar className="h-4 w-4" />}
							label="Upcoming Events"
							value={detail.stats.upcoming_events}
						/>
						<StatCard
							icon={<Users className="h-4 w-4" />}
							label="Staff Scheduled"
							value={detail.staff_shifts.length}
						/>
						<StatCard
							icon={<Package className="h-4 w-4" />}
							label="Inventory Items"
							value={detail.stats.total_inventory}
						/>
					</div>

					{/* Venue Info + Next Event */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card className="bg-zinc-800/50 border-zinc-700/50">
							<CardContent className="p-4">
								<h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
									<Building2 className="h-4 w-4" />
									Venue Info
								</h4>
								<div className="space-y-2.5 text-sm">
									<div className="flex items-center justify-between">
										<span className="text-zinc-500">Type</span>
										<Badge
											className={statusBadgeClass(detail.venue_type || "venue")}
										>
											{detail.venue_type || "Venue"}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-zinc-500">Total Capacity</span>
										<span className="text-zinc-300 font-medium">
											{detail.capacity.toLocaleString()}
										</span>
									</div>
									{detail.address && (
										<div className="flex items-start gap-2">
											<MapPin className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
											<span className="text-zinc-400">{detail.address}</span>
										</div>
									)}
									<div className="flex items-center justify-between">
										<span className="text-zinc-500">Sub-Locations</span>
										<span className="text-zinc-300">
											{detail.stats.sub_locations_count}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-zinc-800/50 border-zinc-700/50">
							<CardContent className="p-4">
								<h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									Next Event
								</h4>
								{(() => {
									const today = new Date().toISOString().split("T")[0];
									const nextEvent = detail.events.find((e) => e.date >= today);
									if (!nextEvent) {
										return (
											<p className="text-sm text-zinc-500 italic">
												No upcoming events
											</p>
										);
									}
									const isToday = today === nextEvent.date;
									return (
										<Link href={`/events/${nextEvent.id}`}>
											<div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30 hover:border-violet-600/30 transition-colors">
												<div className="flex items-center justify-between mb-1">
													<span className="text-sm font-medium text-white">
														{nextEvent.name}
													</span>
													<Badge className={statusBadgeClass(nextEvent.status)}>
														{nextEvent.status}
													</Badge>
												</div>
												<div className="flex items-center gap-3 text-xs text-zinc-400">
													<span>{formatDateShort(nextEvent.date)}</span>
													{nextEvent.door_time && (
														<span className="flex items-center gap-1">
															<Clock className="h-3 w-3" />
															{nextEvent.door_time}
															{nextEvent.end_time
																? ` - ${nextEvent.end_time}`
																: ""}
														</span>
													)}
													{isToday && (
														<Badge className="bg-violet-600 text-xs">
															Today
														</Badge>
													)}
												</div>
											</div>
										</Link>
									);
								})()}
							</CardContent>
						</Card>
					</div>

					{/* Contacts & Notes - Inline Editable */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card className="bg-zinc-800/50 border-zinc-700/50">
							<CardContent className="p-4">
								<h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
									<Users className="h-4 w-4" />
									Contacts
								</h4>
								<div className="space-y-3">
									<InlineField
										label="Contact Name"
										value={detail.contact_name}
										venueId={venueId}
										field="contact_name"
										onSaved={fetchDetail}
									/>
									<InlineField
										label="Contact Phone"
										value={detail.contact_phone}
										venueId={venueId}
										field="contact_phone"
										onSaved={fetchDetail}
									/>
									<InlineField
										label="Contact Email"
										value={detail.contact_email}
										venueId={venueId}
										field="contact_email"
										type="email"
										onSaved={fetchDetail}
									/>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-zinc-800/50 border-zinc-700/50">
							<CardContent className="p-4">
								<h4 className="text-sm font-medium text-zinc-300 mb-3">
									Notes
								</h4>
								<InlineField
									label="Notes"
									value={detail.notes}
									venueId={venueId}
									field="notes"
									type="textarea"
									onSaved={fetchDetail}
								/>
							</CardContent>
						</Card>
					</div>

					{/* Sub-Locations with Capacity */}
					{detail.sub_locations.length > 0 && (
						<Card className="bg-zinc-800/50 border-zinc-700/50">
							<CardContent className="p-4">
								<h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									Sub-Locations
								</h4>
								<div className="space-y-2">
									{detail.sub_locations.map((sl) => (
										<SubLocationRow
											key={sl.id}
											subLocation={sl}
											onCapacityChange={(newCapacity) =>
												handleSubLocationCapacity(sl.id, sl.name, newCapacity)
											}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* ===== TASKS TAB ===== */}
				<TabsContent value="tasks" className="space-y-3">
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={() => setTaskDialogOpen(true)}
							className="bg-violet-600 hover:bg-violet-700"
						>
							<Plus className="h-4 w-4 mr-1" />
							Create Task
						</Button>
					</div>

					{detail.tasks.length === 0 ? (
						<div className="text-center py-8 text-zinc-500">
							<ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No open tasks at this venue</p>
						</div>
					) : (
						detail.tasks.map((task) => (
							<div
								key={task.id}
								className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
							>
								{getStatusIcon(task.status)}
								<div className="flex-1 min-w-0">
									<p className="text-sm text-white truncate">{task.title}</p>
									<div className="flex items-center gap-2 mt-1">
										<div
											className={cn(
												"h-2 w-2 rounded-full",
												getPriorityDot(task.priority),
											)}
										/>
										<span className="text-xs text-zinc-500 capitalize">
											{task.priority}
										</span>
										{task.due_date && (
											<span className="text-xs text-zinc-500">
												Due: {formatDateShort(task.due_date)}
											</span>
										)}
										{task.task_type && (
											<Badge
												variant="outline"
												className="text-xs border-zinc-700"
											>
												{task.task_type}
											</Badge>
										)}
									</div>
								</div>
								<div className="text-right shrink-0">
									{task.assignee ? (
										<span className="text-xs text-zinc-400">
											{task.assignee.full_name ||
												task.assignee.email?.split("@")[0] ||
												"Unknown"}
										</span>
									) : (
										<span className="text-xs text-zinc-600 italic">
											Unassigned
										</span>
									)}
								</div>
							</div>
						))
					)}
					{detail.tasks.length > 0 && (
						<Link href={`/workflow?venue_id=${venueId}`} className="block">
							<Button
								variant="outline"
								className="w-full border-zinc-700 text-zinc-300"
							>
								View all in Workflow
							</Button>
						</Link>
					)}
				</TabsContent>

				{/* ===== STAFF TAB ===== */}
				<TabsContent value="staff" className="space-y-3">
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={() => setShiftDialogOpen(true)}
							className="bg-violet-600 hover:bg-violet-700"
						>
							<Plus className="h-4 w-4 mr-1" />
							Add Shift
						</Button>
					</div>

					{detail.staff_shifts.length === 0 ? (
						<div className="text-center py-8 text-zinc-500">
							<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No staff shifts scheduled at this venue</p>
						</div>
					) : (
						detail.staff_shifts.map((shift) => {
							const staffName =
								shift.staff?.profiles?.full_name ||
								shift.staff?.profiles?.email?.split("@")[0] ||
								"Unknown";
							return (
								<div
									key={shift.id}
									className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-white">{staffName}</p>
										<div className="flex items-center gap-2 mt-1">
											<Badge
												variant="outline"
												className="text-xs border-zinc-700"
											>
												{shift.role}
											</Badge>
											{shift.event && (
												<span className="text-xs text-zinc-500">
													{shift.event.name}
												</span>
											)}
										</div>
									</div>
									<div className="text-right shrink-0">
										<div className="flex items-center gap-1 text-xs text-zinc-400">
											<Clock className="h-3 w-3" />
											{formatTime(shift.start_time)} -{" "}
											{formatTime(shift.end_time)}
										</div>
										{shift.event && (
											<span className="text-xs text-zinc-500">
												{formatDateShort(shift.event.date)}
											</span>
										)}
									</div>
								</div>
							);
						})
					)}
				</TabsContent>

				{/* ===== EVENTS TAB ===== */}
				<TabsContent value="events" className="space-y-3">
					<div className="flex justify-end gap-2">
						<Button
							size="sm"
							variant="outline"
							className="border-zinc-700 text-zinc-300"
							onClick={() => {
								fetchAvailableEvents();
								setLinkEventDialogOpen(true);
							}}
						>
							<Plus className="h-4 w-4 mr-1" />
							Link Event
						</Button>
						<Link href={`/events/new?venue_id=${venueId}`}>
							<Button size="sm" className="bg-violet-600 hover:bg-violet-700">
								<Plus className="h-4 w-4 mr-1" />
								Create Event
							</Button>
						</Link>
					</div>

					{detail.events.length === 0 ? (
						<div className="text-center py-8 text-zinc-500">
							<Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No events at this venue</p>
						</div>
					) : (
						detail.events.map((event) => (
							<div
								key={event.id}
								className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
							>
								<div className="text-center min-w-[50px]">
									<div className="text-xl font-bold text-white">
										{new Date(event.date).getDate()}
									</div>
									<div className="text-xs text-zinc-500 uppercase">
										{new Date(event.date).toLocaleString("de", {
											month: "short",
										})}
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<Link href={`/events/${event.id}`}>
										<p className="text-sm font-medium text-white hover:text-violet-400 transition-colors">
											{event.name}
										</p>
									</Link>
									<div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
										{event.door_time && (
											<span>
												{event.door_time}
												{event.end_time ? ` - ${event.end_time}` : ""}
											</span>
										)}
									</div>
								</div>
								<Badge className={statusBadgeClass(event.status)}>
									{event.status}
								</Badge>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleUnlinkEvent(event.id);
									}}
									className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 opacity-0 group-hover:opacity-100 transition-all"
									title="Remove from venue"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						))
					)}
				</TabsContent>

				{/* ===== INVENTORY TAB ===== */}
				<TabsContent value="inventory" className="space-y-3">
					{detail.inventory.length === 0 ? (
						<div className="text-center py-8 text-zinc-500">
							<Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No inventory items at this venue</p>
						</div>
					) : (
						(() => {
							// Group by sub-location
							const grouped: Record<string, typeof detail.inventory> = {};
							for (const item of detail.inventory) {
								const locName =
									(item.sub_location as { name: string } | null)?.name ||
									"Unassigned";
								if (!grouped[locName]) grouped[locName] = [];
								grouped[locName].push(item);
							}
							return Object.entries(grouped).map(([locName, items]) => (
								<div key={locName}>
									<h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
										<MapPin className="h-3 w-3" />
										{locName}
										<Badge
											variant="outline"
											className="text-xs border-zinc-700 ml-1"
										>
											{items.length}
										</Badge>
									</h4>
									<div className="space-y-1">
										{items.map((item) => (
											<div
												key={item.id}
												className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded"
											>
												<div className="flex-1 min-w-0">
													<p className="text-sm text-zinc-300 truncate">
														{item.name}
													</p>
												</div>
												<Badge
													variant="outline"
													className={cn(
														"text-xs",
														statusBadgeClass(item.category || "venue_misc"),
													)}
												>
													{item.category}
												</Badge>
												{item.condition_enum && (
													<Badge
														variant="outline"
														className={cn(
															"text-xs",
															statusBadgeClass(item.condition_enum),
														)}
													>
														{item.condition_enum}
													</Badge>
												)}
												<button
													onClick={() => {
														setMoveItem({ id: item.id, name: item.name });
														setMoveTarget(item.sub_location?.id || "");
														setMoveDialogOpen(true);
													}}
													className="text-xs text-zinc-500 hover:text-violet-400 flex items-center gap-1 transition-colors"
												>
													<ArrowRight className="h-3 w-3" />
													Move
												</button>
											</div>
										))}
									</div>
								</div>
							));
						})()
					)}
					{detail.inventory.length > 0 && (
						<Link href={`/inventory?venue_id=${venueId}`} className="block">
							<Button
								variant="outline"
								className="w-full border-zinc-700 text-zinc-300"
							>
								View all in Inventory
							</Button>
						</Link>
					)}
				</TabsContent>

				{/* ===== SETTINGS TAB ===== */}
				<TabsContent value="settings" className="space-y-4">
					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Venue Name
							</label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Address
							</label>
							<Input
								value={formData.address}
								onChange={(e) =>
									setFormData({ ...formData, address: e.target.value })
								}
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Capacity *
							</label>
							<Input
								type="number"
								min={1}
								value={formData.capacity || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										capacity: parseInt(e.target.value) || 0,
									})
								}
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Contact Name
								</label>
								<Input
									value={formData.contact_name}
									onChange={(e) =>
										setFormData({ ...formData, contact_name: e.target.value })
									}
									placeholder="Venue manager"
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Contact Phone
								</label>
								<Input
									value={formData.contact_phone}
									onChange={(e) =>
										setFormData({ ...formData, contact_phone: e.target.value })
									}
									placeholder="+49 ..."
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Contact Email
							</label>
							<Input
								type="email"
								value={formData.contact_email}
								onChange={(e) =>
									setFormData({ ...formData, contact_email: e.target.value })
								}
								placeholder="contact@venue.com"
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">Notes</label>
							<Textarea
								value={formData.notes}
								onChange={(e) =>
									setFormData({ ...formData, notes: e.target.value })
								}
								placeholder="Load-in instructions, emergency contacts, venue rules..."
								className="bg-zinc-950 border-zinc-800 min-h-[100px]"
							/>
						</div>
						<Button
							onClick={handleSaveSettings}
							disabled={saving}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save Changes
						</Button>
					</div>
				</TabsContent>
			</Tabs>

			{/* ===== DIALOGS ===== */}

			{/* Task Creation Dialog */}
			<Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-700">
					<DialogHeader>
						<DialogTitle className="text-white">Create Task</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Title *
							</label>
							<Input
								value={taskForm.title}
								onChange={(e) =>
									setTaskForm({ ...taskForm, title: e.target.value })
								}
								placeholder="Task title"
								className="bg-zinc-950 border-zinc-800"
								autoFocus
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Description
							</label>
							<Textarea
								value={taskForm.description}
								onChange={(e) =>
									setTaskForm({ ...taskForm, description: e.target.value })
								}
								placeholder="Optional description"
								className="bg-zinc-950 border-zinc-800 min-h-[80px]"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Priority
								</label>
								<Select
									value={taskForm.priority}
									onValueChange={(value) =>
										setTaskForm({ ...taskForm, priority: value })
									}
								>
									<SelectTrigger className="bg-zinc-950 border-zinc-800">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="bg-zinc-900 border-zinc-700">
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Due Date
								</label>
								<Input
									type="date"
									value={taskForm.due_date}
									onChange={(e) =>
										setTaskForm({ ...taskForm, due_date: e.target.value })
									}
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Assignee
							</label>
							<Select
								value={taskForm.assignee_id}
								onValueChange={(value) =>
									setTaskForm({ ...taskForm, assignee_id: value })
								}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select assignee" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-700">
									{staffMembers.map((member) => (
										<SelectItem key={member.id} value={member.id}>
											{member.profiles?.full_name ||
												member.profiles?.email ||
												"Unknown"}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setTaskDialogOpen(false)}
							className="border-zinc-700 text-zinc-300"
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateTask}
							disabled={taskSaving}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{taskSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Task
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Shift Creation Dialog */}
			<Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-700">
					<DialogHeader>
						<DialogTitle className="text-white">Add Shift</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Event *
							</label>
							<Select
								value={shiftForm.event_id}
								onValueChange={(value) =>
									setShiftForm({ ...shiftForm, event_id: value })
								}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select event" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-700">
									{detail.events.map((event) => (
										<SelectItem key={event.id} value={event.id}>
											{event.name} ({formatDateShort(event.date)})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Staff Member *
							</label>
							<Select
								value={shiftForm.staff_id}
								onValueChange={(value) =>
									setShiftForm({ ...shiftForm, staff_id: value })
								}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select staff" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-700">
									{staffMembers.map((member) => (
										<SelectItem key={member.id} value={member.id}>
											{member.profiles?.full_name ||
												member.profiles?.email ||
												"Unknown"}{" "}
											({member.role})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">Role *</label>
							<Input
								value={shiftForm.role}
								onChange={(e) =>
									setShiftForm({ ...shiftForm, role: e.target.value })
								}
								placeholder="e.g. Security, Bar, Door"
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Start Time *
								</label>
								<Input
									type="datetime-local"
									value={shiftForm.start_time}
									onChange={(e) =>
										setShiftForm({ ...shiftForm, start_time: e.target.value })
									}
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									End Time *
								</label>
								<Input
									type="datetime-local"
									value={shiftForm.end_time}
									onChange={(e) =>
										setShiftForm({ ...shiftForm, end_time: e.target.value })
									}
									className="bg-zinc-950 border-zinc-800"
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShiftDialogOpen(false)}
							className="border-zinc-700 text-zinc-300"
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateShift}
							disabled={shiftSaving}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{shiftSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Shift
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Item Move Dialog */}
			<Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-700">
					<DialogHeader>
						<DialogTitle className="text-white">
							Move &quot;{moveItem?.name}&quot;
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								New Location
							</label>
							<Select value={moveTarget} onValueChange={setMoveTarget}>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select sub-location" />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-700">
									{detail.sub_locations.map((sl) => (
										<SelectItem key={sl.id} value={sl.id}>
											{sl.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setMoveDialogOpen(false)}
							className="border-zinc-700 text-zinc-300"
						>
							Cancel
						</Button>
						<Button
							onClick={handleMoveItem}
							disabled={moveSaving || !moveTarget}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{moveSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Move Item
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Link Event Dialog */}
			<Dialog open={linkEventDialogOpen} onOpenChange={setLinkEventDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-white">
							Link Existing Event
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
						{availableEvents.length === 0 ? (
							<p className="text-sm text-zinc-500 text-center py-4">
								No unassigned events available
							</p>
						) : (
							availableEvents.map((event) => (
								<div
									key={event.id}
									className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
								>
									<div>
										<p className="text-sm text-white">{event.name}</p>
										<p className="text-xs text-zinc-400">
											{formatDateShort(event.date)}
										</p>
									</div>
									<Button
										size="sm"
										variant="outline"
										className="border-zinc-700 text-zinc-300"
										onClick={() => handleLinkEvent(event.id)}
										disabled={linkingEventId === event.id}
									>
										{linkingEventId === event.id ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Link"
										)}
									</Button>
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ============================================
// Stat Card for Overview
// ============================================

interface StatCardProps {
	icon: React.ReactNode;
	label: string;
	value: number;
	accent?: "red" | "default";
}

function StatCard({ icon, label, value, accent = "default" }: StatCardProps) {
	return (
		<div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
			<div className="flex items-center gap-2 mb-1.5">
				<div
					className={cn(
						"p-1 rounded",
						accent === "red"
							? "bg-red-600/20 text-red-400"
							: "bg-zinc-700/50 text-zinc-400",
					)}
				>
					{icon}
				</div>
				<span className="text-xs text-zinc-500">{label}</span>
			</div>
			<p
				className={cn(
					"text-2xl font-bold",
					accent === "red" ? "text-red-400" : "text-white",
				)}
			>
				{value}
			</p>
		</div>
	);
}

// ============================================
// Inline Editable Field
// ============================================

interface InlineFieldProps {
	label: string;
	value: string | null;
	venueId: string;
	field: string;
	type?: "text" | "email" | "textarea";
	icon?: React.ReactNode;
	onSaved: () => void;
}

function InlineField({
	label,
	value,
	venueId,
	field,
	type = "text",
	icon,
	onSaved,
}: InlineFieldProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value || "");
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (draft === (value || "")) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			const response = await fetch(`/api/venues/${venueId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ [field]: draft || null }),
			});
			if (!response.ok) throw new Error("Failed to save");
			setEditing(false);
			onSaved();
		} catch {
			setDraft(value || "");
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && type !== "textarea") handleSave();
		if (e.key === "Escape") {
			setDraft(value || "");
			setEditing(false);
		}
	};

	if (editing) {
		if (type === "textarea") {
			return (
				<div className="space-y-1.5">
					<Textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={handleSave}
						className="bg-zinc-950 border-zinc-700 text-sm min-h-[80px]"
						autoFocus
					/>
					<div className="flex gap-1.5">
						<Button
							size="sm"
							className="h-6 text-xs bg-violet-600 hover:bg-violet-700"
							onClick={handleSave}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save"}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-6 text-xs text-zinc-400"
							onClick={() => {
								setDraft(value || "");
								setEditing(false);
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			);
		}
		return (
			<Input
				type={type}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={handleSave}
				onKeyDown={handleKeyDown}
				className="bg-zinc-950 border-zinc-700 text-sm h-8"
				autoFocus
			/>
		);
	}

	return (
		<button onClick={() => setEditing(true)} className="text-left w-full group">
			{icon ? (
				<div className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
					{icon}
					<span className={value ? "" : "italic text-zinc-600"}>
						{value || `Add ${label.toLowerCase()}...`}
					</span>
				</div>
			) : (
				<p
					className={`text-sm ${value ? "text-zinc-300" : "italic text-zinc-600"} group-hover:text-white transition-colors`}
				>
					{value || `Add ${label.toLowerCase()}...`}
				</p>
			)}
		</button>
	);
}

// ============================================
// Sub-Location Row with Inline Capacity
// ============================================

interface SubLocationRowProps {
	subLocation: {
		id: string;
		name: string;
		description: string | null;
		capacity: number | null;
	};
	onCapacityChange: (newCapacity: number) => void;
}

function SubLocationRow({
	subLocation,
	onCapacityChange,
}: SubLocationRowProps) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(String(subLocation.capacity ?? ""));

	const handleSave = () => {
		const num = parseInt(value);
		if (!isNaN(num) && num > 0) {
			onCapacityChange(num);
			setEditing(false);
		}
	};

	if (editing) {
		return (
			<div className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded">
				<div className="flex-1">
					<p className="text-sm text-zinc-300">{subLocation.name}</p>
					{subLocation.description && (
						<p className="text-xs text-zinc-500">{subLocation.description}</p>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					<Input
						type="number"
						min={1}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSave();
							if (e.key === "Escape") setEditing(false);
						}}
						className="w-20 h-7 bg-zinc-950 border-zinc-700 text-xs"
						autoFocus
					/>
					<Button
						size="sm"
						variant="ghost"
						className="h-7 text-xs text-green-400"
						onClick={handleSave}
					>
						Save
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded">
			<div className="flex-1">
				<p className="text-sm text-zinc-300">{subLocation.name}</p>
				{subLocation.description && (
					<p className="text-xs text-zinc-500">{subLocation.description}</p>
				)}
			</div>
			<button
				onClick={() => setEditing(true)}
				className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
			>
				{subLocation.capacity ?? "-"} cap.
			</button>
		</div>
	);
}
