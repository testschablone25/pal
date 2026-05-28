"use client";

import { useState } from "react";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { Event, StaffMember } from "@/lib/staff-shifts/types";
import { STAFF_ROLES } from "@/lib/staff-shifts/types";

interface BulkCreateProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedEvent: Event | null;
	staff: StaffMember[];
	onBulkSubmit: (shifts: {
		eventId: string;
		staffIds: string[];
		role: string;
		startTime: string;
		endTime: string;
		breakMinutes: number;
	}) => Promise<void>;
}

export function ShiftBulkCreate({
	open,
	onOpenChange,
	selectedEvent,
	staff,
	onBulkSubmit,
}: BulkCreateProps) {
	const [selectedBulkStaff, setSelectedBulkStaff] = useState<string[]>([]);
	const [bulkRole, setBulkRole] = useState<string>("");
	const [bulkStartTime, setBulkStartTime] = useState<string>("");
	const [bulkEndTime, setBulkEndTime] = useState<string>("");
	const [bulkBreakMinutes, setBulkBreakMinutes] = useState<number>(0);
	const [bulkSubmitting, setBulkSubmitting] = useState(false);

	const toggleBulkStaff = (staffId: string) => {
		setSelectedBulkStaff((prev) =>
			prev.includes(staffId)
				? prev.filter((id) => id !== staffId)
				: [...prev, staffId],
		);
	};

	const handleSubmit = async () => {
		if (
			!selectedEvent ||
			selectedBulkStaff.length === 0 ||
			!bulkRole ||
			!bulkStartTime ||
			!bulkEndTime
		)
			return;

		setBulkSubmitting(true);
		try {
			await onBulkSubmit({
				eventId: selectedEvent.id,
				staffIds: selectedBulkStaff,
				role: bulkRole,
				startTime: bulkStartTime,
				endTime: bulkEndTime,
				breakMinutes: bulkBreakMinutes,
			});
			setSelectedBulkStaff([]);
			setBulkRole("");
			setBulkStartTime("");
			setBulkEndTime("");
			setBulkBreakMinutes(0);
		} finally {
			setBulkSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-w-md max-h-[80vh] overflow-y-auto">
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
							<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
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
													{member.full_name || member.profiles?.full_name || "Unknown"}
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
							onOpenChange(false);
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
						onClick={handleSubmit}
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
	);
}
