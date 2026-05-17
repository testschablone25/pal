"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandEmpty,
	CommandGroup,
	CommandList,
} from "@/components/ui/command";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X, MapPin, Check, ChevronsUpDown } from "lucide-react";

interface SubLocation {
	id: string;
	name: string;
}

interface Venue {
	id: string;
	name: string;
	sub_locations?: SubLocation[];
}

interface InventoryItem {
	id: string;
	name: string;
	category: string;
}

interface ItemEntry {
	item_id: string;
	goal_sub_location_id: string | null;
}

interface TaskFormItemsProps {
	items: InventoryItem[];
	selectedEntries: ItemEntry[];
	onAddItem: (item: InventoryItem) => void;
	onRemoveItem: (itemId: string) => void;
	onGoalLocationChange: (itemId: string, venueId: string, subLocationId: string) => void;
	venues: Venue[];
}

export function TaskFormItems({
	items,
	selectedEntries,
	onAddItem,
	onRemoveItem,
	onGoalLocationChange,
	venues,
}: TaskFormItemsProps) {
	const [itemsOpen, setItemsOpen] = useState(false);

	const selectedItemIds = selectedEntries.map((e) => e.item_id);
	const availableItems = items.filter((i) => !selectedItemIds.includes(i.id));

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-medium text-zinc-400">Linked Items</Label>
				<Popover open={itemsOpen} onOpenChange={setItemsOpen}>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm" className="border-zinc-700 h-8 text-xs">
							<Check className="h-3 w-3 mr-1" />
							{selectedEntries.length > 0
								? `${selectedEntries.length} selected`
								: "Select items"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="bg-zinc-900 border-zinc-800 p-0 w-[280px]">
						<Command>
							<CommandInput placeholder="Search items..." className="border-b border-zinc-800" />
							<CommandEmpty className="text-zinc-500 text-xs p-4">
								No items found
							</CommandEmpty>
							<CommandList>
								<CommandGroup>
									{availableItems.map((item) => (
										<CommandItem
											key={item.id}
											value={item.name}
											onSelect={() => {
												onAddItem(item);
												setItemsOpen(false);
											}}
											className="text-sm"
										>
											<Check className="h-3 w-3 mr-2 opacity-0" />
											<div className="flex-1">{item.name}</div>
											<Badge className="bg-zinc-800 text-[10px]">{item.category}</Badge>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			{selectedEntries.length > 0 && (
				<div className="space-y-2">
					{selectedEntries.map((entry) => {
						const item = items.find((i) => i.id === entry.item_id);
						return (
							<div
								key={entry.item_id}
								className="flex flex-col gap-2 border border-zinc-800 rounded-lg p-3"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-sm text-zinc-200">{item?.name || "Unknown"}</span>
										{item && (
											<Badge className="bg-zinc-800 text-[10px]">{item.category}</Badge>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-red-400 hover:bg-red-950/50"
										onClick={() => onRemoveItem(entry.item_id)}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>

								{/* Goal sub-location selector */}
								<div className="space-y-1.5">
									<Label className="text-[10px] text-zinc-500 flex items-center gap-1">
										<MapPin className="h-3 w-3" />
										Goal location
									</Label>
									<div className="grid grid-cols-2 gap-2">
										<Select
											value={String(entry.goal_sub_location_id || "")}
											onValueChange={(slId) => {
												const venue = venues.find((v) =>
													v.sub_locations?.some((sl) => sl.id === slId),
												);
												if (venue) {
													onGoalLocationChange(entry.item_id, venue.id, slId);
												}
											}}
										>
											<SelectTrigger className="bg-zinc-950 border-zinc-800 h-8 text-xs">
												<SelectValue placeholder="Select location" />
											</SelectTrigger>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												{venues.map((venue) => (
													<div key={venue.id}>
														{venue.sub_locations?.map((sl) => (
															<SelectItem key={sl.id} value={sl.id}>
																{venue.name} &gt; {sl.name}
															</SelectItem>
														))}
													</div>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
