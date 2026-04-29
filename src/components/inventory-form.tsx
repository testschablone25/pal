"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

const PAL_CATEGORIES = [
	"dj_audio",
	"lighting",
	"pa_sound",
	"infrastructure",
	"venue_misc",
] as const;

const itemSchema = z.object({
	name: z.string().min(1, "Name is required"),
	category: z.enum(PAL_CATEGORIES),
	serial_number: z.string().optional().default(""),
	brand: z.string().optional().default(""),
	model: z.string().optional().default(""),
	condition_enum: z
		.enum(["new", "good", "fair", "poor", "broken"])
		.optional()
		.default("good"),
	condition_notes: z.string().optional().default(""),
	current_location: z.string().optional().default(""),
	sub_location_id: z.string().optional().default(""),
	notes: z.string().optional().default(""),
	photo_url: z.string().optional().default(""),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

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
	sub_location_id: string | null;
	notes: string | null;
	photo_url: string | null;
}

interface InventoryFormProps {
	item?: Item;
	mode?: "create" | "edit";
	onSubmit: (values: ItemFormValues) => Promise<void>;
	onCancel?: () => void;
}

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
}

interface VenueWithSubLocations {
	id: string;
	name: string;
	sub_locations: SubLocation[];
}

const CATEGORIES = [
	{ value: "dj_audio", label: "DJ & Audio Equipment" },
	{ value: "lighting", label: "Lighting Equipment" },
	{ value: "pa_sound", label: "PA & Sound" },
	{ value: "infrastructure", label: "Infrastructure & Signal" },
	{ value: "venue_misc", label: "Venue & Misc" },
] as const;

const CONDITIONS = [
	{ value: "new", label: "New" },
	{ value: "good", label: "Good" },
	{ value: "fair", label: "Fair" },
	{ value: "poor", label: "Poor" },
	{ value: "broken", label: "Broken" },
] as const;

export function InventoryForm({
	item,
	mode = "create",
	onSubmit,
	onCancel,
}: InventoryFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [venues, setVenues] = useState<VenueWithSubLocations[]>([]);
	const [selectedVenueId, setSelectedVenueId] = useState("");
	const [subLocations, setSubLocations] = useState<SubLocation[]>([]);

	const form = useForm<ItemFormValues>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(itemSchema) as any,
		defaultValues: {
			name: item?.name || "",
			category: (item?.category as ItemFormValues["category"]) || "dj_audio",
			serial_number: item?.serial_number || "",
			brand: item?.brand || "",
			model: item?.model || "",
			condition_enum:
				(item?.condition_enum as ItemFormValues["condition_enum"]) || "good",
			condition_notes: item?.condition_notes || "",
			current_location: item?.current_location || "",
			sub_location_id: item?.sub_location_id || "",
			notes: item?.notes || "",
			photo_url: item?.photo_url || "",
		},
	});

	// Fetch venues with sub-locations on mount
	useEffect(() => {
		const fetchVenues = async () => {
			try {
				const response = await fetch("/api/venues");
				const data = await response.json();
				setVenues(data.venues || []);
			} catch (err) {
				console.error("Failed to fetch venues:", err);
			}
		};
		fetchVenues();
	}, []);

	// When a venue is selected, update the available sub-locations
	const handleVenueChange = (venueId: string) => {
		setSelectedVenueId(venueId);
		const venue = venues.find((v) => v.id === venueId);
		setSubLocations(venue?.sub_locations || []);
		// Clear sub_location_id when venue changes
		form.setValue("sub_location_id", "");
	};

	// If editing and item has a sub_location_id, pre-select the venue
	useEffect(() => {
		if (item?.sub_location_id && venues.length > 0) {
			// Find which venue this sub-location belongs to
			for (const venue of venues) {
				const found = venue.sub_locations?.find(
					(sl) => sl.id === item.sub_location_id,
				);
				if (found) {
					setSelectedVenueId(venue.id);
					setSubLocations(venue.sub_locations || []);
					break;
				}
			}
		}
	}, [item, venues]);

	const handleSubmit = async (values: ItemFormValues) => {
		setLoading(true);
		setError(null);
		try {
			// If a sub-location is selected but no custom current_location, build one
			if (values.sub_location_id && !values.current_location) {
				const venue = venues.find((v) =>
					v.sub_locations?.some((sl) => sl.id === values.sub_location_id),
				);
				const subLoc = venue?.sub_locations?.find(
					(sl) => sl.id === values.sub_location_id,
				);
				if (venue && subLoc) {
					values.current_location = `${venue.name} > ${subLoc.name}`;
				}
			}

			await onSubmit(values);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="bg-zinc-900 border-zinc-800">
			<CardHeader>
				<CardTitle className="text-white">
					{mode === "create" ? "Add New Item" : "Edit Item"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name *</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Item name"
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="category"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Category *</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select category" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												{CATEGORIES.map((cat) => (
													<SelectItem key={cat.value} value={cat.value}>
														{cat.label}
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
								name="serial_number"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Serial Number</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="SN-12345"
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="brand"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Brand</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Brand name"
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="model"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Model</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Model number"
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="condition_enum"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Condition</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select condition" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900 border-zinc-800">
												{CONDITIONS.map((cond) => (
													<SelectItem key={cond.value} value={cond.value}>
														{cond.label}
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
								name="condition_notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Condition Notes</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Any notes about condition..."
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Venue Select */}
							<FormItem>
								<FormLabel>Venue (optional)</FormLabel>
								<Select
									value={selectedVenueId}
									onValueChange={handleVenueChange}
								>
									<FormControl>
										<SelectTrigger className="bg-zinc-950 border-zinc-800">
											<SelectValue placeholder="Select venue..." />
										</SelectTrigger>
									</FormControl>
									<SelectContent className="bg-zinc-900 border-zinc-800">
										{venues.map((venue) => (
											<SelectItem key={venue.id} value={venue.id}>
												{venue.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormItem>

							{/* Sub-Location Select (only when venue selected) */}
							{selectedVenueId && subLocations.length > 0 && (
								<FormField
									control={form.control}
									name="sub_location_id"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Sub-Location / Area</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger className="bg-zinc-950 border-zinc-800">
														<SelectValue placeholder="Select area..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent className="bg-zinc-900 border-zinc-800">
													{subLocations.map((sl) => (
														<SelectItem key={sl.id} value={sl.id}>
															{sl.name}
															{sl.description ? ` — ${sl.description}` : ""}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{/* Free-text current_location as fallback */}
							<FormField
								control={form.control}
								name="current_location"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Custom Location (optional)</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Or type location manually..."
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="md:col-span-2">
								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Notes</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													placeholder="Additional notes..."
													className="bg-zinc-950 border-zinc-800"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{error && <div className="text-red-500 text-sm">{error}</div>}

						<div className="flex gap-4">
							<Button
								type="submit"
								className="bg-violet-600 hover:bg-violet-700"
								disabled={loading}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{mode === "create" ? "Create Item" : "Save Changes"}
							</Button>
							{onCancel && (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									className="border-zinc-800"
								>
									Cancel
								</Button>
							)}
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
