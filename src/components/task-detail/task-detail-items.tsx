"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemQRDialog } from "@/components/item-qr-dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandEmpty,
	CommandGroup,
	CommandList,
} from "@/components/ui/command";
import { cn, statusBadgeClass } from "@/lib/utils";
import { Package, MapPin, QrCode, Check, Plus, Loader2 } from "lucide-react";
import type { TaskItemEntry } from "./types";

interface InventoryItem {
	id: string;
	name: string;
	category: string;
}

interface TaskDetailItemsProps {
	taskItems: TaskItemEntry[];
	onAddItems?: (itemIds: string[]) => Promise<void>;
}

export function TaskDetailItems({
	taskItems,
	onAddItems,
}: TaskDetailItemsProps) {
	const [qrItemId, setQrItemId] = useState<string | null>(null);
	const [qrDialogOpen, setQrDialogOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loadingItems, setLoadingItems] = useState(false);
	const [addingItems, setAddingItems] = useState(false);

	const selectedIds = new Set(taskItems.map((ti) => ti.item_id));

	const fetchItems = useCallback(async () => {
		setLoadingItems(true);
		try {
			const res = await fetch("/api/items?limit=200");
			const data = await res.json();
			setItems(data.items || []);
		} catch {
			setItems([]);
		} finally {
			setLoadingItems(false);
		}
	}, []);

	const handleOpenAdd = () => {
		if (items.length === 0) fetchItems();
		setAddOpen(true);
	};

	const handleSelectItem = async (itemId: string) => {
		if (!onAddItems || addingItems) return;
		setAddingItems(true);
		try {
			await onAddItems([itemId]);
			setAddOpen(false);
		} catch {
			// error handled upstream
		} finally {
			setAddingItems(false);
		}
	};

	const formatLocation = (
		sl: {
			id: string;
			name: string;
			venue: { id: string; name: string } | null;
		} | null,
	): string => {
		if (!sl) return "—";
		return sl.venue ? `${sl.venue.name} > ${sl.name}` : sl.name;
	};

	const itemCount = taskItems?.length || 0;

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
					<Package className="h-4 w-4" />
					Linked Items
					{itemCount > 0 && (
						<Badge
							variant="outline"
							className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-1"
						>
							{itemCount}
						</Badge>
					)}
				</h4>
				{onAddItems && (
					<Popover open={addOpen} onOpenChange={setAddOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								onClick={handleOpenAdd}
								className="border-violet-600/50 text-violet-400 hover:bg-violet-950/50 h-7 text-xs"
							>
								<Plus className="h-3 w-3 mr-1" />
								Add Item
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="bg-zinc-900 border-zinc-800 p-0 w-[280px]"
							align="end"
						>
							<Command>
								<CommandInput
									placeholder="Search items..."
									className="border-b border-zinc-800"
								/>
								{loadingItems && (
									<div className="flex items-center justify-center py-6">
										<Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
									</div>
								)}
								{!loadingItems && (
									<>
										<CommandEmpty className="text-zinc-500 text-xs p-4">
											No items found
										</CommandEmpty>
										<CommandList>
											<CommandGroup>
												{items
													.filter((i) => !selectedIds.has(i.id))
													.map((item) => (
														<CommandItem
															key={item.id}
															value={item.name}
															onSelect={() => handleSelectItem(item.id)}
															className="text-sm"
															disabled={addingItems}
														>
															<Check className="h-3 w-3 mr-2 opacity-0" />
															<div className="flex-1">{item.name}</div>
															<Badge className="bg-zinc-800 text-[10px]">
																{item.category}
															</Badge>
														</CommandItem>
													))}
											</CommandGroup>
										</CommandList>
									</>
								)}
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</div>

			{itemCount === 0 ? (
				<div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg">
					<Package className="h-6 w-6 text-zinc-600 mx-auto mb-1" />
					<p className="text-xs text-zinc-500">No items linked yet</p>
				</div>
			) : (
				<div className="space-y-2">
					{taskItems.map((entry) => {
						const item = entry.item;
						const goalLoc = entry.goal_sub_location;
						const delivered = !!entry.delivered_at;
						const goalName = formatLocation(goalLoc);
						const currentName = item?.current_location || "—";

						return (
							<div
								key={entry.item_id}
								className={cn(
									"flex items-start gap-3 border rounded-lg p-3",
									delivered
										? "bg-emerald-900/10 border-emerald-700/40"
										: "bg-zinc-800/50 border-zinc-700",
								)}
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium text-zinc-200 truncate">
											{item?.name || "Unknown"}
										</p>
										{delivered && (
											<Badge
												variant="outline"
												className={cn(statusBadgeClass("done"), "text-[10px]")}
											>
												<Check className="h-3 w-3 mr-0.5" />
												Delivered
											</Badge>
										)}
									</div>
									{item?.serial_number && (
										<p className="text-xs text-zinc-500">
											Serial: {item.serial_number}
										</p>
									)}
									<div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
										<span className="flex items-center gap-1">
											<MapPin className="h-3 w-3" />
											Current:{" "}
											<span className="text-zinc-400">{currentName}</span>
										</span>
										<span className="flex items-center gap-1">
											<MapPin className="h-3 w-3 text-violet-400" />
											Goal:{" "}
											<span
												className={
													goalLoc ? "text-violet-400" : "text-zinc-600"
												}
											>
												{goalName}
											</span>
										</span>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => {
											setQrItemId(entry.item_id);
											setQrDialogOpen(true);
										}}
										title="View QR code"
									>
										<QrCode className="h-3.5 w-3.5 text-zinc-500" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{qrItemId && (
				<ItemQRDialog
					itemId={qrItemId}
					itemName={
						taskItems.find((ti) => ti.item_id === qrItemId)?.item?.name || ""
					}
					open={qrDialogOpen}
					onOpenChange={setQrDialogOpen}
				/>
			)}
		</div>
	);
}
