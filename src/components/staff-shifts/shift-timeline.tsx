"use client";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	useDraggable,
	useDroppable,
	DragStartEvent,
} from "@dnd-kit/core";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { EmptyState } from "@/components/empty-state";
import type { Shift } from "@/lib/staff-shifts/types";
import { STAFF_ROLES, ROLE_COLORS } from "@/lib/staff-shifts/types";
import {
	formatTime,
	getTimePosition,
	getTimeWidth,
	snapTo15Minutes,
} from "@/lib/staff-shifts/utils";

/* ─────────────── DraggableShiftBar ─────────────── */

function DraggableShiftBar({
	shift,
	onClick,
}: {
	shift: Shift;
	onClick: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: `shift-bar-${shift.id}`,
			data: {
				shiftId: shift.id,
				startTime: shift.start_time,
				endTime: shift.end_time,
			},
		});

	const colorClass = ROLE_COLORS[shift.role] || "bg-zinc-600";
	const left = getTimePosition(shift.start_time);
	const width = getTimeWidth(shift.start_time, shift.end_time);

	const style: React.CSSProperties = {
		left: `${left}%`,
		width: `${width}%`,
		minWidth: "60px",
		transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
		zIndex: isDragging ? 50 : undefined,
		opacity: isDragging ? 0.5 : undefined,
		cursor: "grab",
	};

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className={`absolute h-full ${colorClass} rounded opacity-80 hover:opacity-100 transition-opacity flex items-center px-2`}
			style={style}
			onClick={() => {
				if (!isDragging) onClick();
			}}
		>
			<span className="text-xs text-white truncate">
				{formatTime(shift.start_time)} - {formatTime(shift.end_time)}
			</span>
		</div>
	);
}

/* ─────────────── DroppableTimelineRow ─────────────── */

function DroppableTimelineRow({
	shift,
	children,
}: {
	shift: Shift;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `timeline-row-${shift.id}`,
	});

	return (
		<div
			ref={setNodeRef}
			data-timeline-container
			className={`flex-1 relative h-12 rounded transition-colors ${
				isOver ? "bg-zinc-800" : "bg-zinc-950"
			}`}
		>
			{children}
		</div>
	);
}

/* ─────────────── DragOverlayContent ─────────────── */

function DragOverlayContent({
	shift,
	dragDelta,
}: {
	shift: Shift;
	dragDelta: number;
}) {
	const containerEl = document.querySelector("[data-timeline-container]");
	const containerWidth = containerEl?.clientWidth || 1;
	const deltaMinutes = (dragDelta / containerWidth) * (12 * 60);
	const snappedDelta = Math.round(deltaMinutes / 15) * 15;

	const newStart = snapTo15Minutes(shift.start_time, snappedDelta);
	const newEnd = snapTo15Minutes(shift.end_time, snappedDelta);
	const hasMoved = Math.abs(snappedDelta) >= 15;

	return (
		<div
			className={`h-12 ${ROLE_COLORS[shift.role] || "bg-zinc-600"} rounded opacity-90 flex items-center px-2 shadow-lg border border-white/10`}
			style={{
				width: `${getTimeWidth(shift.start_time, shift.end_time)}%`,
				minWidth: "60px",
			}}
		>
			<div className="flex flex-col leading-tight">
				<span className="text-xs text-white font-medium">
					{hasMoved ? (
						<>
							<span className="line-through opacity-50 mr-1">
								{formatTime(shift.start_time)}
							</span>
							<span className="text-violet-300">{formatTime(newStart)}</span>
						</>
					) : (
						formatTime(shift.start_time)
					)}
					{" - "}
					{hasMoved ? (
						<>
							<span className="line-through opacity-50 mr-1">
								{formatTime(shift.end_time)}
							</span>
							<span className="text-violet-300">{formatTime(newEnd)}</span>
						</>
					) : (
						formatTime(shift.end_time)
					)}
				</span>
				{hasMoved && (
					<span className="text-[10px] text-violet-300/70 mt-0.5">
						↕ {Math.round(snappedDelta)} Min.
					</span>
				)}
			</div>
		</div>
	);
}

/* ─────────────── Legend ─────────────── */

