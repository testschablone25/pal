"use client";

import { useState, useEffect } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
	GripVertical,
	Clock,
	Plus,
	Trash2,
	Edit,
	Music,
	ArrowUpDown,
} from "lucide-react";
import { QuickArtistCreate } from "@/components/quick-artist-create";
import { sortPerformancesByTime } from "@/lib/itinerary";

interface Performance {
	id: string;
	artist_id: string;
	event_id: string;
	start_time: string;
	end_time: string;
	stage: string;
	order_index: number;
	artists?: {
		id: string;
		name: string;
		city: string | null;
		genre: string | null;
	};
}

interface RunningOrderProps {
	eventId: string;
	onReorder?: (performances: Performance[]) => void;
	onAddPerformance?: (preselectedArtistId?: string) => void;
	onEditPerformance?: (performance: Performance) => void;
	onDeletePerformance?: (performance: Performance) => void;
}

interface SortableItemProps {
	performance: Performance;
	onEdit: () => void;
	onDelete: () => void;
}

function SortableItem({ performance, onEdit, onDelete }: SortableItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: performance.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const formatTime = (time: string) => {
		return time.substring(0, 5); // Format HH:MM:SS to HH:MM
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg ${
				isDragging ? "shadow-lg ring-2 ring-violet-600" : ""
			}`}
		>
			{/* Drag handle */}
			<button
				{...attributes}
				{...listeners}
				className="cursor-grab touch-none hover:text-violet-400 transition-colors"
			>
				<GripVertical className="h-5 w-5 text-zinc-400" />
			</button>

			{/* Time */}
			<div className="flex items-center gap-2 min-w-[120px]">
				<Clock className="h-4 w-4 text-violet-400" />
				<span className="font-mono">
					{formatTime(performance.start_time)} -{" "}
					{formatTime(performance.end_time)}
				</span>
			</div>

			{/* Artist info */}
			<div className="flex-1">
				<div className="font-medium">
					{performance.artists?.name || "Unknown Artist"}
				</div>
				<div className="flex items-center gap-2 text-sm text-zinc-400">
					{performance.artists?.genre && (
						<Badge variant="outline" className="border-zinc-700 text-zinc-300">
							{performance.artists.genre}
						</Badge>
					)}
					{performance.artists?.city && <span>{performance.artists.city}</span>}
					<Badge variant="secondary" className="bg-zinc-800">
						{performance.stage}
					</Badge>
				</div>
			</div>

			{/* Actions */}
			<div className="flex gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onEdit}
					className="text-zinc-400 hover:text-white"
				>
					<Edit className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={onDelete}
					className="text-zinc-400 hover:text-red-400"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export function RunningOrder({
	eventId,
	onReorder,
	onAddPerformance,
	onEditPerformance,
	onDeletePerformance,
}: RunningOrderProps) {
	const [performances, setPerformances] = useState<Performance[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deletingPerformance, setDeletingPerformance] =
		useState<Performance | null>(null);
	const [showQuickArtistCreate, setShowQuickArtistCreate] = useState(false);
	const [sorting, setSorting] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	useEffect(() => {
		fetchPerformances();
	}, [eventId]);

	const fetchPerformances = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/performances?event_id=${eventId}`);
			const data = await response.json();
			setPerformances(data.performances || []);
		} catch (error) {
			console.error("Failed to fetch performances:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setPerformances((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);
				const newItems = arrayMove(items, oldIndex, newIndex);

				// Update order_index
				const updated = newItems.map((item, index) => ({
					...item,
					order_index: index,
				}));

				// Save new order to backend
				saveOrder(updated);

				return updated;
			});
		}
	};

	const saveOrder = async (updatedPerformances: Performance[]) => {
		setSaving(true);
		try {
			// Update each performance's order_index
			await Promise.all(
				updatedPerformances.map(async (perf, index) => {
					await fetch(`/api/performances/${perf.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ order_index: index }),
					});
				}),
			);
			onReorder?.(updatedPerformances);
		} catch (error) {
			console.error("Failed to save order:", error);
			fetchPerformances(); // Revert on error
		} finally {
			setSaving(false);
		}
	};

	const handleSortByTime = async () => {
		setSorting(true);
		try {
			const sorted = sortPerformancesByTime(performances);
			const updated = sorted.map((item, index) => ({
				...item,
				order_index: index,
			}));
			await saveOrder(updated);
		} finally {
			setSorting(false);
		}
	};

	const handleDelete = async () => {
		if (!deletingPerformance) return;

		try {
			await fetch(`/api/performances/${deletingPerformance.id}`, {
				method: "DELETE",
			});
			setPerformances((prev) =>
				prev.filter((p) => p.id !== deletingPerformance.id),
			);
			onDeletePerformance?.(deletingPerformance);
			setShowDeleteDialog(false);
			setDeletingPerformance(null);
		} catch (error) {
			console.error("Failed to delete performance:", error);
			setShowDeleteDialog(false);
			setDeletingPerformance(null);
		}
	};

	if (loading) {
		return (
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardHeader>
					<CardTitle>Running Order</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="h-16 bg-zinc-800 rounded-lg" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						Running Order
						{saving && (
							<Badge variant="outline" className="text-yellow-400">
								Saving...
							</Badge>
						)}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSortByTime}
							disabled={sorting}
							className="border-zinc-700"
						>
							<ArrowUpDown className="h-4 w-4 mr-2" />
							{sorting ? "Sorting..." : "Sort by Time"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowQuickArtistCreate(true)}
							className="border-zinc-700"
						>
							<Music className="h-4 w-4 mr-2" />
							New Artist
						</Button>
						<Button
							className="bg-violet-600 hover:bg-violet-700"
							onClick={() => onAddPerformance?.()}
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Performance
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{performances.length === 0 ? (
						<div className="text-center py-8 text-zinc-400">
							<p>No performances scheduled yet.</p>
							<Button
								variant="outline"
								className="mt-4 border-zinc-700"
								onClick={() => onAddPerformance?.()}
							>
								Add your first performance
							</Button>
							<div className="flex flex-col items-center gap-2 mt-4">
								<Button
									variant="outline"
									className="border-zinc-700"
									onClick={() => setShowQuickArtistCreate(true)}
								>
									<Music className="h-4 w-4 mr-2" />
									Create new artist first
								</Button>
							</div>
						</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={performances.map((p) => p.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{performances.map((performance) => (
										<SortableItem
											key={performance.id}
											performance={performance}
											onEdit={() => onEditPerformance?.(performance)}
											onDelete={() => {
												setDeletingPerformance(performance);
												setShowDeleteDialog(true);
											}}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</CardContent>
			</Card>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
						<AlertDialogDescription>
							Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht
							werden.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700">
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<QuickArtistCreate
				open={showQuickArtistCreate}
				onOpenChange={setShowQuickArtistCreate}
				onArtistCreated={(artist) => {
					onAddPerformance?.(artist.id);
				}}
			/>
		</>
	);
}
