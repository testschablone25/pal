"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/page-skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Plus, Package, QrCode, Loader2 } from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { cn, statusBadgeClass } from "@/lib/utils";
import { ItemQRDialog } from "@/components/item-qr-dialog";
import {
	InventoryForm,
	type ItemFormValues,
} from "@/components/inventory-form";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface SubLocation {
	id: string;
	name: string;
	venue: { name: string } | null;
}

interface Item {
	id: string;
	name: string;
	category: string;
	serial_number: string | null;
	brand: string | null;
	model: string | null;
	condition_enum: string | null;
	condition_notes: string | null;
	current_location: string | null;
	sub_location: SubLocation | null;
	notes: string | null;
	photo_url: string | null;
	created_at: string;
}

interface ItemsResponse {
	items: Item[];
	total: number;
}

const CATEGORIES = [
	{ value: "", label: "All" },
	{ value: "dj_audio", label: "DJ & Audio" },
	{ value: "lighting", label: "Lighting" },
	{ value: "pa_sound", label: "PA & Sound" },
	{ value: "infrastructure", label: "Infrastructure" },
	{ value: "venue_misc", label: "Venue & Misc" },
];

const categoryLabels: Record<string, string> = {
	dj_audio: "DJ & Audio",
	lighting: "Lighting",
	pa_sound: "PA & Sound",
	infrastructure: "Infrastructure",
	venue_misc: "Venue & Misc",
};

export function InventoryList() {
	const router = useRouter();
	const { toast } = useToast();
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [category, setCategory] = useState("");
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const pageSize = 25;
	const offsetRef = useRef(0);
	const loadingMoreRef = useRef(false);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [qrDialogItem, setQrDialogItem] = useState<{
		id: string;
		name: string;
	} | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	const fetchItems = useCallback(async (append = false) => {
		if (append) {
			setLoadingMore(true);
			loadingMoreRef.current = true;
		} else {
			setLoading(true);
		}
		try {
			const params = new URLSearchParams();
			if (debouncedSearch) params.append("search", debouncedSearch);
			if (category) params.append("category", category);
			params.append("limit", String(pageSize));
			params.append("offset", String(append ? offsetRef.current : 0));

			const response = await fetch(`/api/items?${params.toString()}`);
			const data: ItemsResponse = await response.json();
			const fetchedItems = data.items || [];

			if (append) {
				setItems((prev) => [...prev, ...fetchedItems]);
				offsetRef.current += pageSize;
			} else {
				setItems(fetchedItems);
				offsetRef.current = 0;
			}
			setHasMore(fetchedItems.length === pageSize);
		} catch (error) {
			console.error("Failed to fetch items:", error);
		} finally {
			setLoading(false);
			setLoadingMore(false);
			loadingMoreRef.current = false;
		}
	}, [debouncedSearch, category]);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	// IntersectionObserver for infinite scroll
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !hasMore || loadingMoreRef.current) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && hasMore && !loadingMoreRef.current) {
					fetchItems(true);
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasMore, fetchItems]);

	const handleCreate = async (values: ItemFormValues) => {
		const response = await fetch("/api/items", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(values),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error || "Failed to create item");
		}

		setShowCreateDialog(false);
		fetchItems();
		toast({
			title: "Inventargegenstand erstellt",
			description: `${values.name} wurde erfolgreich erstellt.`,
		});
	};

	return (
		<div className="space-y-6">
			{/* Search and Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1">
							<SearchFilterBar
								placeholder="Search items by name, serial number, or brand..."
								searchValue={search}
								onSearchChange={setSearch}
								filters={[
									{
										key: "category",
										label: "Category",
										options: CATEGORIES.map((cat) => ({
											value: cat.value,
											label: cat.label,
										})),
										value: category,
										onChange: setCategory,
									},
								]}
							/>
						</div>
						<Button
							onClick={() => setShowCreateDialog(true)}
							className="bg-violet-600 hover:bg-violet-700"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Item
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Results count */}
			<div className="flex justify-between items-center">
				<p className="text-sm text-zinc-400">
					{loading ? "Loading..." : `${items.length} items found`}
				</p>
			</div>

			{/* Items table */}
			{loading ? (
				<PageSkeleton rows={5} card={false} title={false} />
			) : items.length === 0 ? (
				<EmptyState
					icon={Package}
					title="Keine Artikel gefunden"
					description="Erstelle deinen ersten Inventarartikel"
					actionLabel="Artikel hinzufügen"
					onClick={() => setShowCreateDialog(true)}
				/>
			) : (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="border-zinc-800 hover:bg-transparent">
									<TableHead className="text-zinc-400">Name</TableHead>
									<TableHead className="text-zinc-400">Category</TableHead>
									<TableHead className="text-zinc-400">Serial Number</TableHead>
									<TableHead className="text-zinc-400">Condition</TableHead>
									<TableHead className="text-zinc-400">
										Current Location
									</TableHead>
									<TableHead className="text-zinc-400 w-[60px]">QR</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item) => (
									<TableRow
										key={item.id}
										className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
										onClick={() => router.push(`/inventory/${item.id}`)}
									>
										<TableCell className="font-medium text-white">
											{item.name}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className="border-zinc-700 text-zinc-300"
											>
												{categoryLabels[item.category] || item.category}
											</Badge>
										</TableCell>
										<TableCell className="text-zinc-400">
											{item.serial_number || "-"}
										</TableCell>
										<TableCell>
											{item.condition_enum ? (
												<Badge
													variant="outline"
													className={cn(
														"capitalize",
														statusBadgeClass(item.condition_enum || ""),
													)}
												>
													{item.condition_enum}
												</Badge>
											) : (
												<span className="text-zinc-500">-</span>
											)}
										</TableCell>
										<TableCell className="text-zinc-400">
											{item.current_location || "-"}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={(e) => {
													e.stopPropagation();
													setQrDialogItem({ id: item.id, name: item.name });
												}}
												title="View QR Code"
											>
												<QrCode className="h-4 w-4 text-violet-400 hover:text-violet-300" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						{loadingMore && (
							<div className="flex justify-center py-4">
								<Loader2 className="h-6 w-6 animate-spin text-violet-400" />
							</div>
						)}
						<div ref={sentinelRef} className="h-4" />
					</CardContent>
				</Card>
			)}

			{/* Create dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add New Item</DialogTitle>
					</DialogHeader>
					<InventoryForm
						mode="create"
						onSubmit={handleCreate}
						onCancel={() => setShowCreateDialog(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Item QR Code Dialog */}
			{qrDialogItem && (
				<ItemQRDialog
					itemId={qrDialogItem.id}
					itemName={qrDialogItem.name}
					open={!!qrDialogItem}
					onOpenChange={(open) => {
						if (!open) setQrDialogItem(null);
					}}
				/>
			)}
		</div>
	);
}
