"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Clock, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
	capacity: number | null;
	created_at: string;
}

interface VenueStatsProps {
	venueId: string;
	name: string;
	venueType: string | null;
	capacity: number;
	address: string | null;
	openTaskCount: number;
	urgentTaskCount: number;
	staffCount: number;
	upcomingEventsCount: number;
	inventoryCount: number;
	subLocations: SubLocation[];
	onCapacityChange: () => void;
	onAddSubLocation: () => void;
	onDeleteSubLocation: (subLocationId: string) => void;
}

export function VenueStats({
	venueId,
	name,
	venueType,
	capacity,
	address,
	openTaskCount,
	urgentTaskCount,
	staffCount,
	upcomingEventsCount,
	inventoryCount,
	subLocations,
	onCapacityChange,
	onAddSubLocation,
	onDeleteSubLocation,
}: VenueStatsProps) {
	const [editingCapacity, setEditingCapacity] = useState(false);
	const [capacityValue, setCapacityValue] = useState(String(capacity));

	const hasUrgent = urgentTaskCount > 0;
	const hasOpenTasks = openTaskCount > 0;

	const startCapacityEdit = () => {
		setEditingCapacity(true);
		setCapacityValue(String(capacity));
	};

	const saveCapacityEdit = async () => {
		const num = parseInt(capacityValue);
		if (isNaN(num) || num <= 0) {
			setEditingCapacity(false);
			return;
		}

		try {
			const response = await fetch(`/api/venues/${venueId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					address,
					capacity: num,
					venue_type: venueType,
				}),
			});

			if (!response.ok) throw new Error("Failed to update capacity");
			setEditingCapacity(false);
			onCapacityChange();
		} catch {
			setEditingCapacity(false);
		}
	};

	return (
		<div className="space-y-3">
			{/* Address */}
			{address && (
				<div className="flex items-center text-sm text-zinc-400">
					<span className="truncate">{address}</span>
				</div>
			)}

			{/* Capacity (inline editable) */}
			<div className="flex items-center justify-between">
				<div className="flex items-center text-sm text-zinc-300">
					<Users className="h-4 w-4 mr-1 shrink-0" />
					{editingCapacity ? (
						<div className="flex items-center gap-1">
							<Input
								type="number"
								min={1}
								value={capacityValue}
								onChange={(e) => setCapacityValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") saveCapacityEdit();
									if (e.key === "Escape") setEditingCapacity(false);
								}}
								className="w-20 h-7 bg-zinc-950 border-zinc-700 text-sm"
								autoFocus
							/>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 text-xs text-green-400"
								onClick={saveCapacityEdit}
							>
								Save
							</Button>
						</div>
					) : (
						<button
							className="hover:text-white hover:bg-zinc-800 px-1 rounded transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								startCapacityEdit();
							}}
						>
							Capacity: {capacity}
						</button>
					)}
				</div>
				<Badge
					variant="outline"
					className="border-violet-600/50 text-violet-400"
				>
					{capacity > 500 ? "Large" : capacity > 200 ? "Medium" : "Small"}
				</Badge>
			</div>

			{/* Stats row */}
			<div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
				{hasOpenTasks && (
					<span
						className={cn(
							"flex items-center gap-1",
							hasUrgent ? "text-red-400" : "text-zinc-400",
						)}
					>
						<ClipboardList className="h-3 w-3" />
						{openTaskCount} task{openTaskCount !== 1 ? "s" : ""}
						{hasUrgent && (
							<span className="text-red-400 font-medium">
								({urgentTaskCount} urgent)
							</span>
						)}
					</span>
				)}
				{staffCount > 0 && (
					<span className="flex items-center gap-1 text-zinc-400">
						<Clock className="h-3 w-3" />
						{staffCount} staff
					</span>
				)}
				{upcomingEventsCount > 0 && (
					<span className="flex items-center gap-1 text-zinc-400">
						<Building2 className="h-3 w-3" />
						{upcomingEventsCount} event{upcomingEventsCount !== 1 ? "s" : ""}
					</span>
				)}
				{inventoryCount > 0 && (
					<span className="flex items-center gap-1 text-zinc-400">
						<Package className="h-3 w-3" />
						{inventoryCount} items
					</span>
				)}
			</div>

			{/* Sub-Locations */}
			<div className="border-t border-zinc-800 pt-3 mt-3">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-1 text-sm text-zinc-400">
						<span>Sub-Locations ({subLocations.length})</span>
					</div>
					<button
						className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
						onClick={(e) => {
							e.stopPropagation();
							onAddSubLocation();
						}}
					>
						+ Add
					</button>
				</div>
				{subLocations.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{subLocations.map((sl) => (
							<div
								key={sl.id}
								className="group flex items-center gap-1 px-2.5 py-1 bg-zinc-800/50 rounded-full text-sm text-zinc-300 border border-zinc-700/50"
								title={
									sl.description
										? `${sl.description}${sl.capacity ? ` (${sl.capacity} cap.)` : ""}`
										: sl.capacity
											? `${sl.capacity} capacity`
											: ""
								}
							>
								<span>{sl.name}</span>
								{sl.capacity && (
									<span className="text-xs text-zinc-500">{sl.capacity}</span>
								)}
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDeleteSubLocation(sl.id);
									}}
									className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
								>
									×
								</button>
							</div>
						))}
					</div>
				) : (
					<p className="text-xs text-zinc-600 italic">
						No sub-locations — add floors, areas, or zones
					</p>
				)}
			</div>
		</div>
	);
}