function RoleLegend() {
	return (
		<div className="mt-6 pt-4 border-t border-zinc-800">
			<p className="text-sm text-zinc-400 mb-2">Role Colors</p>
			<div className="flex flex-wrap gap-2">
				{Object.entries(ROLE_COLORS).map(([role, colorClass]) => (
					<div key={role} className="flex items-center gap-1">
						<div className={`w-3 h-3 rounded ${colorClass}`} />
						<span className="text-xs text-zinc-400">{role}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/* ─────────────── ShiftTimeline (main export) ─────────────── */

export type { Shift };

interface ShiftTimelineProps {
	shifts: Shift[];
	filteredShifts: Shift[];
	shiftSearch: string;
	onShiftSearchChange: (value: string) => void;
	roleFilter: string;
	onRoleFilterChange: (value: string) => void;
	savingIndicator: string | null;
	onEditShift: (shift: Shift) => void;
	onDeleteClick: (shift: Shift) => void;
	onDragEnd: (event: DragEndEvent) => void;
	onDragStart: (event: DragStartEvent) => void;
	onDragMove: (event: { delta: { x: number } }) => void;
	activeDragShift: Shift | null;
	dragDelta: number;
}

export function ShiftTimeline({
	shifts,
	filteredShifts,
	shiftSearch,
	onShiftSearchChange,
	roleFilter,
	onRoleFilterChange,
	savingIndicator,
	onEditShift,
	onDeleteClick,
	onDragEnd,
	onDragStart,
	onDragMove,
	activeDragShift,
	dragDelta,
}: ShiftTimelineProps) {
	// Generate timeline hours (18:00 to 06:00)
	const timelineHours = [];
	for (let i = 18; i < 24; i++) {
		timelineHours.push(`${i}:00`);
	}
	for (let i = 0; i < 6; i++) {
		timelineHours.push(`${i.toString().padStart(2, "0")}:00`);
	}

	return (
		<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
			<CardHeader>
				<CardTitle className="text-white flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Timeline View
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Search / Filter */}
				<div className="max-w-sm mb-4">
					<SearchFilterBar
						placeholder="Search staff..."
						searchValue={shiftSearch}
						onSearchChange={onShiftSearchChange}
						filters={[
							{
								key: "role",
								label: "All Roles",
								options: [
									{ value: "all", label: "All Roles" },
									...STAFF_ROLES.map((role) => ({
										value: role,
										label: role,
									})),
								],
								value: roleFilter,
								onChange: onRoleFilterChange,
							},
						]}
					/>
				</div>

				{/* Timeline Header */}
				<div className="flex items-center mb-4">
					<div className="w-48 flex-shrink-0 pr-4" />
					<div className="flex-1 relative h-8">
						{timelineHours.map((hour, i) => (
							<div
								key={hour}
								className="absolute text-xs text-zinc-500"
								style={{ left: `${(i / 12) * 100}%` }}
							>
								{hour}
							</div>
						))}
					</div>
				</div>

				{/* Shift Bars */}
				<DndContext
					onDragEnd={onDragEnd}
					onDragStart={onDragStart}
					onDragMove={onDragMove}
				>
					{filteredShifts.length === 0 ? (
						<EmptyState
							icon={Clock}
							title={
								roleFilter !== "all"
									? `Keine Schichten mit Rolle "${roleFilter}"`
									: "Keine Schichten geplant"
							}
							description="Füge eine Schicht für dieses Event hinzu"
							className="py-8"
						/>
					) : (
						<div className="space-y-2">
							{filteredShifts.map((shift) => (
								<div key={shift.id} className="flex items-center group">
									<div className="w-48 flex-shrink-0 pr-4">
										<p className="text-sm text-white truncate">
											{shift.staff?.profiles?.full_name || "Unknown"}
										</p>
										<p className="text-xs text-zinc-400">{shift.role}</p>
									</div>
									<DroppableTimelineRow shift={shift}>
										<DraggableShiftBar
											shift={shift}
											onClick={() => onEditShift(shift)}
										/>
										{savingIndicator === shift.id && (
											<div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 rounded z-40">
												<Loader2 className="h-4 w-4 animate-spin text-violet-400" />
												<span className="text-xs text-violet-400 ml-2">Saving...</span>
											</div>
										)}
									</DroppableTimelineRow>
									<Button
										variant="ghost"
										size="icon"
										className="ml-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-600/10 flex-shrink-0"
										onClick={() => onDeleteClick(shift)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					)}

					{/* Drag Overlay */}
					<DragOverlay>
						{activeDragShift ? (
							<DragOverlayContent shift={activeDragShift} dragDelta={dragDelta} />
						) : null}
					</DragOverlay>
				</DndContext>

				{/* Role Legend */}
				<RoleLegend />
			</CardContent>
		</Card>
	);
}
