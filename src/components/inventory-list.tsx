"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Search, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";
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

const conditionConfig: Record<string, string> = {
	new: "bg-green-600/20 text-green-400 border-green-600/50",
	good: "bg-blue-600/20 text-blue-400 border-blue-600/50",
	fair: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
	poor: "bg-orange-600/20 text-orange-400 border-orange-600/50",
	broken: "bg-red-600/20 text-red-400 border-red-600/50",
};

const categoryLabels: Record<string, string> = {
	dj_audio: "DJ & Audio",
	lighting: "Lighting",
	pa_sound: "PA & Sound",
	infrastructure: "Infrastructure",
	venue_misc: "Venue & Misc",
};

export function InventoryList() {
	const router = useRouter();
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [category, setCategory] = useState("");
	const [total, setTotal] = useState(0);
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	const fetchItems = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (debouncedSearch) params.append("search", debouncedSearch);
			if (category) params.append("category", category);

			const response = await fetch(`/api/items?${params.toString()}`);
			const data: ItemsResponse = await response.json();
			setItems(data.items || []);
			setTotal(data.total);
		} catch (error) {
			console.error("Failed to fetch items:", error);
		} finally {
			setLoading(false);
		}
	}, [debouncedSearch, category]);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

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
	};

	return (
		<div className="space-y-6">
			{/* Search and Filters */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
							<Input
								placeholder="Search items by name, serial number, or brand..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-10 bg-zinc-950 border-zinc-800"
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

					{/* Category filter tabs */}
					<div className="flex flex-wrap gap-2 mt-4">
						{CATEGORIES.map((cat) => (
							<button
								key={cat.value}
								onClick={() => setCategory(cat.value)}
								className={cn(
									"px-3 py-1.5 text-sm rounded-full border transition-colors",
									category === cat.value
										? "bg-violet-600/20 text-violet-400 border-violet-600/50"
										: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600",
								)}
							>
								{cat.label}
							</button>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Results count */}
			<div className="flex justify-between items-center">
				<p className="text-sm text-zinc-400">
					{loading ? "Loading..." : `${total} items found`}
				</p>
			</div>

			{/* Items table */}
			{loading ? (
				<div className="space-y-3">
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className="h-16 w-full bg-zinc-800" />
					))}
				</div>
			) : items.length === 0 ? (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="py-12 text-center">
						<Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
						<p className="text-zinc-400">No items found</p>
						<Button
							onClick={() => setShowCreateDialog(true)}
							className="mt-4 bg-violet-600 hover:bg-violet-700"
						>
							Add your first item
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card className="bg-zinc-900 border-zinc-800">
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
														conditionConfig[item.condition_enum] ||
															"bg-zinc-600/20 text-zinc-400 border-zinc-600/50",
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
									</TableRow>
								))}
							</TableBody>
						</Table>
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
		</div>
	);
}
