"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music, Plus, Check } from "lucide-react";

const performanceSchema = z.object({
	artist_id: z.string().min(1, "Artist is required"),
	start_time: z.string().min(1, "Start time is required"),
	end_time: z.string().min(1, "End time is required"),
	stage: z.string().min(1, "Stage is required"),
});

type PerformanceFormValues = z.input<typeof performanceSchema>;

interface Artist {
	id: string;
	name: string;
	genre: string | null;
	city: string | null;
}

interface PerformanceFormProps {
	eventId: string;
	onSuccess?: (performance: Record<string, unknown>) => void;
	onError?: (error: string) => void;
	initialData?: Partial<PerformanceFormValues>;
	performanceId?: string;
}

export function PerformanceForm({
	eventId,
	onSuccess,
	onError,
	initialData,
	performanceId,
}: PerformanceFormProps) {
	const [loading, setLoading] = useState(false);

	// Artist autocomplete state
	const [searchQuery, setSearchQuery] = useState("");
	const [suggestions, setSuggestions] = useState<Artist[]>([]);
	const [searching, setSearching] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [selectedArtistName, setSelectedArtistName] = useState<string>("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Inline create artist state
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newArtistName, setNewArtistName] = useState("");
	const [newArtistGenre, setNewArtistGenre] = useState("");
	const [newArtistCity, setNewArtistCity] = useState("");
	const [creatingArtist, setCreatingArtist] = useState(false);

	const form = useForm<PerformanceFormValues>({
		resolver: zodResolver(performanceSchema),
		defaultValues: {
			artist_id: initialData?.artist_id || "",
			start_time: initialData?.start_time || "22:00",
			end_time: initialData?.end_time || "23:00",
			stage: initialData?.stage || "main",
		},
	});

	// If editing, resolve the initial artist name
	useEffect(() => {
		if (initialData?.artist_id && !selectedArtistName) {
			fetch(`/api/artists/${initialData.artist_id}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.name) setSelectedArtistName(data.name);
				})
				.catch(() => {});
		}
	}, [initialData?.artist_id, selectedArtistName]);

	// Close dropdown on outside click
	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				searchInputRef.current &&
				!searchInputRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = searchQuery.trim();
		if (trimmed.length < 2) {
			setSuggestions([]);
			setDropdownOpen(false);
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
				setDropdownOpen(true);
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

	const selectArtist = useCallback(
		(artist: Artist) => {
			form.setValue("artist_id", artist.id);
			setSelectedArtistName(artist.name);
			setSearchQuery(artist.name);
			setDropdownOpen(false);
			setShowCreateForm(false);
		},
		[form],
	);

	const handleCreateAndSelect = useCallback(async () => {
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
			selectArtist(data as Artist);
			setNewArtistName("");
			setNewArtistGenre("");
			setNewArtistCity("");
		} catch (err) {
			onError?.(err instanceof Error ? err.message : "Failed to create artist");
		} finally {
			setCreatingArtist(false);
		}
	}, [newArtistName, newArtistGenre, newArtistCity, selectArtist, onError]);

	const onSubmit = async (values: PerformanceFormValues) => {
		setLoading(true);
		try {
			const url = performanceId
				? `/api/performances/${performanceId}`
				: "/api/performances";
			const method = performanceId ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...values,
					event_id: eventId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save performance");
			}

			onSuccess?.(data);
			form.reset();
			setSearchQuery("");
			setSelectedArtistName("");
		} catch (error) {
			onError?.(error instanceof Error ? error.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				{/* ===== Artist Search / Autocomplete ===== */}
				<FormField
					control={form.control}
					name="artist_id"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Artist</FormLabel>
							<FormControl>
								<div className="relative">
									<Input
										ref={searchInputRef}
										value={searchQuery}
										onChange={(e) => {
											setSearchQuery(e.target.value);
											// Clear selection when typing
											if (
												selectedArtistName &&
												e.target.value !== selectedArtistName
											) {
												field.onChange("");
												setSelectedArtistName("");
											}
										}}
										onFocus={() => {
											if (suggestions.length > 0) setDropdownOpen(true);
										}}
										onKeyDown={(e) => {
											if (e.key === "Escape") setDropdownOpen(false);
											if (
												e.key === "ArrowDown" &&
												!dropdownOpen &&
												suggestions.length > 0
											) {
												e.preventDefault();
												setDropdownOpen(true);
											}
										}}
										placeholder="Type artist name..."
										className="bg-zinc-900 border-zinc-700"
									/>
									{searching && (
										<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
									)}
									{selectedArtistName && !searching && (
										<Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
									)}

									{/* Dropdown suggestions */}
									{dropdownOpen && suggestions.length > 0 && (
										<div
											ref={dropdownRef}
											className="absolute left-0 top-full mt-1 z-50 w-full rounded-md border border-zinc-700 bg-zinc-900 shadow-lg"
										>
											<Command>
												<CommandList>
													<CommandGroup heading="Existing Artists">
														{suggestions.map((artist) => (
															<CommandItem
																key={artist.id}
																value={artist.name}
																onSelect={() => selectArtist(artist)}
																className="cursor-pointer"
															>
																<div className="flex items-center gap-2 w-full">
																	<Music className="h-4 w-4 text-violet-400 shrink-0" />
																	<div className="min-w-0 flex-1">
																		<span className="text-white text-sm font-medium">
																			{artist.name}
																		</span>
																		<div className="flex items-center gap-2 mt-0.5">
																			{artist.genre && (
																				<Badge
																					variant="outline"
																					className="border-zinc-700 text-zinc-400 text-[10px] py-0"
																				>
																					{artist.genre}
																				</Badge>
																			)}
																			{artist.city && (
																				<span className="text-[11px] text-zinc-500">
																					{artist.city}
																				</span>
																			)}
																		</div>
																	</div>
																	{form.watch("artist_id") === artist.id && (
																		<Check className="h-4 w-4 text-emerald-400 shrink-0" />
																	)}
																</div>
															</CommandItem>
														))}
													</CommandGroup>
													<CommandSeparator className="bg-zinc-800" />
													<CommandItem
														onSelect={() => {
															setDropdownOpen(false);
															setShowCreateForm(true);
															setNewArtistName(searchQuery);
															setTimeout(() => {
																document
																	.getElementById("new-artist-name")
																	?.focus();
															}, 100);
														}}
														className="cursor-pointer text-violet-400"
													>
														<Plus className="h-4 w-4 mr-2" />
														<span>
															Create new artist{" "}
															{searchQuery.trim() && (
																<span className="text-zinc-400">
																	&quot;{searchQuery.trim()}&quot;
																</span>
															)}
														</span>
													</CommandItem>
												</CommandList>
											</Command>
										</div>
									)}
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* ===== Inline Create Artist Form ===== */}
				{showCreateForm && (
					<div className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-800/50">
						<h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
							<Music className="h-4 w-4 text-violet-400" />
							New Artist
						</h4>
						<div>
							<label className="text-xs text-zinc-500 mb-1 block">Name *</label>
							<Input
								id="new-artist-name"
								value={newArtistName}
								onChange={(e) => setNewArtistName(e.target.value)}
								placeholder="Artist name"
								className="bg-zinc-900 border-zinc-700"
								autoFocus
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-zinc-500 mb-1 block">
									Genre
								</label>
								<Input
									value={newArtistGenre}
									onChange={(e) => setNewArtistGenre(e.target.value)}
									placeholder="e.g. Techno"
									className="bg-zinc-900 border-zinc-700"
								/>
							</div>
							<div>
								<label className="text-xs text-zinc-500 mb-1 block">City</label>
								<Input
									value={newArtistCity}
									onChange={(e) => setNewArtistCity(e.target.value)}
									placeholder="e.g. Berlin"
									className="bg-zinc-900 border-zinc-700"
								/>
							</div>
						</div>
						<div className="flex gap-2 pt-1">
							<Button
								type="button"
								size="sm"
								onClick={handleCreateAndSelect}
								disabled={!newArtistName.trim() || creatingArtist}
								className="bg-violet-600 hover:bg-violet-700"
							>
								{creatingArtist ? (
									<>
										<Loader2 className="mr-2 h-3 w-3 animate-spin" />
										Creating...
									</>
								) : (
									<>
										<Plus className="mr-1.5 h-3.5 w-3.5" />
										Create & Select
									</>
								)}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => {
									setShowCreateForm(false);
									setTimeout(() => searchInputRef.current?.focus(), 100);
								}}
								className="text-zinc-400"
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* ===== Start / End Time ===== */}
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="start_time"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Start Time</FormLabel>
								<FormControl>
									<Input
										type="time"
										{...field}
										className="bg-zinc-900 border-zinc-700"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="end_time"
						render={({ field }) => (
							<FormItem>
								<FormLabel>End Time</FormLabel>
								<FormControl>
									<Input
										type="time"
										{...field}
										className="bg-zinc-900 border-zinc-700"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* ===== Stage ===== */}
				<FormField
					control={form.control}
					name="stage"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Stage</FormLabel>
							<FormControl>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<SelectTrigger className="bg-zinc-900 border-zinc-700">
										<SelectValue placeholder="Select stage" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="main">Main Stage</SelectItem>
										<SelectItem value="second">Second Stage</SelectItem>
										<SelectItem value="outdoor">Outdoor</SelectItem>
										<SelectItem value="vip">VIP Area</SelectItem>
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* ===== Submit ===== */}
				<Button
					type="submit"
					className="w-full bg-violet-600 hover:bg-violet-700"
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{performanceId ? "Updating..." : "Adding..."}
						</>
					) : performanceId ? (
						"Update Performance"
					) : (
						"Add Performance"
					)}
				</Button>
			</form>
		</Form>
	);
}
