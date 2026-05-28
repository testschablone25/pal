"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Shift, StaffMember } from "@/lib/staff-shifts/types";
import { STAFF_ROLES } from "@/lib/staff-shifts/types";
import {
	shiftSchema,
	type ShiftFormValues,
} from "@/lib/staff-shifts/form-schema";

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleSubmitWrapper = (fn: (values: ShiftFormValues) => Promise<void>) =>
	fn as any;

interface ShiftFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingShift: Shift | null;
	staff: StaffMember[];
	venueId: string | null;
	eventName?: string;
	saving: boolean;
	onSubmit: (values: ShiftFormValues) => Promise<void>;
	isStaffUnavailable: (staffId: string) => boolean;
}

export function ShiftFormDialog({
	open,
	onOpenChange,
	editingShift,
	staff,
	venueId,
	eventName,
	saving,
	onSubmit,
	isStaffUnavailable,
}: ShiftFormDialogProps) {
	const [subLocations, setSubLocations] = useState<SubLocation[]>([]);

	const form = useForm<ShiftFormValues>({
		resolver: zodResolver(shiftSchema),
		defaultValues: {
			staff_id: editingShift?.staff_id || "",
			role: editingShift?.role || "",
			sub_location_id: editingShift?.sub_location_id || "",
			start_time: editingShift?.start_time?.slice(11, 16) || "",
			end_time: editingShift?.end_time?.slice(11, 16) || "",
			break_minutes: editingShift?.break_minutes || 0,
			status: editingShift?.status || "scheduled",
		},
	});

	// Fetch sub-locations when dialog opens
	useEffect(() => {
		if (!open || !venueId || editingShift) return;

		let cancelled = false;
		fetch(`/api/venues/${venueId}/sublocations`)
			.then((res) => res.json())
			.then((data) => {
				if (!cancelled) setSubLocations(data.sub_locations || []);
			})
			.catch((err) => {
				if (!cancelled) console.error("Failed to fetch sub-locations:", err);
			});

		return () => {
			cancelled = true;
		};
	}, [open, venueId, editingShift]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-md">
				<DialogHeader>
					<DialogTitle className="text-white">
						{editingShift ? "Edit Shift" : "Add New Shift"}
					</DialogTitle>
					<DialogDescription className="text-zinc-400">
						{editingShift
							? `Update shift for ${editingShift.staff?.profiles?.full_name || "staff member"}`
							: `Schedule a staff member${eventName ? ` for ${eventName}` : ""}`}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmitWrapper(onSubmit))}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="staff_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Staff Member *</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800">
												<SelectValue placeholder="Select staff member" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
											{staff.map((member) => {
												const unavailable = isStaffUnavailable(member.id);
												return (
													<SelectItem key={member.id} value={member.id}>
														<div className="flex items-center gap-2">
															{member.full_name || member.profiles?.full_name || "Unknown"}
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
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800">
												<SelectValue placeholder="Select role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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

						{/* Sub-location selector */}
						<FormField
							control={form.control}
							name="sub_location_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Sub-Location (Area)</FormLabel>
									<Select
										onValueChange={(val) =>
											field.onChange(val === "none" ? "" : val)
										}
										value={field.value || "none"}
									>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800">
												<SelectValue placeholder="Select area" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
											<SelectItem value="none">No specific area</SelectItem>
											{subLocations.map((sl) => (
												<SelectItem key={sl.id} value={sl.id}>
													{sl.name}
													{sl.description && (
														<span className="text-zinc-500 ml-1">
															— {sl.description}
														</span>
													)}
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
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800">
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
								onClick={() => onOpenChange(false)}
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
	);
}
