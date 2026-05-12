"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandEmpty,
	CommandGroup,
	CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
	Calendar,
	Upload,
	Loader2,
	Check,
	ChevronsUpDown,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

// Task schema (shared)
const itemEntrySchema = z.object({
	item_id: z.string(),
	goal_sub_location_id: z.string().nullable().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const taskSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	status: z.enum([
		"todo",
		"in_progress",
		"pending_approval",
		"done",
		"cancelled",
	]),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	assignee_id: z.string().optional(),
	assignee_ids: z.array(z.string()).default([]),
	event_id: z.string().optional(),
	due_date: z.string().optional(),
	needs_approval: z.boolean().default(false),
	items: z.array(itemEntrySchema).default([]),
	created_by: z.string().optional(),
	parent_task_id: z.string().nullable().optional(),
	task_type: z.string().nullable().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Profile {
	id: string;
	full_name: string | null;
	email: string | null;
}

interface Event {
	id: string;
	name: string;
	date: string;
}

const PRIORITIES = [
	{ value: "low", label: "Low", color: "bg-zinc-500" },
	{ value: "medium", label: "Medium", color: "bg-blue-500" },
	{ value: "high", label: "High", color: "bg-orange-500" },
	{ value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const STATUS_OPTIONS = [
	{ value: "todo", label: "To Do" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "pending_approval", label: "Pending Approval" },
	{ value: "done", label: "Done" },
	{ value: "cancelled", label: "Cancelled" },
];

interface TaskFormFieldsProps {
	form: UseFormReturn<TaskFormValues>;
	profiles: Profile[];
	events: Event[];
	taskId?: string;
	uploading?: boolean;
	onUploadingChange?: (uploading: boolean) => void;
	pendingFiles?: File[];
	onPendingFilesChange?: (files: File[]) => void;
}

export function TaskFormFields({
	form,
	profiles,
	events,
	taskId,
	uploading,
	onUploadingChange,
	pendingFiles,
	onPendingFilesChange,
}: TaskFormFieldsProps) {
	const [dragOver, setDragOver] = useState(false);
	const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = (
		file: File,
		onChange: (val: string) => void,
		currentValue?: string,
	) => {
		const allowedTypes = ["image/", "video/"];
		const isAllowed = allowedTypes.some((t) => file.type.startsWith(t));
		if (!isAllowed) return;

		// In create mode (no taskId), queue files to be uploaded after creation
		if (!taskId) {
			if (onPendingFilesChange) {
				onPendingFilesChange([...(pendingFiles || []), file]);
			}
			return;
		}

		// In edit mode, upload immediately
		if (!onUploadingChange) return;
		onUploadingChange(true);
		try {
			const formData = new FormData();
			formData.append("file", file);

			fetch(`/api/tasks/${taskId}/attachments`, {
				method: "POST",
				body: formData,
			})
				.then((r) => r.json())
				.then((attachment) => {
					const markdown = `![${attachment.name}](${attachment.url})`;
					const newDesc = currentValue
						? `${currentValue}\n\n${markdown}`
						: markdown;
					onChange(newDesc);
				})
				.catch((err) => console.error("File upload failed:", err))
				.finally(() => onUploadingChange(false));
		} catch (err) {
			console.error("File upload failed:", err);
			onUploadingChange(false);
		}
	};

	return (
		<>
			{/* Title */}
			<FormField
				control={form.control}
				name="title"
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-xs font-medium text-zinc-400">
							Title *
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								placeholder="Task title"
								className="bg-zinc-950 border-zinc-800 h-9 text-sm"
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Description + File Upload */}
			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-xs font-medium text-zinc-400">
							Description
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Task description"
								className="bg-zinc-950 border-zinc-800 min-h-[100px] text-sm"
							/>
						</FormControl>
						{/* File Upload Zone — shown in both create and edit modes */}
						<div className="mt-2">
							<div
								onDragOver={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOver(true);
								}}
								onDragLeave={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOver(false);
								}}
								onDrop={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOver(false);
									const files = Array.from(e.dataTransfer.files);
									files.forEach((f) =>
										handleFileUpload(f, field.onChange, field.value),
									);
								}}
								onClick={() => fileInputRef.current?.click()}
								className={cn(
									"border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
									dragOver
										? "border-violet-500 bg-violet-500/10"
										: "border-zinc-700 hover:border-zinc-600 bg-zinc-950",
								)}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*,video/*"
									className="hidden"
									onChange={(e) => {
										const files = Array.from(e.target.files || []);
										files.forEach((f) =>
											handleFileUpload(f, field.onChange, field.value),
										);
										e.target.value = "";
									}}
								/>
								{uploading ? (
									<div className="flex items-center justify-center gap-2 text-zinc-400">
										<Loader2 className="h-4 w-4 animate-spin" />
										<span className="text-xs">Uploading...</span>
									</div>
								) : (
									<div className="flex flex-col items-center gap-1">
										<Upload className="h-5 w-5 text-zinc-500" />
										<span className="text-xs text-zinc-500">
											{taskId
												? "Drop images/videos or click to upload"
												: "Select images/videos (uploaded after saving)"}
										</span>
									</div>
								)}
							</div>
							{/* Pending files indicator in create mode */}
							{!taskId && pendingFiles && pendingFiles.length > 0 && (
								<div className="mt-1.5 flex flex-wrap gap-1.5">
									{pendingFiles.map((f, i) => (
										<Badge
											key={i}
											variant="outline"
											className="border-amber-600/50 text-amber-400 text-xs gap-1"
										>
											📎 {f.name}
											<button
												type="button"
												onClick={() => {
													if (onPendingFilesChange) {
														onPendingFilesChange(
															pendingFiles.filter((_, j) => j !== i),
														);
													}
												}}
												className="ml-1 hover:text-zinc-100"
											>
												<X className="h-2.5 w-2.5" />
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Row: Status / Priority */}
			<div className="grid grid-cols-2 gap-3">
				<FormField
					control={form.control}
					name="status"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">
								Status
							</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue>
											{
												STATUS_OPTIONS.find((s) => s.value === field.value)
													?.label
											}
										</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{STATUS_OPTIONS.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="priority"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">
								Priority
							</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue>
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"w-2 h-2 rounded-full",
														PRIORITIES.find((p) => p.value === field.value)
															?.color,
													)}
												/>
												<span>
													{
														PRIORITIES.find((p) => p.value === field.value)
															?.label
													}
												</span>
											</div>
										</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{PRIORITIES.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											<div className="flex items-center gap-2">
												<div className={cn("w-2 h-2 rounded-full", p.color)} />
												<span>{p.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			{/* Row: Assignee (multi-select) / Due Date */}
			<div className="grid grid-cols-2 gap-3">
				<FormField
					control={form.control}
					name="assignee_ids"
					render={({ field }) => {
						const selectedProfiles = profiles.filter((p) =>
							field.value?.includes(p.id),
						);

						return (
							<FormItem>
								<FormLabel className="text-xs font-medium text-zinc-400">
									Assignees
								</FormLabel>
								<Popover
									open={assigneePopoverOpen}
									onOpenChange={setAssigneePopoverOpen}
								>
									<PopoverTrigger asChild>
										<FormControl>
											<button
												type="button"
												className="flex w-full items-center justify-between bg-zinc-950 border border-zinc-800 h-9 px-3 text-sm rounded-md text-zinc-300 hover:border-zinc-700 transition-colors"
											>
												{selectedProfiles.length > 0 ? (
													<span className="truncate">
														{selectedProfiles
															.map((p) => p.full_name || p.email || "Unknown")
															.join(", ")}
													</span>
												) : (
													<span className="text-zinc-500">
														Select assignees...
													</span>
												)}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-800">
										<Command>
											<CommandInput
												placeholder="Search profiles..."
												className="border-zinc-700"
											/>
											<CommandList>
												<CommandEmpty>No profiles found.</CommandEmpty>
												<CommandGroup>
													{profiles
														.filter((p) => p.id)
														.map((profile) => {
															const isSelected = field.value?.includes(
																profile.id,
															);
															return (
																<CommandItem
																	key={profile.id}
																	value={profile.id}
																	onSelect={() => {
																		const current = field.value || [];
																		if (isSelected) {
																			field.onChange(
																				current.filter(
																					(id) => id !== profile.id,
																				),
																			);
																		} else {
																			field.onChange([...current, profile.id]);
																		}
																	}}
																	className="text-sm"
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4 shrink-0",
																			isSelected ? "opacity-100" : "opacity-0",
																		)}
																	/>
																	{profile.full_name ||
																		profile.email ||
																		"Unknown"}
																</CommandItem>
															);
														})}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>

								{/* Selected assignee badges */}
								{selectedProfiles.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-1.5">
										{selectedProfiles.map((p) => (
											<Badge
												key={p.id}
												variant="outline"
												className="border-zinc-700 text-zinc-300 text-xs gap-1 pr-1"
											>
												{p.full_name || p.email || "Unknown"}
												<button
													type="button"
													onClick={() => {
														field.onChange(
															(field.value || []).filter((id) => id !== p.id),
														);
													}}
													className="ml-1 hover:text-zinc-100 transition-colors"
												>
													<X className="h-2.5 w-2.5" />
												</button>
											</Badge>
										))}
									</div>
								)}

								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<FormField
					control={form.control}
					name="due_date"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">
								Due Date
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
									<Input
										type="date"
										{...field}
										className="bg-zinc-950 border-zinc-800 h-9 text-sm pl-8"
									/>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			{/* Row: Event / Type / Needs Approval */}
			<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
				<FormField
					control={form.control}
					name="event_id"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">
								Event
							</FormLabel>
							<Select
								onValueChange={(val) =>
									field.onChange(val === "_none" ? "" : val)
								}
								value={field.value || "_none"}
							>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue placeholder="No event" />
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									<SelectItem value="_none" className="text-zinc-500">
										No event
									</SelectItem>
									{events
										.filter((e) => e.id)
										.map((event) => (
											<SelectItem key={event.id} value={event.id}>
												{event.name} (
												{new Date(event.date).toLocaleDateString()})
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			{/* Needs Approval */}
			<FormField
				control={form.control}
				name="needs_approval"
				render={({ field }) => (
					<FormItem className="flex items-center gap-2">
						<FormControl>
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
								className="border-zinc-700 h-4 w-4"
							/>
						</FormControl>
						<FormLabel className="!mt-0 cursor-pointer text-xs text-zinc-400">
							Approval required
						</FormLabel>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
