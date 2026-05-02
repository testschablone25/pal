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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { Textarea } from "@/components/ui/textarea";
import {
	ChevronLeft,
	ChevronRight,
	Calendar,
	Check,
	X,
	Loader2,
	Zap,
	Ban,
	Trash2,
	AlertTriangle,
	User,
	Shield,
	Users,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

interface StaffMember {
	id: string;
	role: string;
	profiles?: {
		id: string;
		full_name: string | null;
	} | null;
}

interface AvailabilityEntry {
	id: string;
	staff_id: string;
	date: string;
	available: boolean;
	reason: string | null;
	set_by: string | null;
	staff?: StaffMember | null;
	set_by_staff?: StaffMember | null;
}

interface ShiftEntry {
	id: string;
	staff_id: string;
	date?: string;
	start_time: string;
	end_time: string;
	status: string;
	role: string;
	events?: {
		id: string;
		name: string;
		date: string;
	} | null;
}

/* ───────────────────────────────────────────
   Props
   ─────────────────────────────────────────── */

interface AvailabilityCalendarProps {
	/** Staff ID for "self" view mode */
	staffMemberId?: string;
	/** Current view mode */
	viewMode?: "self" | "all";
	/** Callback when view mode changes */
	onViewModeChange?: (mode: "self" | "all") => void;
}

/* ───────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────── */

const formatDate = (year: number, month: number, day: number): string =>
	`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getMonthBounds = (date: Date) => {
	const year = date.getFullYear();
	const month = date.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	return {
		daysInMonth: lastDay.getDate(),
		startingDay: firstDay.getDay(),
		firstDate: firstDay.toISOString().split("T")[0],
		lastDate: lastDay.toISOString().split("T")[0],
	};
};

const getWeekDates = (date: Date): string[] => {
	const today = new Date(date);
	const dayOfWeek = today.getDay();
	const start = new Date(today);
	start.setDate(today.getDate() - dayOfWeek);
	const dates: string[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		dates.push(d.toISOString().split("T")[0]);
	}
	return dates;
};

const getMonthDatesInRange = (date: Date): string[] => {
	const { daysInMonth, firstDate } = getMonthBounds(date);
	const base = new Date(firstDate);
	const dates: string[] = [];
	for (let i = 0; i < daysInMonth; i++) {
		const d = new Date(base);
		d.setDate(base.getDate() + i);
		dates.push(d.toISOString().split("T")[0]);
	}
	return dates;
};

/* ───────────────────────────────────────────
   Component
   ─────────────────────────────────────────── */

export function AvailabilityCalendar({
	staffMemberId,
	viewMode = "all",
	onViewModeChange,
}: AvailabilityCalendarProps) {
	/* ── state ── */
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [selectedStaffId, setSelectedStaffId] = useState<string>(
		staffMemberId || "",
	);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Dialog (manager mode)
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [reason, setReason] = useState("");

	// Quick popover (self mode)
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [quickDate, setQuickDate] = useState<string | null>(null);
	const [quickReason, setQuickReason] = useState("");
	const [showQuickReason, setShowQuickReason] = useState(false);

	// Colleagues panel (self mode)
	const [colleaguesAvailability, setColleaguesAvailability] = useState<
		AvailabilityEntry[]
	>([]);
	const [colleaguesLoading, setColleaguesLoading] = useState(false);
	const [colleaguesDate, setColleaguesDate] = useState<string | null>(null);
	const [colleaguesStaff, setColleaguesStaff] = useState<StaffMember[]>([]);

	// Conflicts
	const [conflicts, setConflicts] = useState<Map<string, ShiftEntry[]>>(
		new Map(),
	);
	const [loadingConflicts, setLoadingConflicts] = useState(false);

	// Current tab
	const activeTab = viewMode;

	/* ── data fetching ── */

	const fetchStaff = useCallback(async () => {
		try {
			const response = await fetch("/api/staff");
			const data = await response.json();
			setStaff(data.staff || []);
			if (data.staff?.length > 0 && !selectedStaffId && viewMode === "all") {
				setSelectedStaffId(data.staff[0].id);
			}
		} catch (error) {
			console.error("Failed to fetch staff:", error);
		}
	}, [selectedStaffId, viewMode]);

	const fetchAvailability = useCallback(async () => {
		const staffId = viewMode === "self" ? staffMemberId : selectedStaffId;
		if (!staffId) return;

		try {
			const { firstDate, lastDate } = getMonthBounds(currentDate);

			const response = await fetch(
				`/api/availability?staff_id=${staffId}&date_from=${firstDate}&date_to=${lastDate}`,
			);
			const data = await response.json();
			setAvailability(data.availability || []);
		} catch (error) {
			console.error("Failed to fetch availability:", error);
		}
	}, [currentDate, staffMemberId, selectedStaffId, viewMode]);

	const fetchColleaguesAvailability = useCallback(async (date: string) => {
		if (!date) return;
		setColleaguesLoading(true);
		try {
			const response = await fetch(
				`/api/availability?date_from=${date}&date_to=${date}`,
			);
			const data = await response.json();
			setColleaguesAvailability(data.availability || []);
			setColleaguesDate(date);
		} catch (error) {
			console.error("Failed to fetch colleagues availability:", error);
		} finally {
			setColleaguesLoading(false);
		}
	}, []);

	const fetchAllStaff = useCallback(async () => {
		try {
			const response = await fetch("/api/staff");
			const data = await response.json();
			setColleaguesStaff(data.staff || []);
		} catch (error) {
			console.error("Failed to fetch staff for colleagues panel:", error);
		}
	}, []);

	const fetchConflicts = useCallback(async () => {
		const staffId = viewMode === "self" ? staffMemberId : selectedStaffId;
		if (!staffId) return;

		setLoadingConflicts(true);
		try {
			const { firstDate, lastDate } = getMonthBounds(currentDate);

			const response = await fetch(
				`/api/shifts?staff_id=${staffId}&date_from=${firstDate}&date_to=${lastDate}`,
			);
			const data = await response.json();
			const shifts: ShiftEntry[] = data.shifts || [];

			// Group shifts by date
			const conflictMap = new Map<string, ShiftEntry[]>();
			for (const shift of shifts) {
				const shiftDate = shift.start_time.split("T")[0];
				const existing = conflictMap.get(shiftDate) || [];
				existing.push(shift);
				conflictMap.set(shiftDate, existing);
			}
			setConflicts(conflictMap);
		} catch (error) {
			console.error("Failed to fetch conflicts:", error);
		} finally {
			setLoadingConflicts(false);
		}
	}, [currentDate, staffMemberId, selectedStaffId, viewMode]);

	/* ── effects ── */

	useEffect(() => {
		if (viewMode === "all") {
			fetchStaff();
		} else {
			setLoading(false);
		}
	}, [viewMode, fetchStaff]);

	useEffect(() => {
		if (selectedStaffId || viewMode === "self") {
			fetchAvailability();
			fetchConflicts();
		}
	}, [
		selectedStaffId,
		currentDate,
		viewMode,
		fetchAvailability,
		fetchConflicts,
	]);

	useEffect(() => {
		if (viewMode === "self") {
			fetchAllStaff();
		}
	}, [viewMode, fetchAllStaff]);

	// Update selectedStaffId when staffMemberId changes
	useEffect(() => {
		if (staffMemberId) {
			setSelectedStaffId(staffMemberId);
		}
	}, [staffMemberId]);

	/* ── derived ── */

	const targetStaffId = viewMode === "self" ? staffMemberId : selectedStaffId;
	const { daysInMonth, startingDay } = getMonthBounds(currentDate);
	const monthName = currentDate.toLocaleString("default", {
		month: "long",
		year: "numeric",
	});
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const selectedStaffMember = staff.find((s) => s.id === selectedStaffId);

	/* ── event handlers ── */

	const handleDateClick = (date: string) => {
		setSelectedDate(date);
		const existing = availability.find(
			(a) => a.staff_id === targetStaffId && a.date === date,
		);
		setReason(existing?.reason || "");

		if (viewMode === "self") {
			setQuickDate(date);
			setQuickReason(existing?.reason || "");
			setShowQuickReason(existing?.available === false);
			setPopoverOpen(true);
			// Also fetch colleagues for this date
			fetchColleaguesAvailability(date);
		} else {
			setDialogOpen(true);
		}
	};

	const handleSelfQuickSet = async (available: boolean) => {
		if (!targetStaffId || !quickDate) return;

		setSaving(true);
		try {
			const response = await fetch("/api/availability", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					staff_id: targetStaffId,
					date: quickDate,
					available,
					reason: available ? null : quickReason,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save availability");
			}

			setPopoverOpen(false);
			setQuickReason("");
			setShowQuickReason(false);
			fetchAvailability();
			if (colleaguesDate === quickDate) {
				fetchColleaguesAvailability(quickDate);
			}
		} catch (error) {
			console.error("Error saving availability:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleSelfQuickClear = async () => {
		if (!targetStaffId || !quickDate) return;

		const existing = availability.find(
			(a) => a.staff_id === targetStaffId && a.date === quickDate,
		);

		if (!existing) {
			setPopoverOpen(false);
			return;
		}

		setSaving(true);
		try {
			const response = await fetch(`/api/availability/${existing.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to clear availability");
			}

			setPopoverOpen(false);
			setQuickReason("");
			setShowQuickReason(false);
			fetchAvailability();
			if (colleaguesDate === quickDate) {
				fetchColleaguesAvailability(quickDate);
			}
		} catch (error) {
			console.error("Error clearing availability:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleSaveAvailability = async (available: boolean) => {
		if (!targetStaffId || !selectedDate) return;

		setSaving(true);
		try {
			const response = await fetch("/api/availability", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					staff_id: targetStaffId,
					date: selectedDate,
					available,
					reason: available ? null : reason,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save availability");
			}

			setDialogOpen(false);
			setReason("");
			fetchAvailability();
		} catch (error) {
			console.error("Error saving availability:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteAvailability = async () => {
		if (!targetStaffId || !selectedDate) return;

		const existing = availability.find(
			(a) => a.staff_id === targetStaffId && a.date === selectedDate,
		);

		if (!existing) {
			setDialogOpen(false);
			return;
		}

		setSaving(true);
		try {
			const response = await fetch(`/api/availability/${existing.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete availability");
			}

			setDialogOpen(false);
			setReason("");
			fetchAvailability();
		} catch (error) {
			console.error("Error deleting availability:", error);
		} finally {
			setSaving(false);
		}
	};

	/** Quick-action: set all weekdays in current week as available/unavailable */
	const handleQuickActionWeek = async (available: boolean) => {
		if (!targetStaffId) return;
		setSaving(true);
		try {
			const weekDates = getWeekDates(currentDate);
			await Promise.all(
				weekDates.map((date) =>
					fetch("/api/availability", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							staff_id: targetStaffId,
							date,
							available,
							reason: available ? null : "Quick-set",
						}),
					}),
				),
			);
			fetchAvailability();
		} catch (error) {
			console.error("Error with quick week action:", error);
		} finally {
			setSaving(false);
		}
	};

	/** Quick-action: clear all availability for current month */
	const handleQuickActionClearMonth = async () => {
		if (!targetStaffId) return;
		setSaving(true);
		try {
			const monthDates = getMonthDatesInRange(currentDate);
			const existingEntries = availability.filter((a) =>
				monthDates.includes(a.date),
			);

			await Promise.all(
				existingEntries.map((entry) =>
					fetch(`/api/availability/${entry.id}`, {
						method: "DELETE",
					}),
				),
			);
			fetchAvailability();
		} catch (error) {
			console.error("Error clearing month:", error);
		} finally {
			setSaving(false);
		}
	};

	/** Check if a date has a conflict */
	const getConflictsForDate = (date: string): ShiftEntry[] => {
		return conflicts.get(date) || [];
	};

	const getAvailabilityForDate = (date: string) => {
		return availability.find(
			(a) => a.staff_id === targetStaffId && a.date === date,
		);
	};

	/* ── navigation ── */

	const prevMonth = () => {
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
		);
	};

	const nextMonth = () => {
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
		);
	};

	/* ── tab handler ── */

	const handleTabChange = (value: string) => {
		if (onViewModeChange) {
			onViewModeChange(value as "self" | "all");
		}
	};

	/* ── render helpers ── */

	const renderCalendarDay = (day: number) => {
		const dateStr = formatDate(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			day,
		);
		const avail = getAvailabilityForDate(dateStr);
		const isToday = new Date().toISOString().split("T")[0] === dateStr;
		const dateConflicts = getConflictsForDate(dateStr);
		const hasConflict = avail?.available === false && dateConflicts.length > 0;

		return (
			<button
				key={day}
				onClick={() => handleDateClick(dateStr)}
				className={`h-20 p-2 rounded-lg border transition-all text-left hover:border-violet-600/50 relative ${
					isToday ? "border-violet-600" : "border-zinc-800"
				} ${
					avail?.available === true
						? "bg-emerald-600/20 border-emerald-600/50"
						: avail?.available === false
							? "bg-red-600/20 border-red-600/50"
							: "bg-zinc-950 hover:bg-zinc-800"
				}`}
			>
				<div className="flex justify-between items-start">
					<span
						className={`text-sm font-medium ${
							isToday ? "text-violet-400" : "text-zinc-300"
						}`}
					>
						{day}
					</span>
					<div className="flex gap-1">
						{/* Conflict warning badge */}
						{hasConflict && (
							<div
								className="p-0.5 rounded bg-amber-600/40"
								title="Shift conflict"
							>
								<AlertTriangle className="h-3 w-3 text-amber-400" />
							</div>
						)}
						{avail && !hasConflict && (
							<div
								className={`p-1 rounded ${
									avail.available ? "bg-emerald-600/30" : "bg-red-600/30"
								}`}
							>
								{avail.available ? (
									<Check className="h-3 w-3 text-emerald-400" />
								) : (
									<X className="h-3 w-3 text-red-400" />
								)}
							</div>
						)}
					</div>
				</div>
				{avail && !avail.available && avail.reason && (
					<p className="text-xs text-zinc-400 mt-1 truncate">{avail.reason}</p>
				)}
				{/* Shift conflict tooltip trigger area */}
				{hasConflict && (
					<div className="absolute bottom-1 left-2">
						<span className="text-[10px] text-amber-400 flex items-center gap-1">
							<AlertTriangle className="h-2.5 w-2.5" />
							Shift conflict
						</span>
					</div>
				)}
			</button>
		);
	};

	/* ================================================================ */
	/*                           RENDER                                 */
	/* ================================================================ */

	return (
		<div className="space-y-6">
			{/* ── Tab Bar ── */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardContent className="pt-6">
					<Tabs value={activeTab} onValueChange={handleTabChange}>
						<TabsList className="bg-zinc-950 border border-zinc-800">
							<TabsTrigger
								value="self"
								className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
							>
								<User className="h-4 w-4 mr-2" />
								My Availability
							</TabsTrigger>
							<TabsTrigger
								value="all"
								className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
							>
								<Users className="h-4 w-4 mr-2" />
								All Staff
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardContent>
			</Card>

			{/* ── Quick Action Bar (self mode) ── */}
			{viewMode === "self" && (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="pt-4 pb-4">
						<div className="flex flex-wrap gap-3 items-center">
							<span className="text-sm text-zinc-400 font-medium mr-2">
								<Zap className="h-4 w-4 inline mr-1" />
								Quick Actions:
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleQuickActionWeek(true)}
								disabled={saving}
								className="border-emerald-700 text-emerald-400 hover:bg-emerald-950/50"
							>
								<Check className="h-4 w-4 mr-1" />
								Available this week
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleQuickActionWeek(false)}
								disabled={saving}
								className="border-red-700 text-red-400 hover:bg-red-950/50"
							>
								<Ban className="h-4 w-4 mr-1" />
								Unavailable this week
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleQuickActionClearMonth}
								disabled={saving}
								className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Clear this month
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* ── Staff Selector (all mode) ── */}
			{viewMode === "all" && (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="pt-6">
						<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
							<div className="flex-1 w-full md:w-auto">
								<label className="text-sm text-zinc-400 mb-2 block">
									Select Staff Member
								</label>
								<Select
									value={selectedStaffId}
									onValueChange={setSelectedStaffId}
								>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 w-full md:w-[300px]">
										<SelectValue placeholder="Choose staff member" />
									</SelectTrigger>
									<SelectContent className="bg-zinc-900 border-zinc-800">
										{staff.map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.profiles?.full_name || "Unknown"} -{" "}
												{member.role}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{selectedStaffMember && (
								<Badge className="bg-violet-600/20 text-violet-400 border-violet-600/50">
									{selectedStaffMember.role}
								</Badge>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* ── Main Content: Calendar + Colleagues panel ── */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* Calendar */}
				<div className="flex-1">
					<Card className="bg-zinc-900 border-zinc-800">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-white flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Availability Calendar
								</CardTitle>
								<div className="flex items-center gap-2">
									<Button variant="ghost" size="icon" onClick={prevMonth}>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<span className="text-white font-medium min-w-[150px] text-center">
										{monthName}
									</span>
									<Button variant="ghost" size="icon" onClick={nextMonth}>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="grid grid-cols-7 gap-2">
									{[...Array(35)].map((_, i) => (
										<Skeleton key={i} className="h-20 bg-zinc-800" />
									))}
								</div>
							) : (
								<>
									{/* Day Headers */}
									<div className="grid grid-cols-7 gap-2 mb-2">
										{dayNames.map((day) => (
											<div
												key={day}
												className="text-center text-sm text-zinc-400 font-medium py-2"
											>
												{day}
											</div>
										))}
									</div>

									{/* Calendar Grid */}
									<div className="grid grid-cols-7 gap-2">
										{[...Array(startingDay)].map((_, i) => (
											<div key={`empty-${i}`} className="h-20" />
										))}
										{[...Array(daysInMonth)].map((_, i) =>
											renderCalendarDay(i + 1),
										)}
									</div>

									{/* Legend */}
									<div className="mt-6 pt-4 border-t border-zinc-800 flex flex-wrap gap-6">
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 rounded bg-emerald-600/20 border border-emerald-600/50" />
											<span className="text-sm text-zinc-400">Available</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 rounded bg-red-600/20 border border-red-600/50" />
											<span className="text-sm text-zinc-400">Unavailable</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 rounded bg-zinc-950 border border-zinc-800" />
											<span className="text-sm text-zinc-400">Not Set</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 rounded bg-amber-600/20 border border-amber-600/50 flex items-center justify-center">
												<AlertTriangle className="h-3 w-3 text-amber-400" />
											</div>
											<span className="text-sm text-zinc-400">
												Shift Conflict
											</span>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* ── Colleagues Panel (self mode) ── */}
				{viewMode === "self" && (
					<div className="w-full lg:w-72 shrink-0">
						<Card className="bg-zinc-900 border-zinc-800 h-full">
							<CardHeader>
								<CardTitle className="text-white text-sm flex items-center gap-2">
									<Users className="h-4 w-4" />
									Colleagues
								</CardTitle>
							</CardHeader>
							<CardContent>
								{!colleaguesDate ? (
									<p className="text-sm text-zinc-500">
										Click a date to see colleague availability
									</p>
								) : colleaguesLoading ? (
									<div className="space-y-3">
										{[...Array(4)].map((_, i) => (
											<Skeleton key={i} className="h-10 bg-zinc-800" />
										))}
									</div>
								) : (
									<div className="space-y-2">
										<p className="text-xs text-zinc-500 mb-3">
											{new Date(
												colleaguesDate + "T12:00:00",
											).toLocaleDateString("en-US", {
												weekday: "long",
												month: "short",
												day: "numeric",
											})}
										</p>
										{colleaguesStaff
											.filter((s) => s.id !== staffMemberId)
											.map((s) => {
												const entry = colleaguesAvailability.find(
													(a) => a.staff_id === s.id,
												);
												return (
													<div
														key={s.id}
														className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800"
													>
														<div className="flex items-center gap-2 min-w-0">
															<div
																className={`w-2 h-2 rounded-full shrink-0 ${
																	entry?.available === true
																		? "bg-emerald-500"
																		: entry?.available === false
																			? "bg-red-500"
																			: "bg-zinc-600"
																}`}
															/>
															<div className="min-w-0">
																<p className="text-sm text-zinc-200 truncate">
																	{s.profiles?.full_name || "Unknown"}
																</p>
																<p className="text-[10px] text-zinc-500">
																	{s.role}
																</p>
															</div>
														</div>
														<span className="text-xs text-zinc-500 shrink-0 ml-2">
															{entry?.available === true
																? "Available"
																: entry?.available === false
																	? "Unavailable"
																	: "Not set"}
														</span>
													</div>
												);
											})}
										{colleaguesStaff.filter((s) => s.id !== staffMemberId)
											.length === 0 && (
											<EmptyState
												icon={Users}
												title="Keine Kollegen gefunden"
												className="py-8"
											/>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			{/* ── Manager Override badges on availability entries ── */}
			{viewMode === "all" && availability.some((a) => a.set_by) && (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="pt-4 pb-4">
						<p className="text-xs text-zinc-500 flex items-center gap-2">
							<Shield className="h-3 w-3" />
							Some entries are set by a manager override
						</p>
					</CardContent>
				</Card>
			)}

			{/* ── Quick Popover (self mode) ── */}
			<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
				<PopoverTrigger asChild>
					{/* Hidden trigger - controlled via state */}
					<span />
				</PopoverTrigger>
				<PopoverContent
					className="bg-zinc-900 border-zinc-800 w-72"
					align="start"
					side="bottom"
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<div className="space-y-4">
						<div>
							<h4 className="text-white font-medium text-sm">
								Set Availability
							</h4>
							<p className="text-zinc-400 text-xs mt-1">
								{quickDate &&
									new Date(quickDate + "T12:00:00").toLocaleDateString(
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

						{/* Conflict warning */}
						{quickDate && getConflictsForDate(quickDate).length > 0 && (
							<div className="p-3 rounded-lg bg-amber-600/10 border border-amber-600/30">
								<p className="text-xs text-amber-400 flex items-center gap-2">
									<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
									You have a shift scheduled but marked unavailable
								</p>
							</div>
						)}

						{/* Quick action buttons */}
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={() => {
									setShowQuickReason(false);
									handleSelfQuickSet(true);
								}}
								disabled={saving}
								className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
							>
								<Check className="h-3.5 w-3.5 mr-1" />
								Available
							</Button>
							<Button
								size="sm"
								onClick={() => setShowQuickReason(true)}
								disabled={saving || showQuickReason}
								className="flex-1 bg-red-600 hover:bg-red-700 text-xs"
							>
								<X className="h-3.5 w-3.5 mr-1" />
								Unavailable
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleSelfQuickClear}
								disabled={saving}
								className="flex-1 border-zinc-700 text-zinc-400 text-xs"
							>
								<Trash2 className="h-3.5 w-3.5 mr-1" />
								Clear
							</Button>
						</div>

						{/* Reason textarea (unavailable) */}
						{showQuickReason && (
							<div className="space-y-2">
								<label className="text-xs text-zinc-400 block">
									Reason (required)
								</label>
								<Textarea
									value={quickReason}
									onChange={(e) => setQuickReason(e.target.value)}
									placeholder="e.g., Vacation, Personal day..."
									className="bg-zinc-950 border-zinc-800 text-xs h-20"
								/>
								<Button
									size="sm"
									onClick={() => handleSelfQuickSet(false)}
									disabled={saving || !quickReason.trim()}
									className="w-full bg-red-600 hover:bg-red-700"
								>
									{saving ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<X className="mr-2 h-4 w-4" />
									)}
									Confirm Unavailable
								</Button>
							</div>
						)}

						{/* Manager override info in self mode */}
						{quickDate &&
							(() => {
								const entry = availability.find(
									(a) => a.staff_id === targetStaffId && a.date === quickDate,
								);
								if (entry?.set_by_staff) {
									return (
										<div className="pt-2 border-t border-zinc-800">
											<p className="text-[10px] text-zinc-500 flex items-center gap-1">
												<Shield className="h-3 w-3" />
												Set by{" "}
												{entry.set_by_staff.profiles?.full_name || "Manager"}
											</p>
										</div>
									);
								}
								return null;
							})()}
					</div>
				</PopoverContent>
			</Popover>

			{/* ── Full Dialog (all/manager mode) ── */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800">
					<DialogHeader>
						<DialogTitle className="text-white">Set Availability</DialogTitle>
						<DialogDescription className="text-zinc-400">
							{selectedDate &&
								new Date(selectedDate + "T12:00:00").toLocaleDateString(
									"en-US",
									{
										weekday: "long",
										year: "numeric",
										month: "long",
										day: "numeric",
									},
								)}
						</DialogDescription>
					</DialogHeader>

					{/* Conflict warnings for manager view */}
					{selectedDate && getConflictsForDate(selectedDate).length > 0 && (
						<div className="p-3 rounded-lg bg-amber-600/10 border border-amber-600/30">
							<p className="text-xs text-amber-400 flex items-center gap-2">
								<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
								This staff member has a shift scheduled but marked unavailable
							</p>
							<div className="mt-2 space-y-1">
								{getConflictsForDate(selectedDate).map((shift) => (
									<p key={shift.id} className="text-[11px] text-zinc-400 ml-5">
										{shift.events?.name || "Event"} — {shift.role} (
										{new Date(shift.start_time).toLocaleTimeString("en-US", {
											hour: "2-digit",
											minute: "2-digit",
										})}{" "}
										-{" "}
										{new Date(shift.end_time).toLocaleTimeString("en-US", {
											hour: "2-digit",
											minute: "2-digit",
										})}
										)
									</p>
								))}
							</div>
						</div>
					)}

					{/* Manager override note */}
					{selectedDate &&
						(() => {
							const entry = availability.find(
								(a) => a.staff_id === targetStaffId && a.date === selectedDate,
							);
							if (entry?.set_by_staff) {
								return (
									<div className="p-2 rounded bg-violet-600/10 border border-violet-600/30">
										<p className="text-xs text-violet-400 flex items-center gap-1">
											<Shield className="h-3 w-3" />
											Previously set by{" "}
											{entry.set_by_staff.profiles?.full_name || "Manager"}
										</p>
									</div>
								);
							}
							return null;
						})()}

					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-2 block">
								Reason (if unavailable)
							</label>
							<Textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="e.g., Vacation, Personal day, Sick leave..."
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
					</div>

					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							onClick={handleDeleteAvailability}
							disabled={saving}
							className="border-zinc-800"
						>
							Clear
						</Button>
						<div className="flex gap-2">
							<Button
								onClick={() => handleSaveAvailability(false)}
								disabled={saving}
								className="bg-red-600 hover:bg-red-700"
							>
								{saving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<X className="mr-2 h-4 w-4" />
								)}
								Unavailable
							</Button>
							<Button
								onClick={() => handleSaveAvailability(true)}
								disabled={saving}
								className="bg-emerald-600 hover:bg-emerald-700"
							>
								{saving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Check className="mr-2 h-4 w-4" />
								)}
								Available
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
