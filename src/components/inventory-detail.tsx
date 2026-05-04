"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckinCheckoutModal } from "@/components/checkin-checkout-modal";
import { ItemQRDialog } from "@/components/item-qr-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import {
	ArrowLeft,
	Package,
	MapPin,
	Calendar,
	User,
	QrCode,
	ListTodo,
	Music,
	FileText,
} from "lucide-react";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn, statusBadgeClass } from "@/lib/utils";

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

interface LinkedTaskEntry {
	task_id: string;
	goal_sub_location_id: string | null;
	delivered_at: string | null;
	task: {
		id: string;
		title: string;
		description: string | null;
		status: string;
		priority: string;
		due_date: string | null;
		scheduled_date: string | null;
		blocked: boolean;
		created_at: string;
		parent_task_id: string | null;
		assignee: {
			id: string;
			full_name: string | null;
			email: string;
			avatar_url: string | null;
		} | null;
		event: {
			id: string;
			name: string;
			date: string;
		} | null;
		subtasks: {
			id: string;
			title: string;
			status: string;
			priority: string;
		}[];
	};
	goal_sub_location: {
		id: string;
		name: string;
		venue: { id: string; name: string } | null;
	} | null;
}

interface InventoryDetailProps {
	itemId: string;
}

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
	const [linkedTasks, setLinkedTasks] = useState<LinkedTaskEntry[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showCheckinModal, setShowCheckinModal] = useState(false);
	const [showQRDialog, setShowQRDialog] = useState(false);
	const [riderAssignments, setRiderAssignments] = useState<
		{
			artist_id: string;
			artist_name: string;
			artist_genre: string | null;
			rider_section: string;
			equipment_name: string;
			quantity: number;
			artist_brings: boolean;
		}[]
	>([]);
	const [loadingRiderAssignments, setLoadingRiderAssignments] = useState(false);

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

	const fetchLinkedTasks = async () => {
		setLoadingTasks(true);
		try {
			const response = await fetch(`/api/items/${itemId}/tasks`);
			if (response.ok) {
				const data = await response.json();
				setLinkedTasks(data.task_entries || []);
			}
		} catch (err) {
			console.error("Failed to fetch linked tasks:", err);
		} finally {
			setLoadingTasks(false);
		}
	};

	useEffect(() => {
		fetchData();
		fetchLinkedTasks();
		fetchRiderAssignments();
	}, [itemId]);

	const fetchRiderAssignments = async () => {
		setLoadingRiderAssignments(true);
		try {
			const response = await fetch(`/api/items/${itemId}/rider-assignments`);
			if (response.ok) {
				const data = await response.json();
				setRiderAssignments(data.assignments || []);
			}
		} catch (err) {
			console.error("Failed to fetch rider assignments:", err);
		} finally {
			setLoadingRiderAssignments(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<PageSkeleton rows={3} />
			</div>
		);
	}

	if (error || !item) {
		return (
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
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
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
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
							onClick={() => setShowQRDialog(true)}
							className="border-zinc-700"
						>
							<QrCode className="h-4 w-4 mr-2 text-violet-400" />
							QR Code
						</Button>
						<Button
							variant="outline"
							onClick={() => setShowCheckinModal(true)}
							className="border-zinc-700"
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
								<div className="mt-1">
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
								</div>
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

			{/* Rider Assignments */}
			{!loadingRiderAssignments && riderAssignments.length > 0 && (
				<Card className="bg-zinc-900 border-violet-800/50">
					<CardHeader>
						<CardTitle className="text-white flex items-center gap-2">
							<FileText className="h-5 w-5 text-violet-400" />
							Artist Rider Assignments
							<Badge
								variant="outline"
								className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2"
							>
								{riderAssignments.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{riderAssignments.map((assignment, i) => (
								<div
									key={`rider-${assignment.artist_id}-${i}`}
									className="flex items-center justify-between p-3 bg-violet-950/20 border border-violet-900/30 rounded-lg cursor-pointer hover:border-violet-700/50 transition-colors"
									onClick={() =>
										router.push(`/artists/${assignment.artist_id}`)
									}
								>
									<div className="flex items-center gap-3 min-w-0">
										<Music className="h-4 w-4 text-violet-400 flex-shrink-0" />
										<div className="min-w-0">
											<p className="text-white font-medium truncate">
												{assignment.artist_name}
											</p>
											<div className="flex items-center gap-2 mt-0.5">
												<Badge
													variant="outline"
													className="border-zinc-700 text-zinc-400 text-[10px]"
												>
													{assignment.rider_section}
												</Badge>
												{assignment.artist_genre && (
													<span className="text-xs text-zinc-500">
														{assignment.artist_genre}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3 text-sm flex-shrink-0">
										<span className="text-zinc-400">
											{assignment.equipment_name}
										</span>
										{assignment.artist_brings ? (
											<Badge className="bg-green-600/20 text-green-400 text-[10px] border-green-700/50">
												Artist Brings
											</Badge>
										) : (
											<Badge className="bg-red-600/20 text-red-400 text-[10px] border-red-700/50">
												Venue Supplies
											</Badge>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Linked Tasks */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardHeader>
					<CardTitle className="text-white flex items-center gap-2">
						<ListTodo className="h-5 w-5 text-violet-400" />
						Linked Tasks
						{linkedTasks.length > 0 && (
							<Badge
								variant="outline"
								className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2"
							>
								{linkedTasks.length}
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingTasks ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
						</div>
					) : linkedTasks.length === 0 ? (
						<p className="text-zinc-500 text-center py-6">
							No tasks linked to this item
						</p>
					) : (
						<div className="space-y-3">
							{linkedTasks.map((entry) => {
								const task = entry.task;
								const subtasksDone =
									task.subtasks?.filter((s) => s.status === "done").length || 0;
								const subtasksTotal = task.subtasks?.length || 0;

								return (
									<div
										key={entry.task_id}
										className="flex items-start gap-3 bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
										onClick={() => router.push(`/workflow?task=${task.id}`)}
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<p className="text-sm font-medium text-zinc-200 truncate">
													{task.title}
												</p>
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] capitalize",
														statusBadgeClass(task.status),
													)}
												>
													{task.status.replace("_", " ")}
												</Badge>
											</div>

											<div className="flex items-center gap-3 text-xs text-zinc-500">
												{task.assignee && (
													<span className="flex items-center gap-1">
														<Avatar className="h-4 w-4">
															<AvatarImage
																src={task.assignee.avatar_url || undefined}
															/>
															<AvatarFallback className="bg-zinc-800 text-zinc-300 text-[8px]">
																{task.assignee.full_name?.[0] || "?"}
															</AvatarFallback>
														</Avatar>
														{task.assignee.full_name || "Unnamed"}
													</span>
												)}
												{task.event && (
													<span className="text-violet-400">
														{task.event.name}
													</span>
												)}
												{entry.delivered_at && (
													<span className="text-emerald-400">Delivered</span>
												)}
											</div>

											{/* Subtasks progress */}
											{subtasksTotal > 0 && (
												<div className="flex items-center gap-2 mt-1">
													<div className="flex gap-1">
														{task.subtasks.slice(0, 4).map((sub) => (
															<div
																key={sub.id}
																className={cn(
																	"w-1.5 h-1.5 rounded-full",
																	sub.status === "done"
																		? "bg-green-500"
																		: sub.status === "in_progress"
																			? "bg-blue-500"
																			: "bg-zinc-600",
																)}
																title={sub.title}
															/>
														))}
													</div>
													<span className="text-[10px] text-zinc-600">
														{subtasksDone}/{subtasksTotal} sub-tasks
													</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Location Timeline */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
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

			{/* Item QR Code Dialog */}
			<ItemQRDialog
				itemId={itemId}
				itemName={item?.name || ""}
				open={showQRDialog}
				onOpenChange={setShowQRDialog}
			/>
		</div>
	);
}
