"use client";

import { useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Clock, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { EmptyState } from "@/components/empty-state";
import type { Shift } from "@/lib/staff-shifts/types";
import { STAFF_ROLES, ROLE_COLORS } from "@/lib/staff-shifts/types";
import { useTimelineDnd } from "./use-timeline-dnd";
import { TimelineHeader } from "./timeline-header";
import { TimelineRow } from "./timeline-row";
import { ShiftBlock } from "./shift-block";
import {
	getBoundsFromShifts,
	getTimeWidthPx,
	getTimelineInnerWidth,
	formatTime,
	snapTo15Minutes,
	DEFAULT_PX_PER_HOUR,
	MIN_PX_PER_HOUR,
	MAX_PX_PER_HOUR,
	type TimelineBounds,
} from "./timeline-utils";

interface ShiftTimelineProps {
	shifts: Shift[];
	doorTime: string | null;
	endTime: string | null;
	searchValue: string;
	onSearchChange: (value: string) => void;
	roleFilter: string;
	onRoleFilterChange: (value: string) => void;
	onEditShift: (shift: Shift) => void;
	onDeleteShift: (shift: Shift) => void;
	onShiftMoved?: (
		shiftId: string,
		newStartTime: string,
		newEndTime: string,
	) => Promise<void>;
}

function DragOverlayContent({
	shift,
	dragDelta,
	bounds,
	pixelsPerHour,
}: {
	shift: Shift;
	dragDelta: number;
	bounds: TimelineBounds;
	pixelsPerHour: number;
}) {
	const pxPerMinute = pixelsPerHour / 60;
	const deltaMinutes = dragDelta / pxPerMinute;
	const snappedDelta = Math.round(deltaMinutes / 15) * 15;

	const newStart = snapTo15Minutes(shift.start_time, snappedDelta);
	const newEnd = snapTo15Minutes(shift.end_time, snappedDelta);
	const hasMoved = Math.abs(snappedDelta) >= 15;
	const overlayWidth = getTimeWidthPx(
		shift.start_time,
		shift.end_time,
		bounds,
		pixelsPerHour,
	);

	return (
		<div
			className={`h-10 rounded opacity-90 flex items-center px-2 shadow-lg border border-white/10`}
			style={{
				width: `${Math.max(overlayWidth, 60)}px`,
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

export function ShiftTimeline({
	shifts,
	doorTime,
	endTime,
	searchValue,
	onSearchChange,
	roleFilter,
	onRoleFilterChange,
	onEditShift,
	onDeleteShift,
	onShiftMoved,
}: ShiftTimelineProps) {
	// Compute timeline bounds from the union of event hours + actual shift spread
	const bounds = getBoundsFromShifts(doorTime, endTime, shifts);
	const filteredShifts = shifts.filter((s) => {
		const matchesRole = roleFilter === "all" || s.role === roleFilter;
		return matchesRole;
	});

	// Zoom state
	const [pixelsPerHour, setPixelsPerHour] = useState(DEFAULT_PX_PER_HOUR);
	const innerWidth = getTimelineInnerWidth(bounds, pixelsPerHour);

	const zoomIn = () =>
		setPixelsPerHour((p) => Math.min(p * 1.25, MAX_PX_PER_HOUR));
	const zoomOut = () =>
		setPixelsPerHour((p) => Math.max(p / 1.25, MIN_PX_PER_HOUR));
	const zoomReset = () => setPixelsPerHour(DEFAULT_PX_PER_HOUR);
	const zoomPercent = Math.round((pixelsPerHour / DEFAULT_PX_PER_HOUR) * 100);

	const {
		activeDragShift,
		dragDelta,
		savingIndicator,
		sensors,
		handleDragStart,
		handleDragMove,
		handleDragEnd,
	} = useTimelineDnd(shifts, { onShiftMoved });

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
						searchValue={searchValue}
						onSearchChange={onSearchChange}
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

				{/* Zoom controls */}
				<div className="flex items-center gap-2 mb-3">
					<button
						onClick={zoomOut}
						disabled={pixelsPerHour <= MIN_PX_PER_HOUR}
						className="inline-flex items-center justify-center w-7 h-7 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Zoom out"
					>
						<ZoomOut className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={zoomReset}
						className="inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
						title="Reset zoom"
					>
						{zoomPercent}%
					</button>
					<button
						onClick={zoomIn}
						disabled={pixelsPerHour >= MAX_PX_PER_HOUR}
						className="inline-flex items-center justify-center w-7 h-7 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Zoom in"
					>
						<ZoomIn className="h-3.5 w-3.5" />
					</button>
					<span className="text-[11px] text-zinc-600 ml-auto">
						{bounds.totalMinutes >= 60
							? `${Math.round(bounds.totalMinutes / 60)}h ${bounds.totalMinutes % 60 > 0 ? `${bounds.totalMinutes % 60}m ` : ""}span`
							: `${bounds.totalMinutes}m span`}
					</span>
				</div>

				{/* Unified scrollable timeline */}
				<DndContext
					sensors={sensors}
					onDragEnd={handleDragEnd}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
				>
					<div className="flex">
						{/* Fixed left column: staff labels */}
						<div className="w-48 flex-shrink-0">
							<div className="h-6 mb-0 flex items-end pb-0.5">
								<span className="text-xs text-zinc-500">Staff</span>
							</div>
							{filteredShifts.length === 0 ? null : (
								<div className="space-y-1">
									{filteredShifts.map((shift) => (
										<div key={shift.id} className="h-10 flex items-center">
											<p
												className="text-sm text-white truncate pr-2"
												title={shift.staff?.profiles?.full_name || "Unknown"}
											>
												{shift.staff?.profiles?.full_name || "Unknown"}
											</p>
											{shift.role && (
												<p className="text-[10px] text-zinc-500">
													{shift.role}
												</p>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						{/* Scrollable right column: timeline */}
						<div className="overflow-x-auto flex-1" data-timeline-scroll>
							<div
								className="relative"
								style={{
									width: `${Math.max(innerWidth, 100)}px`,
									minWidth: "100%",
								}}
							>
								<TimelineHeader bounds={bounds} pixelsPerHour={pixelsPerHour} />

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
									<div className="space-y-1">
										{filteredShifts.map((shift) => (
											<TimelineRow
												key={shift.id}
												id={shift.id}
												bounds={bounds}
												pixelsPerHour={pixelsPerHour}
											>
												<ShiftBlock
													shift={shift}
													bounds={bounds}
													pixelsPerHour={pixelsPerHour}
													saving={savingIndicator === shift.id}
													onClick={() => onEditShift(shift)}
													onDelete={() => onDeleteShift(shift)}
												/>
											</TimelineRow>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Drag Overlay */}
					<DragOverlay>
						{activeDragShift ? (
							<DragOverlayContent
								shift={activeDragShift}
								dragDelta={dragDelta}
								bounds={bounds}
								pixelsPerHour={pixelsPerHour}
							/>
						) : null}
					</DragOverlay>
				</DndContext>

				{/* Role Legend */}
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
			</CardContent>
		</Card>
	);
}
