"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemQRDialog } from "@/components/item-qr-dialog";
import { cn, statusBadgeClass } from "@/lib/utils";
import {
	Package,
	MapPin,
	QrCode,
	Check,
} from "lucide-react";
import type { TaskItemEntry } from "./types";

interface TaskDetailItemsProps {
	taskItems: TaskItemEntry[];
}

export function TaskDetailItems({ taskItems }: TaskDetailItemsProps) {
	const [qrItemId, setQrItemId] = useState<string | null>(null);
	const [qrDialogOpen, setQrDialogOpen] = useState(false);

	const formatLocation = (sl: { id: string; name: string; venue: { id: string; name: string } | null } | null): string => {
		if (!sl) return "—";
		return sl.venue ? `${sl.venue.name} > ${sl.name}` : sl.name;
	};

	if (!taskItems || taskItems.length === 0) return null;

	return (
		<div>
			<h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
				<Package className="h-4 w-4" />
				Linked Items ({taskItems.length})
			</h4>
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
										Current: <span className="text-zinc-400">{currentName}</span>
									</span>
									<span className="flex items-center gap-1">
										<MapPin className="h-3 w-3 text-violet-400" />
										Goal:{" "}
										<span className={goalLoc ? "text-violet-400" : "text-zinc-600"}>
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
