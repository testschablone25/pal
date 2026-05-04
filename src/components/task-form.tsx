"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
	Form,
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
import { Separator } from "@/components/ui/separator";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import { TASK_TYPES } from "@/lib/i18n";
import {
	Loader2,
	Check,
	ChevronsUpDown,
	ChevronDown,
	ChevronRight,
	X,
	MapPin,
	CornerDownRight,
	Info,
	Calendar,
	Flag,
} from "lucide-react";

// Schema for structured items with goal location
const itemEntrySchema = z.object({
	item_id: z.string(),
	goal_sub_location_id: z.string().nullable().optional(),
});

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
	event_id: z.string().optional(),
	due_date: z.string().optional(),
	scheduled_date: z.string().optional(),
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

interface InventoryItem {
	id: string;
	name: string;
	category: string;
}

interface Venue {
	id: string;
	name: string;
	sub_locations?: { id: string; name: string }[];
}

interface TaskFormProps {
	task?: {
		id: string;
		title: string;
		description: string | null;
		status: string;
		priority: string;
		assignee_id: string | null;
		event_id: string | null;
		due_date: string | null;
		scheduled_date: string | null;
		needs_approval: boolean;
		items?: { item_id: string; goal_sub_location_id: string | null }[];
		item_ids?: string[];
		parent_task_id?: string | null;
		task_type?: string | null;
	};
	mode?: "create" | "edit";
	parentTask?: {
		event_id?: string | null;
		priority?: string;
		assignee_id?: string | null;
	};
	onSubmit: (values: TaskFormValues) => Promise<void>;
	onCancel?: () => void;
}

const PRIORITIES = [
	{ value: "low", label: "Low", color: "bg-zinc-500" },
	{ value: "medium", label: "Medium", color: "bg-blue-500" },
	{ value: "high", label: "High", color: "bg-orange-500" },
	{ value: "urgent", label: "Urgent", color: "bg-red-500" },
];

// Section header component
function SectionHeader({
	icon: Icon,
	title,
	className,
}: {
	icon?: React.ComponentType<{ className?: string }>;
	title: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-2 mb-3", className)}>
			{Icon && <Icon className="h-4 w-4 text-zinc-500" />}
			<h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
				{title}
			</h3>
		</div>
	);
}

