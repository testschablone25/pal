"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogOut, Search, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeBooking, StaffForKiosk } from "@/lib/time-bookings/types";

interface StaffWithStatus extends StaffForKiosk {
	isClockedIn: boolean;
	activeBookingId: string | null;
	clockedInAt: string | null;
}

export function KioskView({ staff: initialStaff }: { staff: StaffForKiosk[] }) {
	const { toast } = useToast();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [staffList, setStaffList] = useState<StaffWithStatus[]>([]);
	const [actions, setActions] = useState<Record<string, string>>({});

	const fetchStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/time-bookings?all=true");
			if (!res.ok) return;
			const data = await res.json();
			const bookings: TimeBooking[] = data.time_bookings || [];

			// Build a map of who's clocked in
			const clockedInMap = new Map<
				string,
				{ id: string; clocked_in_at: string }
			>();
			for (const b of bookings) {
				if (!b.clocked_out_at && b.staff_id) {
					clockedInMap.set(b.staff_id, {
						id: b.id,
						clocked_in_at: b.clocked_in_at,
					});
				}
			}

			setStaffList(
				initialStaff.map((s) => {
					const active = clockedInMap.get(s.id);
					return {
						...s,
						isClockedIn: !!active,
						activeBookingId: active?.id ?? null,
						clockedInAt: active?.clocked_in_at ?? null,
					};
				}),
			);
		} catch {
			// silent fail
		}
	}, [initialStaff]);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 30000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const handleClockAction = async (staffId: string) => {
		const staff = staffList.find((s) => s.id === staffId);
		if (!staff) return;

		const action = staff.isClockedIn ? "clock-out" : "clock-in";
		setActions((prev) => ({ ...prev, [staffId]: action }));

		try {
			const res = await fetch(`/api/time-bookings/${action}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ staff_id: staffId }),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed");
			}

			toast({
				title: staff.isClockedIn ? "Ausgestempelt" : "Eingestempelt",
				description: `${staff.profiles?.full_name || "Staff"} wurde erfolgreich ${staff.isClockedIn ? "ausgestempelt" : "eingestempelt"}.`,
			});

			await fetchStatus();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Einstempeln fehlgeschlagen.",
			});
		} finally {
			setActions((prev) => {
				const next = { ...prev };
				delete next[staffId];
				return next;
			});
		}
	};

	const filtered = staffList.filter((s) => {
		const q = search.toLowerCase();
		const name = (s.profiles?.full_name ?? "").toLowerCase();
		const role = s.role.toLowerCase();
		return name.includes(q) || role.includes(q);
	});

	// Sort: clocked-in staff first, then alphabetically
	filtered.sort((a, b) => {
		if (a.isClockedIn !== b.isClockedIn) return a.isClockedIn ? -1 : 1;
		return (a.profiles?.full_name ?? "").localeCompare(
			b.profiles?.full_name ?? "",
		);
	});

	return (
		<div className="min-h-screen bg-zinc-950">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold text-white">Zeiterfassung</h1>
						<Button
							variant="ghost"
							size="sm"
							className="text-zinc-500 hover:text-white"
							onClick={() => router.push("/time-bookings/dashboard")}
						>
							<LayoutDashboard className="h-4 w-4 mr-1" />
							Dashboard
						</Button>
					</div>
					<div className="relative w-full sm:w-80">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
						<Input
							placeholder="Mitarbeiter suchen..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10 h-12 text-lg bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
						/>
					</div>
				</div>
				<div className="mt-2 text-sm text-zinc-500">
					{staffList.filter((s) => s.isClockedIn).length} von {staffList.length}{" "}
					Mitarbeiter eingestempelt
				</div>
			</div>

			{/* Staff Grid */}
			<div className="p-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{filtered.map((staff) => {
						const isActioning = actions[staff.id];
						const isClockingIn = isActioning === "clock-in";
						const isClockingOut = isActioning === "clock-out";

						return (
							<Card
								key={staff.id}
								className={cn(
									"border-2 transition-all",
									staff.isClockedIn
										? "border-emerald-600/50 bg-emerald-950/20"
										: "border-zinc-800 bg-zinc-900/50",
								)}
							>
								<div className="p-5 flex flex-col items-center text-center gap-4">
									{/* Avatar / Initials */}
									<div
										className={cn(
											"w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold",
											staff.isClockedIn
												? "bg-emerald-600 text-white"
												: "bg-zinc-700 text-zinc-300",
										)}
									>
										{(staff.profiles?.full_name ?? "S")
											.split(" ")
											.map((n) => n[0])
											.slice(0, 2)
											.join("")
											.toUpperCase()}
									</div>

									{/* Name & Role */}
									<div>
										<p className="text-lg font-semibold text-white">
											{staff.profiles?.full_name || "Unbekannt"}
										</p>
										<p className="text-sm text-zinc-400">{staff.role}</p>
									</div>

									{/* Clock In/Out Button */}
									<Button
										size="lg"
										disabled={!!isActioning}
										className={cn(
											"w-full h-14 text-lg font-semibold min-h-[56px]",
											staff.isClockedIn
												? "bg-red-600 hover:bg-red-700 text-white"
												: "bg-emerald-600 hover:bg-emerald-700 text-white",
										)}
										onClick={() => handleClockAction(staff.id)}
									>
										{isClockingIn ? (
											<Clock className="h-5 w-5 mr-2 animate-spin" />
										) : isClockingOut ? (
											<LogOut className="h-5 w-5 mr-2 animate-spin" />
										) : staff.isClockedIn ? (
											<LogOut className="h-5 w-5 mr-2" />
										) : (
											<Clock className="h-5 w-5 mr-2" />
										)}
										{staff.isClockedIn ? "Ausstempeln" : "Einstempeln"}
									</Button>

									{/* Status indicator */}
									{staff.isClockedIn && staff.clockedInAt && (
										<p className="text-xs text-emerald-400">
											Eingestempelt seit{" "}
											{new Date(staff.clockedInAt).toLocaleTimeString("de-DE", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									)}
								</div>
							</Card>
						);
					})}
				</div>

				{filtered.length === 0 && (
					<div className="text-center py-16 text-zinc-500">
						<p className="text-lg">Keine Mitarbeiter gefunden</p>
					</div>
				)}
			</div>
		</div>
	);
}
