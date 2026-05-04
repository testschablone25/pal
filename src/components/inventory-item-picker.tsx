"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Package, Search, MapPin } from "lucide-react";

interface InventoryItem {
	id: string;
	name: string;
	category: string;
	brand: string | null;
	model: string | null;
	serial_number: string | null;
	current_location: string | null;
}

interface InventoryItemPickerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (item: InventoryItem) => void;
	/** Items already assigned (to grey them out) */
	excludeIds?: string[];
}

const categoryLabels: Record<string, string> = {
	dj_audio: "DJ & Audio",
	lighting: "Lighting",
	pa_sound: "PA & Sound",
	infrastructure: "Infrastructure",
	venue_misc: "Venue & Misc",
};

export function InventoryItemPicker({
	open,
	onOpenChange,
	onSelect,
	excludeIds = [],
}: InventoryItemPickerProps) {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(timer);
	}, [search]);

	const fetchItems = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (debouncedSearch) params.append("search", debouncedSearch);
			params.append("limit", "50");

			const response = await fetch(`/api/items?${params.toString()}`);
			if (!response.ok) throw new Error("Failed to fetch items");
			const data = await response.json();
			setItems(data.items || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load items");
		} finally {
			setLoading(false);
		}
	}, [debouncedSearch]);

	// Fetch when dialog opens or search changes
	useEffect(() => {
		if (open) {
			fetchItems();
		}
	}, [open, fetchItems]);

	const handleSelect = (item: InventoryItem) => {
		onSelect(item);
		onOpenChange(false);
		setSearch("");
	};

	const filteredItems = items.filter((item) => !excludeIds.includes(item.id));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[70vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="text-white flex items-center gap-2">
						<Package className="h-5 w-5 text-violet-400" />
						Assign from Inventory
					</DialogTitle>
				</DialogHeader>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
					<Input
						placeholder="Search inventory by name, brand, or serial..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10 bg-zinc-950 border-zinc-800"
						autoFocus
					/>
				</div>

				{/* Results */}
				<div className="flex-1 overflow-y-auto -mx-6 px-6">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
						</div>
					) : error ? (
						<p className="text-red-400 text-center py-8">{error}</p>
					) : filteredItems.length === 0 ? (
						<p className="text-zinc-500 text-center py-8">
							{debouncedSearch
								? "No matching inventory items found"
								: "No inventory items available"}
						</p>
					) : (
						<div className="space-y-1 py-2">
							{filteredItems.map((item) => (
								<button
									key={item.id}
									onClick={() => handleSelect(item)}
									className="w-full text-left p-3 rounded-lg hover:bg-zinc-800/70 transition-colors border border-transparent hover:border-zinc-700"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="text-white font-medium truncate">
												{item.name}
											</p>
											<div className="flex items-center gap-2 mt-0.5">
												<Badge
													variant="outline"
													className="border-zinc-700 text-zinc-400 text-[10px]"
												>
													{categoryLabels[item.category] || item.category}
												</Badge>
												{(item.brand || item.model) && (
													<span className="text-xs text-zinc-500">
														{[item.brand, item.model]
															.filter(Boolean)
															.join(" / ")}
													</span>
												)}
											</div>
											{item.current_location && (
												<p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{item.current_location}
												</p>
											)}
										</div>
										{item.serial_number && (
											<span className="text-[10px] text-zinc-600 flex-shrink-0 mt-1">
												{item.serial_number}
											</span>
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end pt-2 border-t border-zinc-800">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="border-zinc-700"
					>
						Cancel
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
