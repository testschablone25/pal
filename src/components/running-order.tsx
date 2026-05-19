"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	useDraggable,
	useDroppable,
	closestCenter,
	DragStartEvent,
	DragEndEvent,
	DragOverEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {} from "@/components/ui/select";
import {
	Music,
	Plus,
	Trash2,
	Edit,
	GripVertical,
	Clock,
	Loader2,
	RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface ArtistBrief {
	id: string;
	name: string;
	city: string | null;
	genre: string | null;
}

interface PerformanceBrief {
	id: string;
	artist_id: string;
	stage: string;
	order_index: number;
	artists: ArtistBrief | null;
}

interface TimeSlot {
	id: string;
	event_id: string;
	label: string | null;
	start_time: string;
	end_time: string;
	slot_index: number;
	duration_minutes: number;
	created_at: string;
	performances?: PerformanceBrief[];
}

interface RunningOrderProps {
	eventId: string;
	onReorder?: (slots: TimeSlot[]) => void;
	onAddPerformance?: (preselectedArtistId?: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────

function formatTime(time: string): string {
	return time.substring(0, 5);
}

function timeToMinutes(t: string): number {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + m;
}

function minutesToTime(minutes: number): string {
	const h = Math.floor(minutes / 60) % 24;
	const m = minutes % 60;
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// ─── Slot Card Component ──────────────────────────────────

interface SlotCardProps {
	slot: TimeSlot;
	performances: PerformanceBrief[];
	isDragging: boolean;
	onAssignArtist: (slotId: string) => void;
	onArtistClick: (slotId: string, performance: PerformanceBrief) => void;
	onEditLabel: (slotId: string, label: string) => void;
	onAdjustDuration: (slotId: string, newEndTime: string) => void;
	onEditTime: (
		slotId: string,
		field: "start_time" | "end_time",
		newValue: string,
	) => void;
	onRemoveSlot: (slotId: string) => void;
}

// ─── Draggable Artist Card ───────────────────────────────

interface DraggableArtistCardProps {
	performance: PerformanceBrief;
	onClick: () => void;
}

function DraggableArtistCard({
	performance,
	onClick,
}: DraggableArtistCardProps) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: performance.id,
		data: { performance },
	});

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			className={`flex items-center gap-3 p-3 bg-zinc-800/60 rounded-md border border-zinc-700/50 cursor-grab active:cursor-grabbing hover:border-violet-600/40 group ${
				isDragging ? "invisible" : ""
			}`}
			onClick={onClick}
		>
			<GripVertical className="h-4 w-4 text-zinc-500 shrink-0 group-hover:text-violet-400 transition-colors" />
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium text-white truncate">
					{performance.artists?.name || "Unknown"}
				</div>
				<div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
					{performance.artists?.genre && (
						<Badge
							variant="outline"
							className="border-zinc-700 text-zinc-300 text-[10px] py-0 h-4"
						>
							{performance.artists.genre}
						</Badge>
					)}
					{performance.artists?.city && (
						<span className="truncate">{performance.artists.city}</span>
					)}
					<Badge
						variant="secondary"
						className="bg-zinc-800 text-[10px] py-0 h-4"
					>
						{performance.stage}
					</Badge>
				</div>
			</div>
			<Edit className="h-3.5 w-3.5 text-zinc-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
		</div>
	);
}

// ─── Slot Card Component ──────────────────────────────────

