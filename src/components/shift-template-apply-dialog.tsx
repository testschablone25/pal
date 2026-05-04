"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Puzzle, Check } from "lucide-react";
import {
	SHIFT_TEMPLATES,
	groupTemplatesByRole,
	calculateTemplateTimes,
	type ShiftTemplate,
} from "@/lib/shift-templates";

interface StaffMember {
	id: string;
	role: string;
	contract_type: string;
	profiles?: {
		full_name: string | null;
	} | null;
}

interface ShiftTemplateApplyDialogProps {
	eventId: string;
	eventDate: string;
	doorTime: string | null;
	staff: StaffMember[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApplied: () => void;
}

function formatTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

export function ShiftTemplateApplyDialog({
	eventId,
	eventDate,
	doorTime,
	staff,
	open,
	onOpenChange,
	onApplied,
}: ShiftTemplateApplyDialogProps) {
	const [applying, setApplying] = useState(false);
	const [appliedTemplates, setAppliedTemplates] = useState<Set<string>>(
		new Set(),
	);

	const templateGroups = groupTemplatesByRole(SHIFT_TEMPLATES);

	const getStaffByRole = (role: string): StaffMember[] => {
		return staff.filter((s) => s.role === role);
	};

	const applySingleTemplate = async (
		template: ShiftTemplate,
	): Promise<void> => {
		const { start_time, end_time } = calculateTemplateTimes(
			template,
			eventDate,
			doorTime!,
		);

		const roleStaff = getStaffByRole(template.role);
		if (roleStaff.length === 0) return;

		const shifts = roleStaff.map((s) => ({
			staff_id: s.id,
			role: template.role,
			start_time,
			end_time,
			break_minutes: template.breakMinutes,
		}));

		const response = await fetch("/api/shifts/bulk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ event_id: eventId, shifts }),
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error || "Failed to apply template");
		}
	};

	const applyTemplate = async (template: ShiftTemplate) => {
		if (!doorTime) return;

		setApplying(true);
		try {
			await applySingleTemplate(template);
			setAppliedTemplates((prev) => new Set(prev).add(template.id));
		} catch (error) {
			console.error("Error applying template:", error);
		} finally {
			setApplying(false);
		}
	};

	const applyAllTemplates = async () => {
		if (!doorTime) return;

		setApplying(true);
		try {
			for (const [, templates] of templateGroups) {
				for (const template of templates) {
					await applySingleTemplate(template);
				}
			}

			setAppliedTemplates(new Set(SHIFT_TEMPLATES.map((t) => t.id)));
		} catch (error) {
			console.error("Error applying all templates:", error);
		} finally {
			setApplying(false);
		}
	};

	const handleClose = () => {
		if (appliedTemplates.size > 0) {
			onApplied();
		}
		setAppliedTemplates(new Set());
		onOpenChange(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					if (appliedTemplates.size > 0) {
						onApplied();
					}
					setAppliedTemplates(new Set());
				}
				onOpenChange(newOpen);
			}}
		>
			<DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-white">
						Apply Shift Templates
					</DialogTitle>
					<DialogDescription className="text-zinc-400">
						Apply templates to generate shifts for all staff matching the
						template&apos;s role
					</DialogDescription>
				</DialogHeader>

				{!doorTime ? (
					<div className="text-center py-8 text-amber-400 bg-amber-600/10 rounded-lg border border-amber-600/20">
						Event must have a door time set before applying templates
					</div>
				) : (
					<>
						{/* Apply All button */}
						<div className="flex justify-end">
							<Button
								onClick={applyAllTemplates}
								disabled={applying}
								variant="outline"
								className="border-violet-600/50 text-violet-400 hover:bg-violet-600/10 hover:text-violet-300"
							>
								{applying ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Puzzle className="h-4 w-4 mr-2" />
								)}
								Apply All Templates
							</Button>
						</div>

						{/* Templates grouped by role */}
						<div className="space-y-6">
							{Array.from(templateGroups.entries()).map(([role, templates]) => {
								const roleStaff = getStaffByRole(role);
								return (
									<div key={role} className="space-y-2">
										<div className="flex items-center gap-2">
											<Badge className="bg-zinc-700 text-zinc-300 border-zinc-600">
												{role}
											</Badge>
											<span className="text-xs text-zinc-500">
												{roleStaff.length} staff available
											</span>
										</div>
										<div className="space-y-2 pl-2">
											{templates.map((template) => {
												const times = doorTime
													? calculateTemplateTimes(
															template,
															eventDate,
															doorTime,
														)
													: null;
												const isApplied = appliedTemplates.has(template.id);
												const hasStaff = roleStaff.length > 0;

												return (
													<div
														key={template.id}
														className={`p-3 rounded-lg border transition-colors ${
															isApplied
																? "bg-emerald-600/10 border-emerald-600/30"
																: "bg-zinc-950 border-zinc-800"
														}`}
													>
														<div className="flex items-start justify-between gap-3">
															<div className="flex-1">
																<div className="flex items-center gap-2">
																	<p className="text-sm font-medium text-white">
																		{template.name}
																	</p>
																	{isApplied && (
																		<Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/50 text-xs">
																			<Check className="h-3 w-3 mr-1" />
																			Applied
																		</Badge>
																	)}
																</div>
																<p className="text-xs text-zinc-500">
																	{template.description}
																</p>
																{times && (
																	<p className="text-xs text-zinc-500 mt-1">
																		{formatTime(times.start_time)} -{" "}
																		{formatTime(times.end_time)} (
																		{template.durationMinutes}min
																		{template.breakMinutes > 0 &&
																			`, ${template.breakMinutes}min break`}
																		)
																	</p>
																)}
															</div>
															<Button
																size="sm"
																onClick={() => applyTemplate(template)}
																disabled={applying || !hasStaff || isApplied}
																className={
																	isApplied
																		? "bg-emerald-600/30 text-emerald-400 cursor-default"
																		: "bg-violet-600 hover:bg-violet-700"
																}
															>
																{applying ? (
																	<Loader2 className="h-3 w-3 animate-spin" />
																) : isApplied ? (
																	"Applied"
																) : !hasStaff ? (
																	"No Staff"
																) : (
																	"Apply"
																)}
															</Button>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleClose}
						className="border-zinc-700"
					>
						{appliedTemplates.size > 0 ? "Done" : "Cancel"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
