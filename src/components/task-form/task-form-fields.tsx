"use client";

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
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

// Task schema (shared)
const itemEntrySchema = z.object({
	item_id: z.string(),
	goal_sub_location_id: z.string().nullable().optional(),
});

const taskSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	status: z.enum(["todo", "in_progress", "pending_approval", "done", "cancelled"]),
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
}

export function TaskFormFields({
	form,
	profiles,
	events,
}: TaskFormFieldsProps) {
	return (
		<>
			{/* Title */}
			<FormField
				control={form.control}
				name="title"
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-xs font-medium text-zinc-400">Title *</FormLabel>
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

			{/* Description */}
			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-xs font-medium text-zinc-400">Description</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Task description"
								className="bg-zinc-950 border-zinc-800 min-h-[100px] text-sm"
							/>
						</FormControl>
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
							<FormLabel className="text-xs font-medium text-zinc-400">Status</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue>{STATUS_OPTIONS.find((s) => s.value === field.value)?.label}</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{STATUS_OPTIONS.map((s) => (
										<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
							<FormLabel className="text-xs font-medium text-zinc-400">Priority</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue>
											<div className="flex items-center gap-2">
												<div className={cn("w-2 h-2 rounded-full", PRIORITIES.find((p) => p.value === field.value)?.color)} />
												<span>{PRIORITIES.find((p) => p.value === field.value)?.label}</span>
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

			{/* Row: Assignee / Due Date */}
			<div className="grid grid-cols-2 gap-3">
				<FormField
					control={form.control}
					name="assignee_id"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">Assignee</FormLabel>
							<Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} value={field.value || "_none"}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue placeholder="Unassigned" />
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									<SelectItem value="_none" className="text-zinc-500">Unassigned</SelectItem>
									{profiles.filter((p) => p.id).map((profile) => (
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

				<FormField
					control={form.control}
					name="due_date"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-xs font-medium text-zinc-400">Due Date</FormLabel>
							<FormControl>
								<div className="relative">
									<Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
									<Input type="date" {...field} className="bg-zinc-950 border-zinc-800 h-9 text-sm pl-8" />
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
							<FormLabel className="text-xs font-medium text-zinc-400">Event</FormLabel>
							<Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} value={field.value || "_none"}>
								<FormControl>
									<SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm">
										<SelectValue placeholder="No event" />
									</SelectTrigger>
								</FormControl>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									<SelectItem value="_none" className="text-zinc-500">No event</SelectItem>
									{events.filter((e) => e.id).map((event) => (
										<SelectItem key={event.id} value={event.id}>
											{event.name} ({new Date(event.date).toLocaleDateString()})
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
							<Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-zinc-700 h-4 w-4" />
						</FormControl>
						<FormLabel className="!mt-0 cursor-pointer text-xs text-zinc-400">Approval required</FormLabel>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