export function TaskForm({
	task,
	mode = "create",
	parentTask,
	onSubmit,
	onCancel,
}: TaskFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [itemsOpen, setItemsOpen] = useState(false);
	const [parentTasksOpen, setParentTasksOpen] = useState(false);
	const [parentTasks, setParentTasks] = useState<
		{
			id: string;
			title: string;
			status: string;
			event?: { name: string } | null;
		}[]
	>([]);
	const [venues, setVenues] = useState<Venue[]>([]);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [goalLocationSelections, setGoalLocationSelections] = useState<
		Record<string, { venueId: string; subLocationId: string }>
	>({});

	// Convert legacy item_ids to structured items format
	const defaultItems =
		task?.items ||
		(task?.item_ids
			? task.item_ids.map((id: string) => ({
					item_id: id,
					goal_sub_location_id: null,
				}))
			: []);

	// Pre-populate goal location selections from existing task items
	useEffect(() => {
		if (task?.items) {
			const selections: Record<
				string,
				{ venueId: string; subLocationId: string }
			> = {};
			for (const entry of task.items) {
				if (entry.goal_sub_location_id) {
					selections[entry.item_id] = {
						venueId: "",
						subLocationId: entry.goal_sub_location_id,
					};
				}
			}
			setGoalLocationSelections(selections);
		}
	}, [task]);

	// Resolve parent task defaults
	const defaultEventId = task?.event_id || parentTask?.event_id || "";
	const defaultPriority =
		(task?.priority as TaskFormValues["priority"]) ||
		(parentTask?.priority as TaskFormValues["priority"]) ||
		"medium";
	const defaultAssigneeId = task?.assignee_id || parentTask?.assignee_id || "";

	const form = useForm<TaskFormValues>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(taskSchema) as any,
		defaultValues: {
			title: task?.title || "",
			description: task?.description || "",
			status: (task?.status as TaskFormValues["status"]) || "todo",
			priority: defaultPriority,
			assignee_id: defaultAssigneeId || "",
			event_id: defaultEventId || "",
			due_date: task?.due_date || "",
			scheduled_date: task?.scheduled_date || "",
			needs_approval: task?.needs_approval || false,
			task_type: task?.task_type || null,
			items: defaultItems,
			created_by: "",
			parent_task_id: task?.parent_task_id || null,
		},
	});

	const watchedItems = form.watch("items");
	const selectedItemIds = useMemo(
		() => watchedItems?.map((i) => i.item_id) || [],
		[watchedItems],
	);
	const selectedTaskType = form.watch("task_type");

	// Open advanced section if there's data in parent or inventory fields
	useEffect(() => {
		if (
			task?.parent_task_id ||
			(task?.items && task.items.length > 0) ||
			task?.task_type
		) {
			setAdvancedOpen(true);
		}
	}, [task]);

	useEffect(() => {
		fetchUser();
		fetchProfiles();
		fetchEvents();
		fetchItems();
		fetchVenues();
		fetchParentTasks();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchUser = async () => {
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				form.setValue("created_by", user.id);
			}
		} catch (error) {
			console.error("Failed to fetch current user:", error);
		}
	};

	const fetchProfiles = async () => {
		try {
			const response = await fetch("/api/staff");
			const data = await response.json();
			const staffProfiles = (data.staff || [])
				.filter((s: { profiles: Profile | null }) => s.profiles)
				.map((s: { profiles: Profile }) => s.profiles);
			setProfiles(staffProfiles);
		} catch (error) {
			console.error("Failed to fetch profiles:", error);
		}
	};

	const fetchEvents = async () => {
		try {
			const response = await fetch("/api/events");
			const data = await response.json();
			const today = new Date().toISOString().split("T")[0];
			const futureEvents = (data.events || []).filter(
				(e: Event) => e.date >= today,
			);
			setEvents(futureEvents);
		} catch (error) {
			console.error("Failed to fetch events:", error);
		}
	};

	const fetchItems = async () => {
		try {
			const response = await fetch("/api/items");
			const data = await response.json();
			setItems(data.items || []);
		} catch (error) {
			console.error("Failed to fetch items:", error);
		}
	};

	const fetchParentTasks = async () => {
		try {
			const response = await fetch("/api/tasks?no_parent=true&limit=200");
			const data = await response.json();
			setParentTasks(data.tasks || []);
		} catch (error) {
			console.error("Failed to fetch parent tasks:", error);
		}
	};

	const fetchVenues = async () => {
		try {
			const response = await fetch("/api/venues");
			const data = await response.json();
			setVenues(data.venues || []);
		} catch (error) {
			console.error("Failed to fetch venues:", error);
		}
	};

	const handleToggleItem = (itemId: string) => {
		const current = form.getValues("items") || [];
		const exists = current.find((i) => i.item_id === itemId);

		if (exists) {
			form.setValue(
				"items",
				current.filter((i) => i.item_id !== itemId),
			);
			setGoalLocationSelections((prev) => {
				const next = { ...prev };
				delete next[itemId];
				return next;
			});
		} else {
			form.setValue("items", [
				...current,
				{ item_id: itemId, goal_sub_location_id: null },
			]);
		}
	};

	const handleSetGoalLocation = (
		itemId: string,
		venueId: string,
		subLocationId: string,
	) => {
		const current = form.getValues("items") || [];
		const updated = current.map((i) =>
			i.item_id === itemId
				? {
						...i,
						goal_sub_location_id:
							subLocationId === "none" ? null : subLocationId,
					}
				: i,
		);
		form.setValue("items", updated);

		setGoalLocationSelections((prev) => ({
			...prev,
			[itemId]: { venueId, subLocationId },
		}));
	};

	const handleSubmit = async (values: TaskFormValues) => {
		setLoading(true);
		setError(null);

		try {
			await onSubmit(values);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const selectedItems = useMemo(
		() => items.filter((item) => selectedItemIds.includes(item.id)),
		[items, selectedItemIds],
	);

	const currentPriority = form.watch("priority");
	const currentPriorityColor =
		PRIORITIES.find((p) => p.value === currentPriority)?.color || "bg-zinc-500";

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
				{/* ========== BASIC INFO ========== */}
				<div className="space-y-4">
					<SectionHeader icon={Info} title="Basic Info" />

					{/* Title */}
					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Title <span className="text-red-400">*</span>
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="e.g. Set up main stage PA system"
										className="bg-zinc-950 border-zinc-800 h-10"
										autoFocus
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Task Type — inline toggle pills */}
					<FormField
						control={form.control}
						name="task_type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Type</FormLabel>
								<FormControl>
									<div className="flex flex-wrap gap-1.5">
										<button
											type="button"
											onClick={() => field.onChange(null)}
											className={cn(
												"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
												!selectedTaskType
													? "bg-violet-600/20 text-violet-400 border-violet-600/50"
													: "bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400",
											)}
										>
											Any
										</button>
										{TASK_TYPES.map((type) => (
											<button
												key={type.value}
												type="button"
												onClick={() =>
													field.onChange(
														selectedTaskType === type.value ? null : type.value,
													)
												}
												className={cn(
													"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
													selectedTaskType === type.value
														? "bg-violet-600/20 text-violet-400 border-violet-600/50"
														: "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300",
												)}
											>
												{type.en}
											</button>
										))}
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Description */}
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Description</FormLabel>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Describe what needs to be done..."
										className="bg-zinc-950 border-zinc-800 min-h-[80px] resize-none"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<Separator className="bg-zinc-800 my-5" />

				{/* ========== ASSIGNMENT ========== */}
				<div className="space-y-4">
					<SectionHeader icon={Flag} title="Assignment" />

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{/* Priority — with color indicator */}
						<FormField
							control={form.control}
							name="priority"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Priority</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
												<SelectValue>
													<div className="flex items-center gap-2">
														<div
															className={cn(
																"w-2 h-2 rounded-full shrink-0",
																currentPriorityColor,
															)}
														/>
														<span>
															{
																PRIORITIES.find(
																	(p) => p.value === currentPriority,
																)?.label
															}
														</span>
													</div>
												</SelectValue>
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
											{PRIORITIES.map((p) => (
												<SelectItem key={p.value} value={p.value}>
													<div className="flex items-center gap-2">
														<div
															className={cn("w-2 h-2 rounded-full", p.color)}
														/>
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

						{/* Assignee */}
						<FormField
							control={form.control}
							name="assignee_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Assignee</FormLabel>
									<Select
										onValueChange={(val) =>
											field.onChange(val === "_none" ? "" : val)
										}
										value={field.value || "_none"}
									>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
												<SelectValue placeholder="Assignee" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
											<SelectItem value="_none">Unassigned</SelectItem>
											{profiles
												.filter((p) => p.id)
												.map((profile) => (
													<SelectItem key={profile.id} value={profile.id}>
														{profile.full_name || profile.email || "Unknown"}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Event */}
						<FormField
							control={form.control}
							name="event_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event</FormLabel>
									<Select
										onValueChange={(val) =>
											field.onChange(val === "_none" ? "" : val)
										}
										value={field.value || "_none"}
									>
										<FormControl>
											<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
												<SelectValue placeholder="Event" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
											<SelectItem value="_none">No event</SelectItem>
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
				</div>

				<Separator className="bg-zinc-800 my-5" />

				{/* ========== SCHEDULE ========== */}
				<div className="space-y-4">
					<SectionHeader icon={Calendar} title="Schedule" />

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="due_date"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Due Date</FormLabel>
									<FormControl>
										<Input
											type="date"
											{...field}
											className="bg-zinc-950 border-zinc-800 h-9 text-sm"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="scheduled_date"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Scheduled Date</FormLabel>
									<FormControl>
										<Input
											type="date"
											{...field}
											className="bg-zinc-950 border-zinc-800 h-9 text-sm"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<Separator className="bg-zinc-800 my-5" />

				{/* ========== ADVANCED (collapsible) ========== */}
				<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
					<CollapsibleTrigger className="w-full group">
						<div className="flex items-center gap-2 mb-3 cursor-pointer select-none">
							{advancedOpen ? (
								<ChevronDown className="h-4 w-4 text-zinc-500 transition-transform" />
							) : (
								<ChevronRight className="h-4 w-4 text-zinc-500 transition-transform" />
							)}
							<h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
								Advanced
							</h3>
							<div className="h-px flex-1 bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
						</div>
					</CollapsibleTrigger>

					<CollapsibleContent className="space-y-5">
						{/* Needs approval */}
						<FormField
							control={form.control}
							name="needs_approval"
							render={({ field }) => (
								<FormItem className="flex items-center gap-2">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
											className="border-zinc-700"
										/>
									</FormControl>
									<FormLabel className="!mt-0 cursor-pointer text-sm text-zinc-300">
										Requires approval
									</FormLabel>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Parent Task */}
						<FormField
							control={form.control}
							name="parent_task_id"
							render={({ field }) => {
								const selectedParent = parentTasks.find(
									(pt) => pt.id === field.value,
								);

								const availableParents = parentTasks.filter(
									(pt) => pt.id !== task?.id,
								);

								return (
									<FormItem>
										<FormLabel className="flex items-center gap-1.5">
											<CornerDownRight className="h-3.5 w-3.5 text-zinc-500" />
											Parent Task
										</FormLabel>
										<Popover
											open={parentTasksOpen}
											onOpenChange={setParentTasksOpen}
										>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														role="combobox"
														className={cn(
															"w-full justify-between bg-zinc-950 border-zinc-800 h-10 text-sm",
															!field.value && "text-zinc-500",
														)}
													>
														{field.value && selectedParent ? (
															<div className="flex items-center gap-2 truncate">
																<CornerDownRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
																<span className="truncate">
																	{selectedParent.title}
																</span>
															</div>
														) : (
															<div className="flex items-center gap-2">
																<CornerDownRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
																<span>Select parent task...</span>
															</div>
														)}
														<ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-800">
												<Command>
													<CommandInput
														placeholder="Search tasks..."
														className="border-zinc-700"
													/>
													<CommandList>
														<CommandEmpty>No tasks found.</CommandEmpty>
														<CommandGroup>
															<CommandItem
																value=""
																onSelect={() => {
																	field.onChange(null);
																	setParentTasksOpen(false);
																}}
																className="text-zinc-500"
															>
																<Check
																	className={cn(
																		"mr-2 h-4 w-4",
																		!field.value ? "opacity-100" : "opacity-0",
																	)}
																/>
																No parent
															</CommandItem>
															{availableParents.map((parentTask) => (
																<CommandItem
																	key={parentTask.id}
																	value={parentTask.title}
																	onSelect={() => {
																		field.onChange(parentTask.id);
																		setParentTasksOpen(false);
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4 shrink-0",
																			parentTask.id === field.value
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																	<div className="flex flex-col">
																		<span className="text-sm text-zinc-200">
																			{parentTask.title}
																		</span>
																		<span className="text-xs text-zinc-500">
																			{parentTask.status}
																			{parentTask.event
																				? ` — ${parentTask.event.name}`
																				: ""}
																		</span>
																	</div>
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								);
							}}
						/>

						{/* Inventory Items */}
						<FormItem>
							<FormLabel className="flex items-center gap-1.5">
								<MapPin className="h-3.5 w-3.5 text-zinc-500" />
								Inventory Items
							</FormLabel>
							<Popover open={itemsOpen} onOpenChange={setItemsOpen}>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											role="combobox"
											className={cn(
												"w-full justify-between bg-zinc-950 border-zinc-800 h-auto min-h-[40px] text-sm",
												!selectedItemIds.length && "text-zinc-500",
											)}
										>
											<div className="flex flex-wrap gap-1.5">
												{selectedItemIds.length > 0
													? selectedItems.map((item) => (
															<Badge
																key={item.id}
																variant="secondary"
																className="bg-zinc-800 text-zinc-300 border-zinc-700 gap-1"
															>
																{item.name}
																<span
																	role="button"
																	tabIndex={0}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		handleToggleItem(item.id);
																	}}
																	onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggleItem(item.id); }}
																	className="hover:text-white transition-colors cursor-pointer"
																>
																	<X className="h-3 w-3" />
																</span>
															</Badge>
														))
													: "Select items..."}
											</div>
											<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-800">
									<Command>
										<CommandInput
											placeholder="Search items..."
											className="border-zinc-700"
										/>
										<CommandList>
											<CommandEmpty>No items found.</CommandEmpty>
											<CommandGroup>
												{items.map((item) => (
													<CommandItem
														key={item.id}
														value={item.name}
														onSelect={() => handleToggleItem(item.id)}
													>
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																selectedItemIds.includes(item.id)
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														<div className="flex flex-col">
															<span className="text-sm text-zinc-200">
																{item.name}
															</span>
															<span className="text-xs text-zinc-500">
																{item.category}
															</span>
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>

							{/* Goal Location per selected item */}
							{selectedItems.length > 0 && (
								<div className="mt-3 space-y-2">
									<p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mb-2">
										<MapPin className="h-3 w-3" />
										Set goal location for each item
										<span className="text-zinc-600">(optional)</span>
									</p>
									{selectedItems.map((item) => {
										const selection = goalLocationSelections[item.id];
										const currentVenueId = selection?.venueId || "";
										const currentSubLocId = selection?.subLocationId || "";

										const venue = venues.find((v) => v.id === currentVenueId);
										const subLocation = venue?.sub_locations?.find(
											(sl) => sl.id === currentSubLocId,
										);

										return (
											<div
												key={item.id}
												className="flex items-start gap-3 bg-zinc-800/40 border border-zinc-700/60 rounded-lg p-2.5"
											>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-zinc-200">
														{item.name}
													</p>
													<p className="text-[11px] text-zinc-500">
														{item.category}
													</p>
												</div>
												<div className="flex items-center gap-1.5">
													<Select
														value={currentVenueId}
														onValueChange={(venueId) => {
															handleSetGoalLocation(item.id, venueId, "none");
														}}
													>
														<SelectTrigger className="w-[130px] bg-zinc-950 border-zinc-800 h-7 text-[11px]">
															<SelectValue placeholder="Venue" />
														</SelectTrigger>
														<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
															<SelectItem
																value="none"
																className="text-zinc-500 text-xs"
															>
																No venue
															</SelectItem>
															{venues
																.filter((v) => v.id)
																.map((v) => (
																	<SelectItem
																		key={v.id}
																		value={v.id}
																		className="text-xs"
																	>
																		{v.name}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>

													<Select
														value={currentSubLocId}
														onValueChange={(subLocId) => {
															handleSetGoalLocation(
																item.id,
																currentVenueId,
																subLocId,
															);
														}}
														disabled={!currentVenueId}
													>
														<SelectTrigger className="w-[110px] bg-zinc-950 border-zinc-800 h-7 text-[11px]">
															<SelectValue placeholder="Area" />
														</SelectTrigger>
														<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
															<SelectItem
																value="none"
																className="text-zinc-500 text-xs"
															>
																No area
															</SelectItem>
															{(venue?.sub_locations || [])
																.filter((sl) => sl.id)
																.map((sl) => (
																	<SelectItem
																		key={sl.id}
																		value={sl.id}
																		className="text-xs"
																	>
																		{sl.name}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>

													{currentSubLocId && subLocation && (
														<Badge
															variant="outline"
															className="bg-violet-600/20 text-violet-400 border-violet-600/50 text-[10px] h-7 whitespace-nowrap"
														>
															{subLocation.name}
														</Badge>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</FormItem>
					</CollapsibleContent>
				</Collapsible>

				{/* ========== FOOTER ========== */}
				<div className="flex items-center justify-between pt-6 mt-2 border-t border-zinc-800">
					{error && (
						<p className="text-red-400 text-sm flex items-center gap-1.5">
							<span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
							{error}
						</p>
					)}

					<div className="flex items-center gap-3 ml-auto">
						{onCancel && (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								className="border-zinc-800 text-zinc-400 hover:text-zinc-200"
							>
								Cancel
							</Button>
						)}
						<Button
							type="submit"
							className="bg-violet-600 hover:bg-violet-700 min-w-[120px]"
							disabled={loading}
						>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{mode === "create" ? "Create Task" : "Save Changes"}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}