function SlotCard({
	slot,
	performances,
	isDragging,
	onAssignArtist,
	onArtistClick,
	onEditLabel,
	onAdjustDuration,
	onEditTime,
	onRemoveSlot,
}: SlotCardProps) {
	const hasArtists = performances.length > 0;
	const { setNodeRef: setDroppableRef, isOver } = useDroppable({
		id: slot.id,
	});
	const [editingLabel, setEditingLabel] = useState(false);
	const [editLabelValue, setEditLabelValue] = useState(slot.label || "");
	const [editingDuration, setEditingDuration] = useState(false);
	const [editDurationValue, setEditDurationValue] = useState(
		formatTime(slot.end_time),
	);
	const [editingStartTime, setEditingStartTime] = useState(false);
	const [editStartTimeValue, setEditStartTimeValue] = useState(
		formatTime(slot.start_time),
	);
	const [editingEndTime, setEditingEndTime] = useState(false);
	const [editEndTimeValue, setEditEndTimeValue] = useState(
		formatTime(slot.end_time),
	);
	const labelInputRef = useRef<HTMLInputElement>(null);
	const startTimeInputRef = useRef<HTMLInputElement>(null);
	const endTimeInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editingLabel && labelInputRef.current) {
			labelInputRef.current.focus();
			labelInputRef.current.select();
		}
	}, [editingLabel]);

	useEffect(() => {
		if (editingStartTime && startTimeInputRef.current) {
			startTimeInputRef.current.focus();
			startTimeInputRef.current.select();
		}
	}, [editingStartTime]);

	useEffect(() => {
		if (editingEndTime && endTimeInputRef.current) {
			endTimeInputRef.current.focus();
			endTimeInputRef.current.select();
		}
	}, [editingEndTime]);

	const handleLabelSave = () => {
		const trimmed = editLabelValue.trim();
		onEditLabel(slot.id, trimmed || "");
		setEditingLabel(false);
	};

	const handleDurationSave = () => {
		onAdjustDuration(slot.id, editDurationValue);
		setEditingDuration(false);
	};

	const handleStartTimeSave = () => {
		if (editStartTimeValue !== formatTime(slot.start_time)) {
			onEditTime(slot.id, "start_time", editStartTimeValue);
		}
		setEditingStartTime(false);
	};

	const handleEndTimeSave = () => {
		if (editEndTimeValue !== formatTime(slot.end_time)) {
			onEditTime(slot.id, "end_time", editEndTimeValue);
		}
		setEditingEndTime(false);
	};

	return (
		<div
			ref={setDroppableRef}
			data-slot-id={slot.id}
			className={`relative flex items-start gap-3 p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg transition-all
				${isDragging ? "opacity-40 ring-2 ring-violet-500" : ""}
				${isOver ? "ring-2 ring-violet-400" : ""}
				${hasArtists ? "border-l-violet-500 border-l-2" : "border-l-zinc-700 border-l-2 border-dashed"}`}
		>
			{/* Left time indicator column — clickable to edit */}
			<div className="flex flex-col items-center gap-1 min-w-[70px] pt-0.5">
				{editingStartTime ? (
					<Input
						ref={startTimeInputRef}
						type="time"
						value={editStartTimeValue}
						onChange={(e) => setEditStartTimeValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleStartTimeSave();
							if (e.key === "Escape") {
								setEditStartTimeValue(formatTime(slot.start_time));
								setEditingStartTime(false);
							}
						}}
						onBlur={handleStartTimeSave}
						className="h-6 w-16 text-xs bg-zinc-800 border-zinc-700 px-1 font-mono text-violet-400"
					/>
				) : (
					<button
						onClick={() => {
							setEditStartTimeValue(formatTime(slot.start_time));
							setEditingStartTime(true);
						}}
						className="font-mono text-xs text-violet-400 font-medium hover:text-violet-300 hover:bg-zinc-800 px-1 py-0.5 rounded transition-colors"
						title="Click to edit start time"
					>
						{formatTime(slot.start_time)}
					</button>
				)}
				<div className="w-px h-6 bg-zinc-700" />
				{editingEndTime ? (
					<Input
						ref={endTimeInputRef}
						type="time"
						value={editEndTimeValue}
						onChange={(e) => setEditEndTimeValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleEndTimeSave();
							if (e.key === "Escape") {
								setEditEndTimeValue(formatTime(slot.end_time));
								setEditingEndTime(false);
							}
						}}
						onBlur={handleEndTimeSave}
						className="h-6 w-16 text-xs bg-zinc-800 border-zinc-700 px-1 font-mono text-zinc-500"
					/>
				) : (
					<button
						onClick={() => {
							setEditEndTimeValue(formatTime(slot.end_time));
							setEditingEndTime(true);
						}}
						className="font-mono text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 px-1 py-0.5 rounded transition-colors"
						title="Click to edit end time"
					>
						{formatTime(slot.end_time)}
					</button>
				)}
			</div>

			{/* Middle content */}
			<div className="flex-1 min-w-0">
				{/* Slot header: label + actions */}
				<div className="flex items-center gap-2 mb-2">
					{editingLabel ? (
						<div className="flex items-center gap-1">
							<Input
								ref={labelInputRef}
								value={editLabelValue}
								onChange={(e) => setEditLabelValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleLabelSave();
									if (e.key === "Escape") {
										setEditLabelValue(slot.label || "");
										setEditingLabel(false);
									}
								}}
								onBlur={handleLabelSave}
								className="h-7 text-xs bg-zinc-800 border-zinc-700 w-32"
								placeholder="Slot label..."
							/>
						</div>
					) : (
						<button
							onClick={() => {
								setEditLabelValue(slot.label || "");
								setEditingLabel(true);
							}}
							className="text-xs font-medium text-zinc-300 hover:text-violet-400 transition-colors truncate max-w-[160px]"
							title="Click to edit label"
						>
							{slot.label || `Slot ${slot.slot_index + 1}`}
						</button>
					)}

					{/* Duration edit */}
					{editingDuration ? (
						<div className="flex items-center gap-1">
							<Input
								type="time"
								value={editDurationValue}
								onChange={(e) => setEditDurationValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleDurationSave();
									if (e.key === "Escape") {
										setEditDurationValue(formatTime(slot.end_time));
										setEditingDuration(false);
									}
								}}
								onBlur={handleDurationSave}
								className="h-7 w-24 text-xs bg-zinc-800 border-zinc-700"
							/>
						</div>
					) : (
						<button
							onClick={() => {
								setEditDurationValue(formatTime(slot.end_time));
								setEditingDuration(true);
							}}
							className="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1"
							title="Click to adjust end time"
						>
							<Clock className="h-3 w-3" />
							{slot.duration_minutes}min
						</button>
					)}

					<span className="ml-auto" />

					{/* Remove slot */}
					<button
						onClick={() => onRemoveSlot(slot.id)}
						className="text-zinc-600 hover:text-red-400 transition-colors"
						title="Remove slot"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Artist area — multiple artists per slot */}
				{hasArtists ? (
					<div className="space-y-1.5">
						{performances.map((perf) =>
							perf.artists ? (
								<DraggableArtistCard
									key={perf.id}
									performance={perf}
									onClick={() => onArtistClick(slot.id, perf)}
								/>
							) : null,
						)}
						{/* Add another artist button */}
						<button
							onClick={() => onAssignArtist(slot.id)}
							className="w-full flex items-center gap-2 p-2.5 bg-zinc-800/20 rounded-md border border-dashed border-zinc-700/40 hover:border-violet-600/40 hover:bg-zinc-800/40 transition-all group"
						>
							<Plus className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400 shrink-0" />
							<span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
								Add another artist
							</span>
						</button>
					</div>
				) : (
					<button
						onClick={() => onAssignArtist(slot.id)}
						className="w-full flex items-center gap-2 p-3 bg-zinc-800/30 rounded-md border border-dashed border-zinc-700/50 hover:border-violet-600/40 hover:bg-zinc-800/50 transition-all group"
					>
						<div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-violet-600/20 transition-colors">
							<Plus className="h-4 w-4 text-zinc-500 group-hover:text-violet-400" />
						</div>
						<span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
							Assign Artist
						</span>
					</button>
				)}
			</div>
		</div>
	);
}

