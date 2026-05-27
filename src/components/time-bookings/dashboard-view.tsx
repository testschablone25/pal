"use client";

// Time Bookings — Manager Dashboard
// /time-bookings/dashboard — view, edit, export time bookings

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clock, Download, Edit, Search } from "lucide-react";
import type { TimeBooking } from "@/lib/time-bookings/types";

function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = Math.round(minutes % 60);
	return `${h}h ${m}m`;
}

function getDurationMinutes(
	clockedInAt: string,
	clockedOutAt: string | null,
): number {
	const start = new Date(clockedInAt).getTime();
	const end = clockedOutAt ? new Date(clockedOutAt).getTime() : Date.now();
	return (end - start) / (1000 * 60);
}

interface DashboardBooking extends TimeBooking {
	durationMinutes: number;
}

interface StaffSummary {
	staffId: string;
	name: string;
	role: string;
	totalMinutes: number;
	bookingCount: number;
}

export function DashboardView() {
	const { toast } = useToast();
	const [bookings, setBookings] = useState<DashboardBooking[]>([]);
	const [search, setSearch] = useState("");
	const [dateFrom, setDateFrom] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d.toISOString().split("T")[0];
	});
	const [dateTo, setDateTo] = useState(
		() => new Date().toISOString().split("T")[0],
	);
	const [loading, setLoading] = useState(true);

	// Edit dialog
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingBooking, setEditingBooking] = useState<TimeBooking | null>(
		null,
	);
	const [editClockedIn, setEditClockedIn] = useState("");
	const [editClockedOut, setEditClockedOut] = useState("");
	const [editNotes, setEditNotes] = useState("");
	const [saving, setSaving] = useState(false);

	const fetchBookings = useCallback(async () => {
		setLoading(true);
		try {
			// dateFrom → start of day (00:00)
			// dateTo → end of day (23:59:59) so bookings all day are included
			const from = dateFrom
				? new Date(dateFrom + "T00:00:00").toISOString()
				: undefined;
			const to = dateTo
				? new Date(dateTo + "T23:59:59").toISOString()
				: undefined;

			const params = new URLSearchParams();
			if (from) params.set("date_from", from);
			if (to) params.set("date_to", to);

			const res = await fetch(`/api/time-bookings?${params}`);
			if (!res.ok) throw new Error("Failed to fetch");
			const data = await res.json();

			const enriched: DashboardBooking[] = (data.time_bookings || []).map(
				(b: TimeBooking) => ({
					...b,
					durationMinutes: getDurationMinutes(
						b.clocked_in_at,
						b.clocked_out_at,
					),
				}),
			);
			setBookings(enriched);
		} catch (error) {
			console.error("Error fetching bookings:", error);
		} finally {
			setLoading(false);
		}
	}, [dateFrom, dateTo]);

	useEffect(() => {
		fetchBookings();
	}, [fetchBookings]);

	const openEdit = (booking: TimeBooking) => {
		setEditingBooking(booking);
		setEditClockedIn(booking.clocked_in_at.slice(0, 16));
		setEditClockedOut(
			booking.clocked_out_at ? booking.clocked_out_at.slice(0, 16) : "",
		);
		setEditNotes(booking.notes || "");
		setEditDialogOpen(true);
	};

	const handleSaveEdit = async () => {
		if (!editingBooking) return;
		setSaving(true);
		try {
			const body: Record<string, string | null> = {};
			if (editClockedIn)
				body.clocked_in_at = new Date(editClockedIn).toISOString();
			body.clocked_out_at = editClockedOut
				? new Date(editClockedOut).toISOString()
				: null;
			if (editNotes !== editingBooking.notes) body.notes = editNotes;

			const res = await fetch(`/api/time-bookings/${editingBooking.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to update");
			}

			toast({
				title: "Zeiterfassung aktualisiert",
				description: "Die Zeiterfassung wurde erfolgreich korrigiert.",
			});
			setEditDialogOpen(false);
			setEditingBooking(null);
			fetchBookings();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error ? error.message : "Korrektur fehlgeschlagen.",
			});
		} finally {
			setSaving(false);
		}
	};

	// Filtered table (must be before clockedIn, summaries, handleExportCSV)
	const filtered = bookings.filter((b) => {
		const q = search.toLowerCase();
		const name = (b.staff?.profiles?.full_name ?? "").toLowerCase();
		return name.includes(q);
	});

	const handleExportCSV = () => {
		const headers = [
			"Staff Name",
			"Role",
			"Clock In",
			"Clock Out",
			"Duration (h)",
			"Notes",
		];
		const rows = filtered.map((b) => {
			const name = b.staff?.profiles?.full_name || "Unknown";
			const role = b.staff?.role || "";
			const clockIn = new Date(b.clocked_in_at).toLocaleString("de-DE");
			const clockOut = b.clocked_out_at
				? new Date(b.clocked_out_at).toLocaleString("de-DE")
				: "—";
			const duration = (b.durationMinutes / 60).toFixed(1);
			const notes = b.notes || "";
			return [name, role, clockIn, clockOut, duration, notes];
		});
		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.map((c) => `"${c}"`).join(",")),
		].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `time-bookings-${dateFrom}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		toast({
			title: "CSV exportiert",
			description: `${filtered.length} Einträge exportiert.`,
		});
	};

	// Currently clocked in
	const clockedIn = bookings.filter((b) => !b.clocked_out_at);

	// Staff summary
	const summaryMap = new Map<string, StaffSummary>();
	for (const b of filtered) {
		const id = b.staff_id;
		const name = b.staff?.profiles?.full_name || "Unknown";
		const role = b.staff?.role || "";
		const existing = summaryMap.get(id);
		if (existing) {
			existing.totalMinutes += b.durationMinutes;
			existing.bookingCount += 1;
		} else {
			summaryMap.set(id, {
				staffId: id,
				name,
				role,
				totalMinutes: b.durationMinutes,
				bookingCount: 1,
			});
		}
	}
	const summaries = Array.from(summaryMap.values()).sort(
		(a, b) => b.totalMinutes - a.totalMinutes,
	);

	return (
		<div className="space-y-6">
			{/* Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">Von</label>
							<Input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="bg-zinc-950 border-zinc-800 w-44"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">Bis</label>
							<Input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="bg-zinc-950 border-zinc-800 w-44"
							/>
						</div>
						<div className="flex-1">
							<label className="text-sm text-zinc-400 mb-1 block">Suche</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
								<Input
									placeholder="Mitarbeiter suchen..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 bg-zinc-950 border-zinc-800"
								/>
							</div>
						</div>
						<Button
							onClick={handleExportCSV}
							variant="outline"
							className="border-zinc-800"
						>
							<Download className="h-4 w-4 mr-2" />
							CSV Export
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Currently Clocked In */}
			{clockedIn.length > 0 && (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-emerald-800/50">
					<CardHeader>
						<CardTitle className="text-emerald-400 flex items-center gap-2">
							<Clock className="h-5 w-5" />
							Aktuell eingestempelt ({clockedIn.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{clockedIn.map((b) => (
								<div
									key={b.id}
									className="p-3 bg-zinc-950 border border-zinc-800 rounded"
								>
									<p className="font-medium text-white">
										{b.staff?.profiles?.full_name || "Unknown"}
									</p>
									<p className="text-sm text-zinc-400">{b.staff?.role}</p>
									<p className="text-sm text-emerald-400 mt-1">
										Seit{" "}
										{new Date(b.clocked_in_at).toLocaleTimeString("de-DE", {
											hour: "2-digit",
											minute: "2-digit",
										})}{" "}
										• {formatDuration(b.durationMinutes)}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
				<CardHeader>
					<CardTitle className="text-white">
						Zusammenfassung — {filtered.length} Einträge
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						{summaries.map((s) => (
							<div
								key={s.staffId}
								className="p-3 bg-zinc-950 border border-zinc-800 rounded"
							>
								<p className="font-medium text-white text-sm">{s.name}</p>
								<p className="text-xs text-zinc-400">{s.role}</p>
								<p className="text-lg font-bold text-violet-400 mt-1">
									{formatDuration(s.totalMinutes)}
								</p>
								<p className="text-xs text-zinc-500">
									{s.bookingCount}{" "}
									{s.bookingCount === 1 ? "Eintrag" : "Einträge"}
								</p>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Bookings Table */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
				<CardHeader>
					<CardTitle className="text-white">Alle Zeiterfassungen</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<p className="text-zinc-500 text-center py-8">Laden...</p>
					) : filtered.length === 0 ? (
						<p className="text-zinc-500 text-center py-8">
							Keine Einträge gefunden
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="border-zinc-800">
										<TableHead className="text-zinc-400">Name</TableHead>
										<TableHead className="text-zinc-400">Rolle</TableHead>
										<TableHead className="text-zinc-400">Einstempeln</TableHead>
										<TableHead className="text-zinc-400">Ausstempeln</TableHead>
										<TableHead className="text-zinc-400">Dauer</TableHead>
										<TableHead className="text-zinc-400">Notizen</TableHead>
										<TableHead className="text-zinc-400 w-20">Aktion</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.map((b) => (
										<TableRow key={b.id} className="border-zinc-800">
											<TableCell className="text-white font-medium">
												{b.staff?.profiles?.full_name || "Unknown"}
											</TableCell>
											<TableCell className="text-zinc-400">
												{b.staff?.role}
											</TableCell>
											<TableCell className="text-zinc-300">
												{new Date(b.clocked_in_at).toLocaleString("de-DE", {
													day: "2-digit",
													month: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</TableCell>
											<TableCell className="text-zinc-300">
												{b.clocked_out_at ? (
													new Date(b.clocked_out_at).toLocaleString("de-DE", {
														day: "2-digit",
														month: "2-digit",
														hour: "2-digit",
														minute: "2-digit",
													})
												) : (
													<Badge className="bg-emerald-600">Aktiv</Badge>
												)}
											</TableCell>
											<TableCell className="text-violet-400 font-medium">
												{formatDuration(b.durationMinutes)}
											</TableCell>
											<TableCell className="text-zinc-400 max-w-40 truncate">
												{b.notes || "—"}
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
													onClick={() => openEdit(b)}
												>
													<Edit className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white">
							Zeiterfassung korrigieren
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							{editingBooking?.staff?.profiles?.full_name} —{" "}
							{editingBooking?.staff?.role}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Einstempeln
							</label>
							<Input
								type="datetime-local"
								value={editClockedIn}
								onChange={(e) => setEditClockedIn(e.target.value)}
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Ausstempeln
							</label>
							<Input
								type="datetime-local"
								value={editClockedOut}
								onChange={(e) => setEditClockedOut(e.target.value)}
								className="bg-zinc-950 border-zinc-800"
								placeholder="Leer lassen für aktiv"
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Notizen
							</label>
							<textarea
								value={editNotes}
								onChange={(e) => setEditNotes(e.target.value)}
								className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-zinc-300 resize-none"
								rows={3}
								placeholder="Optionale Notizen..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditDialogOpen(false)}
							className="border-zinc-800"
						>
							Abbrechen
						</Button>
						<Button
							onClick={handleSaveEdit}
							disabled={saving}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{saving ? "Speichern..." : "Speichern"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
