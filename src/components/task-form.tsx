"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandEmpty,
	CommandGroup,
	CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import { TASK_TYPES } from "@/lib/i18n";
import { TaskFormFields } from "./task-form/task-form-fields";
import { TaskFormItems } from "./task-form/task-form-items";
import { Loader2, Check, ChevronsUpDown, CornerDownRight } from "lucide-react";

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
			needs_approval: task?.needs_approval || false,
			task_type: task?.task_type || null,
			items: defaultItems,
			created_by: "",
			parent_task_id: task?.parent_task_id || null,
		},
	});

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
			const response = await fetch("/api/profiles");
			const data = await response.json();
			setProfiles(data.profiles || []);
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

	const handleAddItem = (item: InventoryItem) => {
		handleToggleItem(item.id);
	};

	const handleRemoveItem = (itemId: string) => {
		handleToggleItem(itemId);
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

	const watchedItems = form.watch("items");
	const selectedEntries = (watchedItems || []).map((i) => ({
		item_id: i.item_id,
		goal_sub_location_id: i.goal_sub_location_id ?? null,
	}));
	const isCreate = mode === "create";
	const hasParentTask = !!task?.parent_task_id;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
				{/* Basic fields from sub-component */}
				<TaskFormFields
					form={form as never}
					profiles={profiles}
					events={events}
				/>

				{/* Task Type */}
				<FormField
					control={form.control}
					name="task_type"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">
								Type
							</FormLabel>
							<Select
								onValueChange={(val) =>
									field.onChange(val === "_any" ? null : val)
								}
								value={field.value || "_any"}
							>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue placeholder="Any" />
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
									<SelectItem value="_any" className="text-zinc-500">
										Any
									</SelectItem>
									{TASK_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.en}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Parent Task (edit only) */}
				{!isCreate && hasParentTask && (
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
									<FormLabel className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
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
														"w-full justify-between bg-zinc-950 border-zinc-800 h-9 text-sm",
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
														<span className="text-zinc-500">
															Select parent task...
														</span>
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
				)}

				{/* Inventory Items with goal locations */}
				<TaskFormItems
					items={items}
					selectedEntries={selectedEntries}
					onAddItem={handleAddItem}
					onRemoveItem={handleRemoveItem}
					onGoalLocationChange={handleSetGoalLocation}
					venues={venues}
				/>

				{/* ========== FOOTER ========== */}
				<div className="flex items-center justify-between pt-4 border-t border-zinc-800">
					{error && (
						<p className="text-red-400 text-xs flex items-center gap-1.5">
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
								className="border-zinc-800 text-zinc-400 hover:text-zinc-200 h-9 text-sm"
							>
								Cancel
							</Button>
						)}
						<Button
							type="submit"
							className="bg-violet-600 hover:bg-violet-700 min-w-[110px] h-9 text-sm"
							disabled={loading}
						>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isCreate ? "Create Task" : "Save Changes"}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}