// ─── Artist Select Popover ────────────────────────────────

interface ArtistSelectPopoverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (artist: ArtistBrief) => void;
	slotStage: string;
	onStageChange: (stage: string) => void;
}

function ArtistSelectPopover({
	open,
	onOpenChange,
	onSelect,
	slotStage,
	onStageChange,
}: ArtistSelectPopoverProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [suggestions, setSuggestions] = useState<ArtistBrief[]>([]);
	const [searching, setSearching] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newArtistName, setNewArtistName] = useState("");
	const [newArtistGenre, setNewArtistGenre] = useState("");
	const [newArtistCity, setNewArtistCity] = useState("");
	const [creatingArtist, setCreatingArtist] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = searchQuery.trim();
		if (trimmed.length < 2) {
			setSuggestions([]);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await fetch(
					`/api/artists?name=${encodeURIComponent(trimmed)}&limit=10`,
				);
				const data = await res.json();
				setSuggestions(data.artists || []);
			} catch {
				setSuggestions([]);
			} finally {
				setSearching(false);
			}
		}, 250);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [searchQuery]);

	useEffect(() => {
		if (open && searchInputRef.current) {
			setTimeout(() => searchInputRef.current?.focus(), 50);
		}
		if (!open) {
			setSearchQuery("");
			setSuggestions([]);
			setShowCreateForm(false);
		}
	}, [open]);

	const handleCreateAndSelect = async () => {
		if (!newArtistName.trim()) return;
		setCreatingArtist(true);
		try {
			const res = await fetch("/api/artists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newArtistName.trim(),
					genre: newArtistGenre.trim() || null,
					city: newArtistCity.trim() || null,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create artist");
			onSelect(data as ArtistBrief);
			onOpenChange(false);
		} catch (err) {
			console.error(err);
		} finally {
			setCreatingArtist(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900 border-zinc-800 rounded-lg max-w-md">
				<DialogHeader>
					<DialogTitle>Assign Artist</DialogTitle>
				</DialogHeader>
				{!showCreateForm ? (
					<div className="space-y-3">
						{/* Search input */}
						<div className="relative">
							<Input
								ref={searchInputRef}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search artists..."
								className="bg-zinc-800 border-zinc-700 h-9 text-sm"
							/>
							{searching && (
								<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-500" />
							)}
						</div>

						{/* Stage selector */}
						<Select value={slotStage} onValueChange={onStageChange}>
							<SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-xs">
								<SelectValue placeholder="Stage" />
							</SelectTrigger>
							<SelectContent className="bg-zinc-900 border-zinc-800">
								<SelectItem value="main">Main Stage</SelectItem>
								<SelectItem value="second">Second Stage</SelectItem>
								<SelectItem value="outdoor">Outdoor</SelectItem>
								<SelectItem value="vip">VIP Area</SelectItem>
							</SelectContent>
						</Select>

						{/* Results */}
						{suggestions.length > 0 ? (
							<div className="border border-zinc-800 rounded-md max-h-48 overflow-y-auto">
								{suggestions.map((artist) => (
									<button
										key={artist.id}
										onClick={() => onSelect(artist)}
										className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
									>
										<Music className="h-4 w-4 text-violet-400 shrink-0" />
										<div className="flex-1 min-w-0">
											<div className="text-sm text-white truncate">
												{artist.name}
											</div>
											<div className="flex gap-2 text-xs text-zinc-500">
												{artist.genre && <span>{artist.genre}</span>}
												{artist.city && <span>{artist.city}</span>}
											</div>
										</div>
									</button>
								))}
							</div>
						) : searchQuery.trim().length >= 2 && !searching ? (
							<div className="text-center py-4">
								<p className="text-sm text-zinc-500">No artists found</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setNewArtistName(searchQuery);
										setShowCreateForm(true);
									}}
									className="mt-2 border-zinc-700"
								>
									<Plus className="h-3 w-3 mr-1" />
									Create &quot;{searchQuery.trim()}&quot;
								</Button>
							</div>
						) : null}

						{/* Quick create link */}
						{searchQuery.trim().length >= 1 && suggestions.length > 0 && (
							<button
								onClick={() => {
									setNewArtistName(searchQuery);
									setShowCreateForm(true);
								}}
								className="w-full text-xs text-violet-400 hover:text-violet-300 py-1.5 transition-colors"
							>
								+ Create new artist &quot;{searchQuery.trim()}&quot;
							</button>
						)}
					</div>
				) : (
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-zinc-300">New Artist</h4>
						<Input
							value={newArtistName}
							onChange={(e) => setNewArtistName(e.target.value)}
							placeholder="Name *"
							className="bg-zinc-800 border-zinc-700 text-sm h-9"
							autoFocus
						/>
						<div className="grid grid-cols-2 gap-2">
							<Input
								value={newArtistGenre}
								onChange={(e) => setNewArtistGenre(e.target.value)}
								placeholder="Genre"
								className="bg-zinc-800 border-zinc-700 text-sm h-9"
							/>
							<Input
								value={newArtistCity}
								onChange={(e) => setNewArtistCity(e.target.value)}
								placeholder="City"
								className="bg-zinc-800 border-zinc-700 text-sm h-9"
							/>
						</div>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={handleCreateAndSelect}
								disabled={!newArtistName.trim() || creatingArtist}
								className="bg-violet-600 hover:bg-violet-700 text-xs flex-1"
							>
								{creatingArtist ? (
									<Loader2 className="h-3 w-3 animate-spin mr-1" />
								) : null}
								Create & Assign
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setShowCreateForm(false)}
								className="text-xs"
							>
								Back
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ─── Drag Preview ─────────────────────────────────────────

function DragPreview({ performance }: { performance: PerformanceBrief }) {
	return (
		<div className="flex items-center gap-3 p-3 bg-zinc-800 border border-violet-500 rounded-md shadow-xl w-64">
			<GripVertical className="h-4 w-4 text-violet-400" />
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium text-white truncate">
					{performance.artists?.name || "Unknown"}
				</div>
				<div className="text-xs text-zinc-400">
					{performance.artists?.genre || ""}
				</div>
			</div>
		</div>
	);
}

// ─── Main RunningOrder Component ──────────────────────────

export function RunningOrder({ eventId }: RunningOrderProps) {
	const [slots, setSlots] = useState<TimeSlot[]>([]);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [saving, setSaving] = useState(false);

	// DnD state
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activePerformance, setActivePerformance] =
		useState<PerformanceBrief | null>(null);

	// Artist assign popover state
	const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
	const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
	const [assignStage, setAssignStage] = useState("main");

	// Edit performance popover state
	const [editPerformance, setEditPerformance] =
		useState<PerformanceBrief | null>(null);
	const [editSlotId, setEditSlotId] = useState<string | null>(null);
	const [editPopoverOpen, setEditPopoverOpen] = useState(false);
	const [editStage, setEditStage] = useState("main");
	const [editArtistSearch, setEditArtistSearch] = useState("");
	const [editSuggestions, setEditSuggestions] = useState<ArtistBrief[]>([]);
	const [editSearching, setEditSearching] = useState(false);
	const editDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Delete confirmation
	const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
	// Slot duration control (default 60 min)
	const [slotDuration, setSlotDuration] = useState(60);

	// Clear all artists
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showClearAllDialog, setShowClearAllDialog] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
	);

	// ── Data fetching ──

	const fetchSlots = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/time-slots?event_id=${eventId}`);
			const data = await res.json();
			const fetchedSlots: TimeSlot[] = data.time_slots || [];

			if (fetchedSlots.length === 0) {
				// Auto-generate if no slots exist (preserve any existing artist assignments)
				await generateSlots(undefined, false);
			} else {
				setSlots(fetchedSlots);
			}
		} catch (error) {
			console.error("Failed to fetch time slots:", error);
		} finally {
			setLoading(false);
		}
	}, [eventId]);

	const generateSlots = async (
		duration?: number,
		clearAssignments?: boolean,
	) => {
		setGenerating(true);
		try {
			const res = await fetch("/api/time-slots/regenerate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: eventId,
					duration_minutes: duration ?? slotDuration,
					clear_assignments: clearAssignments ?? true,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				console.error("Failed to generate slots:", data.error);
				return;
			}
			setSlots(data.time_slots || []);
		} catch (error) {
			console.error("Failed to generate slots:", error);
		} finally {
			setGenerating(false);
		}
	};

	useEffect(() => {
		fetchSlots();
	}, [fetchSlots]);

	// ── Slot mutations ──

	const handleEditLabel = async (slotId: string, label: string) => {
		setSlots((prev) =>
			prev.map((s) => (s.id === slotId ? { ...s, label: label || null } : s)),
		);
		await fetch(`/api/time-slots/${slotId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ label: label || null }),
		});
	};

	const handleEditTime = async (
		slotId: string,
		field: "start_time" | "end_time",
		newValue: string,
	) => {
		const slot = slots.find((s) => s.id === slotId);
		if (!slot) return;

		const newMinutes = timeToMinutes(newValue);
		const startMin =
			field === "start_time" ? newMinutes : timeToMinutes(slot.start_time);
		const endMin =
			field === "end_time" ? newMinutes : timeToMinutes(slot.end_time);

		if (endMin <= startMin) return;

		// Optimistic update with re-sort by start_time
		setSlots((prev) => {
			const updated = prev.map((s) =>
				s.id === slotId
					? {
							...s,
							[field]: newValue,
							duration_minutes: endMin - startMin,
							start_time: field === "start_time" ? newValue : s.start_time,
							end_time: field === "end_time" ? newValue : s.end_time,
						}
					: s,
			);
			// Re-sort by start_time, update slot_index
			return updated
				.sort(
					(a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
				)
				.map((s, i) => ({ ...s, slot_index: i }));
		});

		await fetch(`/api/time-slots/${slotId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ [field]: newValue }),
		});
	};

	const handleAdjustDuration = async (slotId: string, newEndTime: string) => {
		const slot = slots.find((s) => s.id === slotId);
		if (!slot) return;

		const startMinutes = timeToMinutes(slot.start_time);
		const endMinutes = timeToMinutes(newEndTime);

		if (endMinutes <= startMinutes) return;

		setSlots((prev) =>
			prev.map((s) =>
				s.id === slotId
					? {
							...s,
							end_time: newEndTime,
							duration_minutes: endMinutes - startMinutes,
						}
					: s,
			),
		);

		await fetch(`/api/time-slots/${slotId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ end_time: newEndTime }),
		});
	};

	const handleRemoveSlot = async (slotId: string) => {
		setDeleteSlotId(slotId);
		setShowDeleteDialog(true);
	};

	const confirmRemoveSlot = async () => {
		if (!deleteSlotId) return;
		setSlots((prev) => prev.filter((s) => s.id !== deleteSlotId));
		await fetch(`/api/time-slots/${deleteSlotId}`, { method: "DELETE" });
		setShowDeleteDialog(false);
		setDeleteSlotId(null);
	};

	const handleClearAllArtists = async () => {
		setSaving(true);
		try {
			await fetch(`/api/performances?event_id=${eventId}`, {
				method: "DELETE",
			});
			setSlots((prev) => prev.map((s) => ({ ...s, performances: [] })));
			setShowClearAllDialog(false);
		} catch (error) {
			console.error("Failed to clear artists:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleAddSlot = async () => {
		// Add a 60-min slot after the last slot
		const lastSlot = slots[slots.length - 1];
		const lastEnd = lastSlot
			? timeToMinutes(lastSlot.end_time)
			: timeToMinutes("22:00");
		const newStart = minutesToTime(lastEnd);
		const newEnd = minutesToTime(lastEnd + 60);

		setSaving(true);
		try {
			const res = await fetch("/api/time-slots", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: eventId,
					start_time: newStart,
					end_time: newEnd,
					slot_index: slots.length,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setSlots((prev) => [...prev, data]);
		} catch (error) {
			console.error("Failed to add slot:", error);
		} finally {
			setSaving(false);
		}
	};

	// ── Artist assignment ──

	const openAssignPopover = (slotId: string) => {
		setAssigningSlotId(slotId);
		setAssignStage("main");
		setAssignPopoverOpen(true);
	};

	const handleAssignArtist = async (artist: ArtistBrief) => {
		if (!assigningSlotId) return;

		setSaving(true);
		try {
			// Check if this artist already has a performance in this event
			const checkRes = await fetch(
				`/api/performances?event_id=${eventId}&artist_id=${artist.id}`,
			);
			const checkData = await checkRes.json();
			const existingPerf: PerformanceBrief | undefined =
				checkData.performances?.[0];

			let perfData: Record<string, unknown>;

			if (existingPerf) {
				// Artist already has a performance — move it to the new slot
				const moveRes = await fetch("/api/performances/move", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						performance_id: existingPerf.id,
						time_slot_id: assigningSlotId,
					}),
				});

				if (!moveRes.ok) {
					const errData = await moveRes.json();
					console.error("Failed to move artist:", errData.error);
					return;
				}

				perfData = { id: existingPerf.id };

				// Find which slot the performance was in before
				let oldSlotId: string | null = null;
				for (const slot of slots) {
					if ((slot.performances ?? []).some((p) => p.id === existingPerf.id)) {
						oldSlotId = slot.id;
						break;
					}
				}

				// Update state: remove from old slot, add to new slot
				setSlots((prev) =>
					prev.map((s) => {
						if (s.id === oldSlotId) {
							return {
								...s,
								performances: (s.performances ?? []).filter(
									(p) => p.id !== existingPerf.id,
								),
							};
						}
						if (s.id === assigningSlotId) {
							return {
								...s,
								performances: [
									...(s.performances ?? []),
									{
										id: existingPerf.id,
										artist_id: artist.id,
										stage: assignStage,
										order_index: 0,
										artists: artist,
									},
								],
							};
						}
						return s;
					}),
				);
			} else {
				// First time assigning this artist — create a new performance
				const res = await fetch("/api/performances", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						event_id: eventId,
						artist_id: artist.id,
						time_slot_id: assigningSlotId,
						stage: assignStage,
					}),
				});

				if (!res.ok) {
					const errData = await res.json();
					console.error("Failed to assign artist:", errData.error);
					return;
				}

				perfData = await res.json();

				// Update slots state: append to target slot
				setSlots((prev) =>
					prev.map((s) =>
						s.id === assigningSlotId
							? {
									...s,
									performances: [
										...(s.performances ?? []),
										{
											id: String(perfData.id),
											artist_id: artist.id,
											stage: assignStage,
											order_index: 0,
											artists: artist,
										},
									],
								}
							: s,
					),
				);
			}

			setAssignPopoverOpen(false);
			setAssigningSlotId(null);
		} catch (error) {
			console.error("Failed to assign artist:", error);
		} finally {
			setSaving(false);
		}
	};

	// ── Edit performance popover ──

	const openEditPopover = (slotId: string, performance: PerformanceBrief) => {
		setEditSlotId(slotId);
		setEditPerformance(performance);
		setEditStage(performance.stage);
		setEditArtistSearch(performance.artists?.name || "");
		setEditPopoverOpen(true);
	};

	// Debounced edit artist search
	useEffect(() => {
		if (!editPopoverOpen) return;
		if (editDebounceRef.current) clearTimeout(editDebounceRef.current);

		const trimmed = editArtistSearch.trim();
		if (trimmed.length < 2) {
			setEditSuggestions([]);
			return;
		}

		editDebounceRef.current = setTimeout(async () => {
			setEditSearching(true);
			try {
				const res = await fetch(
					`/api/artists?name=${encodeURIComponent(trimmed)}&limit=10`,
				);
				const data = await res.json();
				setEditSuggestions(data.artists || []);
			} catch {
				setEditSuggestions([]);
			} finally {
				setEditSearching(false);
			}
		}, 250);

		return () => {
			if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
		};
	}, [editArtistSearch, editPopoverOpen]);

	const handleEditSave = async (newArtist?: ArtistBrief) => {
		if (!editSlotId || !editPerformance) return;

		const slot = slots.find((s) => s.id === editSlotId);
		if (!slot) return;

		setSaving(true);
		try {
			const updateBody: Record<string, unknown> = {
				stage: editStage,
			};
			if (newArtist) {
				updateBody.artist_id = newArtist.id;
				// Keep the same time_slot_id so times don't change
				updateBody.time_slot_id = editSlotId;
			}

			const res = await fetch(`/api/performances/${editPerformance.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updateBody),
			});

			if (!res.ok) return;

			setSlots((prev) =>
				prev.map((s) =>
					s.id === editSlotId
						? {
								...s,
								performances: (s.performances ?? []).map((p) =>
									p.id === editPerformance.id
										? {
												...p,
												stage: editStage,
												artists: newArtist ? newArtist : p.artists,
												artist_id: newArtist ? newArtist.id : p.artist_id,
											}
										: p,
								),
							}
						: s,
				),
			);

			setEditPopoverOpen(false);
			setEditSlotId(null);
			setEditPerformance(null);
		} catch (error) {
			console.error("Failed to update performance:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleRemovePerformance = async () => {
		if (!editSlotId || !editPerformance) return;

		setSaving(true);
		try {
			await fetch(`/api/performances/${editPerformance.id}`, {
				method: "DELETE",
			});

			setSlots((prev) =>
				prev.map((s) =>
					s.id === editSlotId
						? {
								...s,
								performances: (s.performances ?? []).filter(
									(p) => p.id !== editPerformance!.id,
								),
							}
						: s,
				),
			);

			setEditPopoverOpen(false);
			setEditSlotId(null);
			setEditPerformance(null);
		} catch (error) {
			console.error("Failed to remove performance:", error);
		} finally {
			setSaving(false);
		}
	};

	// ── Drag & Drop ──

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		const perfId = active.id as string;

		// Find the performance by id across all slots
		for (const slot of slots) {
			const perf = (slot.performances ?? []).find((p) => p.id === perfId);
			if (perf) {
				setActiveId(perf.id);
				setActivePerformance(perf);
				return;
			}
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveId(null);
		setActivePerformance(null);

		const { active, over } = event;
		if (!over || !active) return;

		const perfId = active.id as string;
		const targetSlotId = over.id as string;

		if (perfId === targetSlotId) return;

		// Find which slot the performance is currently in
		let sourceSlotId: string | null = null;
		let draggingPerf: PerformanceBrief | null = null;

		for (const slot of slots) {
			const perf = (slot.performances ?? []).find((p) => p.id === perfId);
			if (perf) {
				sourceSlotId = slot.id;
				draggingPerf = perf;
				break;
			}
		}

		if (!sourceSlotId || !draggingPerf) return;

		// Move performance via API (supports multiple performances per slot)
		setSaving(true);
		try {
			const res = await fetch("/api/performances/move", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					performance_id: perfId,
					time_slot_id: targetSlotId,
				}),
			});

			if (!res.ok) return;

			// Update local state: remove from source, append to target
			setSlots((prev) =>
				prev.map((s) => {
					if (s.id === sourceSlotId) {
						return {
							...s,
							performances: (s.performances ?? []).filter(
								(p) => p.id !== perfId,
							),
						};
					}
					if (s.id === targetSlotId) {
						return {
							...s,
							performances: [...(s.performances ?? []), { ...draggingPerf }],
						};
					}
					return s;
				}),
			);
		} catch (error) {
			console.error("Failed to move performance:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleDragOver = (_event: DragOverEvent) => {
		// Visual feedback via activeId state on slot cards
	};

	// ── Render ──

	if (loading) {
		return (
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardHeader>
					<CardTitle>Running Order</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-3">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="h-20 bg-zinc-800 rounded-lg" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg mb-6">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						Running Order
						{saving && (
							<Badge variant="outline" className="text-yellow-400 text-xs">
								Saving...
							</Badge>
						)}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Select
							value={String(slotDuration)}
							onValueChange={(v) => {
								const d = Number(v);
								setSlotDuration(d);
								generateSlots(d, false);
							}}
						>
							<SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-[78px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-zinc-900 border-zinc-800">
								<SelectItem value="15">15 min</SelectItem>
								<SelectItem value="30">30 min</SelectItem>
								<SelectItem value="45">45 min</SelectItem>
								<SelectItem value="60">1 Std</SelectItem>
								<SelectItem value="90">90 min</SelectItem>
								<SelectItem value="120">2 Std</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => generateSlots()}
							disabled={generating}
							className="border-zinc-700 text-xs"
						>
							<RotateCcw
								className={`h-3.5 w-3.5 mr-1.5 ${generating ? "animate-spin" : ""}`}
							/>
							{generating ? "Generating..." : "Regenerate"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleAddSlot}
							disabled={saving}
							className="border-zinc-700 text-xs"
						>
							<Plus className="h-3.5 w-3.5 mr-1.5" />
							Add Slot
						</Button>
						<div className="w-px h-6 bg-zinc-800" />
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowClearAllDialog(true)}
							disabled={
								saving ||
								slots.every((s) => (s.performances ?? []).length === 0)
							}
							className="text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs"
						>
							<Trash2 className="h-3.5 w-3.5 mr-1.5" />
							Clear All
						</Button>
					</div>
				</CardHeader>

				<CardContent>
					{slots.length === 0 ? (
						<div className="text-center py-8 text-zinc-400">
							<p>No time slots configured.</p>
							<p className="text-sm text-zinc-500 mt-1">
								Set door_time and end_time on the event to auto-generate slots.
							</p>
							<Button
								variant="outline"
								className="mt-4 border-zinc-700"
								onClick={handleAddSlot}
							>
								<Plus className="h-4 w-4 mr-2" />
								Add first slot manually
							</Button>
						</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
							onDragOver={handleDragOver}
						>
							<div className="relative">
								{/* Vertical timeline line */}
								<div className="absolute left-[41px] top-0 bottom-0 w-px bg-zinc-800 z-0" />

								<div className="space-y-3 relative z-10">
									{slots.map((slot) => {
										const perfArray = slot.performances ?? [];
										const isActive =
											activeId !== null &&
											perfArray.some((p) => p.id === activeId);

										return (
											<SlotCard
												key={slot.id}
												slot={slot}
												performances={perfArray}
												isDragging={isActive}
												onAssignArtist={openAssignPopover}
												onArtistClick={openEditPopover}
												onEditLabel={handleEditLabel}
												onAdjustDuration={handleAdjustDuration}
												onEditTime={handleEditTime}
												onRemoveSlot={handleRemoveSlot}
											/>
										);
									})}
								</div>
							</div>

							<DragOverlay>
								{activePerformance ? (
									<DragPreview performance={activePerformance} />
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</CardContent>
			</Card>

			{/* Assign Artist Popover */}
			<ArtistSelectPopover
				open={assignPopoverOpen}
				onOpenChange={setAssignPopoverOpen}
				onSelect={handleAssignArtist}
				slotStage={assignStage}
				onStageChange={setAssignStage}
			/>

			{/* Edit Performance Dialog */}
			<Dialog open={editPopoverOpen} onOpenChange={setEditPopoverOpen}>
				<DialogContent className="bg-zinc-900 border-zinc-800 rounded-lg max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Performance</DialogTitle>
					</DialogHeader>

					{/* Artist search */}
					<div className="mb-3">
						<label className="text-xs text-zinc-500 mb-1 block">Artist</label>
						<div className="relative">
							<Input
								value={editArtistSearch}
								onChange={(e) => {
									setEditArtistSearch(e.target.value);
								}}
								placeholder="Search or change artist..."
								className="bg-zinc-800 border-zinc-700 h-9 text-sm"
							/>
							{editSearching && (
								<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-500" />
							)}
						</div>

						{editSuggestions.length > 0 && (
							<div className="border border-zinc-800 rounded-md mt-1 max-h-32 overflow-y-auto">
								{editSuggestions.map((artist) => (
									<button
										key={artist.id}
										onClick={() => {
											setEditArtistSearch(artist.name);
											setEditSuggestions([]);
											handleEditSave(artist);
										}}
										className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 transition-colors text-left"
									>
										<Music className="h-3.5 w-3.5 text-violet-400 shrink-0" />
										<span className="text-sm text-white">{artist.name}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Stage selector */}
					<div className="mb-3">
						<label className="text-xs text-zinc-500 mb-1 block">Stage</label>
						<Select value={editStage} onValueChange={setEditStage}>
							<SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-xs">
								<SelectValue placeholder="Stage" />
							</SelectTrigger>
							<SelectContent className="bg-zinc-900 border-zinc-800">
								<SelectItem value="main">Main Stage</SelectItem>
								<SelectItem value="second">Second Stage</SelectItem>
								<SelectItem value="outdoor">Outdoor</SelectItem>
								<SelectItem value="vip">VIP Area</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={() => handleEditSave()}
							disabled={saving}
							className="bg-violet-600 hover:bg-violet-700 text-xs flex-1"
						>
							{saving ? "Saving..." : "Save"}
						</Button>
						<Button
							size="sm"
							variant="destructive"
							onClick={handleRemovePerformance}
							disabled={saving}
							className="text-xs"
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Slot Confirmation */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
						<AlertDialogDescription>
							Diesen Zeitslot entfernen? Die zugehörige Künstler-Zuordnung wird
							damit ebenfalls aufgehoben.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700">
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmRemoveSlot}
							className="bg-red-600 hover:bg-red-700"
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{/* Clear All Artists Confirmation */}
			<AlertDialog
				open={showClearAllDialog}
				onOpenChange={setShowClearAllDialog}
			>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Running Order leeren</AlertDialogTitle>
						<AlertDialogDescription>
							Alle Künstler aus der Running Order entfernen? Die Zeitslots
							bleiben erhalten, aber alle Zuordnungen werden gelöscht. Diese
							Aktion kann nicht rückgängig gemacht werden.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700">
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleClearAllArtists}
							className="bg-red-600 hover:bg-red-700"
						>
							Alle löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
