"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckinCheckoutModal } from "@/components/checkin-checkout-modal";
import { ArrowLeft, Package, MapPin, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubLocation {
	id: string;
	name: string;
	venue: { id: string; name: string } | null;
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
	active_rental: {
		id: string;
		renter_name: string;
		status: string;
		start_date: string;
		expected_return_date: string;
	} | null;
}

interface LocationHistoryEntry {
	id: string;
	location: string;
	action: string;
	timestamp: string;
	moved_by: {
		id: string;
		full_name: string | null;
		email: string;
	} | null;
}

interface InventoryDetailProps {
	itemId: string;
}

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

const actionLabels: Record<string, string> = {
	check_in: "Check In",
	check_out: "Check Out",
	transfer: "Transfer",
	rental_out: "Rental Out",
	rental_return: "Rental Return",
};

export function InventoryDetail({ itemId }: InventoryDetailProps) {
	const router = useRouter();
	const [item, setItem] = useState<Item | null>(null);
	const [history, setHistory] = useState<LocationHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showCheckinModal, setShowCheckinModal] = useState(false);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const [itemResponse, historyResponse] = await Promise.all([
				fetch(`/api/items/${itemId}`),
				fetch(`/api/items/${itemId}/location-history`),
			]);

			if (!itemResponse.ok) {
				throw new Error("Item not found");
			}

			const itemData = await itemResponse.json();
			const historyData = await historyResponse.json();

			setItem(itemData);
			setHistory(historyData.history || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [itemId]);

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-32 bg-zinc-800" />
				<Skeleton className="h-64 w-full bg-zinc-800" />
				<Skeleton className="h-48 w-full bg-zinc-800" />
			</div>
		);
	}

	if (error || !item) {
		return (
			<Card className="bg-zinc-900 border-zinc-800">
				<CardContent className="py-12 text-center">
					<Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
					<p className="text-red-400">{error || "Item not found"}</p>
					<Button
						variant="outline"
						onClick={() => router.push("/inventory")}
						className="mt-4 border-zinc-800"
					>
						Back to Inventory
					</Button>
				</CardContent>
			</Card>
		);
	}

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="space-y-6">
			{/* Back button */}
			<Button
				variant="ghost"
				onClick={() => router.push("/inventory")}
				className="text-zinc-400 hover:text-white"
			>
				<ArrowLeft className="h-4 w-4 mr-2" />
				Back to Inventory
			</Button>

			{/* Item Details */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-white text-2xl">{item.name}</CardTitle>
						{item.brand && (
							<p className="text-zinc-400 text-sm mt-1">
								{item.brand}
								{item.model ? ` / ${item.model}` : ""}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => setShowCheckinModal(true)}
							className="border-zinc-800"
						>
							<MapPin className="h-4 w-4 mr-2" />
							Check In / Out
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-4">
							<div>
								<label className="text-sm text-zinc-500">Category</label>
								<div className="text-white">
									<Badge
										variant="outline"
										className="border-zinc-700 text-zinc-300 mt-1"
									>
										{categoryLabels[item.category] || item.category}
									</Badge>
								</div>
							</div>
							<div>
								<label className="text-sm text-zinc-500">Serial Number</label>
								<p className="text-white">{item.serial_number || "-"}</p>
							</div>
							<div>
								<label className="text-sm text-zinc-500">
									Current Location
								</label>
								<p className="text-white flex items-center gap-1">
									<MapPin className="h-4 w-4 text-violet-400" />
									{item.current_location || "Not set"}
								</p>
								{item.sub_location && (
									<p className="text-xs text-zinc-500 mt-1">
										Venue: {item.sub_location.venue?.name || "Unknown"}
										&gt; Area: {item.sub_location.name}
									</p>
								)}
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-sm text-zinc-500">Condition</label>
								<p className="mt-1">
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
								</p>
							</div>
							{item.condition_notes && (
								<div>
									<label className="text-sm text-zinc-500">
										Condition Notes
									</label>
									<p className="text-zinc-300 text-sm mt-1">
										{item.condition_notes}
									</p>
								</div>
							)}
							{item.notes && (
								<div>
									<label className="text-sm text-zinc-500">Notes</label>
									<p className="text-zinc-300 text-sm mt-1">{item.notes}</p>
								</div>
							)}
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-sm text-zinc-500">Created</label>
								<p className="text-white text-sm mt-1">
									{formatDate(item.created_at)}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Active Rental */}
			{item.active_rental && (
				<Card className="bg-zinc-900 border-amber-800/50">
					<CardHeader>
						<CardTitle className="text-amber-400 flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							Active Rental
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="text-sm text-zinc-500">Renter</label>
								<p className="text-white">{item.active_rental.renter_name}</p>
							</div>
							<div>
								<label className="text-sm text-zinc-500">Start Date</label>
								<p className="text-white">
									{formatDate(item.active_rental.start_date)}
								</p>
							</div>
							<div>
								<label className="text-sm text-zinc-500">Expected Return</label>
								<p className="text-white">
									{formatDate(item.active_rental.expected_return_date)}
								</p>
							</div>
						</div>
						<Button
							className="mt-4 bg-amber-600 hover:bg-amber-700"
							onClick={() => router.push("/rentals")}
						>
							Mark as Returned
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Location Timeline */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardHeader>
					<CardTitle className="text-white flex items-center gap-2">
						<MapPin className="h-5 w-5 text-violet-400" />
						Location History
					</CardTitle>
				</CardHeader>
				<CardContent>
					{history.length === 0 ? (
						<p className="text-zinc-500 text-center py-6">
							No location history recorded
						</p>
					) : (
						<div className="space-y-4">
							{history.map((entry, index) => (
								<div key={entry.id} className="flex gap-4">
									<div className="flex flex-col items-center">
										<div
											className={cn(
												"w-3 h-3 rounded-full",
												index === 0 ? "bg-violet-500" : "bg-zinc-700",
											)}
										/>
										{index < history.length - 1 && (
											<div className="w-px flex-1 bg-zinc-800 mt-1" />
										)}
									</div>
									<div className="flex-1 pb-4">
										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className={cn(
													"border-zinc-700",
													index === 0 && "border-violet-600/50 text-violet-400",
												)}
											>
												{actionLabels[entry.action] || entry.action}
											</Badge>
											<span className="text-sm text-zinc-400">
												{formatDate(entry.timestamp)}
											</span>
										</div>
										<p className="text-white text-sm mt-1">
											<MapPin className="h-3 w-3 inline mr-1 text-zinc-500" />
											{entry.location}
										</p>
										{entry.moved_by && (
											<p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
												<User className="h-3 w-3" />
												{entry.moved_by.full_name || entry.moved_by.email}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Check-in / Check-out Modal */}
			<CheckinCheckoutModal
				itemId={itemId}
				open={showCheckinModal}
				onOpenChange={setShowCheckinModal}
				onSuccess={fetchData}
			/>
		</div>
	);
}
