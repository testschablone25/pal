"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Plus,
	Trash2,
	Loader2,
	Music,
	Plane,
	Hotel,
	Car,
	Utensils,
	Users,
	Wrench,
	Save,
	FileText,
	Link2,
	PackageCheck,
} from "lucide-react";
import type {
	TechRider,
	HospitalityRider,
	EquipmentItem,
	StageMonitor,
	StagePower,
	StageFurniture,
	MixerRequirement,
	BacklineItem,
} from "@/lib/riders/types";
import { InventoryItemPicker } from "@/components/inventory-item-picker";
import { InventoryAutocomplete } from "@/components/inventory-autocomplete";

// ---------- Props ----------

interface RiderEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	artistId: string;
	artistName: string;
	techRider: TechRider | null;
	hospitalityRider: HospitalityRider | null;
	onRiderSaved: () => void;
}

// ---------- Defaults ----------

function emptyTechRider(): TechRider {
	return {
		equipment: [],
		stage_setup: { monitors: [], power: [], furniture: [] },
		backline: { cdjs: [], turntables: [] },
		audio: { inputs_needed: 2, monitor_type: "booth", preferred_mixers: [] },
		transport: {
			flights_needed: false,
			priority_boarding: false,
			baggage_requirements: "",
			origin_city: "",
		},
		performance_requirements: {
			staff: {
				sound_tech: false,
				sound_tech_notes: "",
				lighting_tech: false,
				lighting_tech_notes: "",
				soundcheck_required: false,
				soundcheck_duration_min: null,
				set_required: false,
				specific_time: null,
				party_mentioned: null,
			},
			stage: { requirements: [] },
		},
		technical_notes: "",
		referenced_images: [],
	};
}

function emptyHospitalityRider(): HospitalityRider {
	return {
		accommodation: {
			required: false,
			nights: 0,
			room_type: "",
			check_in: "",
			check_out: "",
			location_preference: "",
		},
		catering: {
			meals: [],
			dietary: [],
			drinks: { alcopops: false, spirits: [], mixers: [], water: false },
			special_requests: "",
		},
		transport_ground: {
			car_service: false,
			pickup_time: "",
			pickup_location: "",
			return_required: false,
			vehicle_type: "",
		},
		hospitality_notes: "",
	};
}

// ---------- Helper hook for string array fields ----------

function useStringArray(initial: string[]) {
	const [items, setItems] = useState<string[]>([...initial]);
	const [input, setInput] = useState("");

	const add = () => {
		const trimmed = input.trim();
		if (trimmed && !items.includes(trimmed)) {
			setItems([...items, trimmed]);
		}
		setInput("");
	};

	const remove = (index: number) => {
		setItems(items.filter((_, i) => i !== index));
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			add();
		}
	};

	return { items, setItems, input, setInput, add, remove, handleKeyDown };
}

// ---------- Main Component ----------

export function RiderEditor({
	open,
	onOpenChange,
	artistId,
	artistName,
	techRider,
	hospitalityRider,
	onRiderSaved,
}: RiderEditorProps) {
	// Initialize state from existing data or empty defaults
	const [tech, setTech] = useState<TechRider>(() => {
		if (techRider) {
			// Merge with empty defaults to ensure all nested fields exist
			const defaults = emptyTechRider();
			return {
				...defaults,
				...techRider,
				stage_setup: {
					...defaults.stage_setup!,
					...(techRider.stage_setup || {}),
				},
				backline: {
					...defaults.backline!,
					...(techRider.backline || {}),
				},
				audio: {
					...defaults.audio,
					...techRider.audio,
				},
				transport: techRider.transport
					? { ...defaults.transport!, ...techRider.transport }
					: undefined,
				performance_requirements: techRider.performance_requirements
					? {
							staff: {
								...defaults.performance_requirements!.staff!,
								...(techRider.performance_requirements.staff || {}),
							},
							stage: {
								...defaults.performance_requirements!.stage!,
								...(techRider.performance_requirements.stage || {}),
							},
						}
					: defaults.performance_requirements,
			};
		}
		return emptyTechRider();
	});

	const [hosp, setHosp] = useState<HospitalityRider>(() => {
		if (hospitalityRider) {
			const defaults = emptyHospitalityRider();
			return {
				accommodation: hospitalityRider.accommodation
					? { ...defaults.accommodation!, ...hospitalityRider.accommodation }
					: undefined,
				catering: hospitalityRider.catering
					? {
							...defaults.catering!,
							...hospitalityRider.catering,
							drinks: {
								...defaults.catering!.drinks,
								...(hospitalityRider.catering.drinks || {}),
							},
						}
					: undefined,
				transport_ground: hospitalityRider.transport_ground
					? {
							...defaults.transport_ground!,
							...hospitalityRider.transport_ground,
						}
					: undefined,
				hospitality_notes: hospitalityRider.hospitality_notes || "",
			};
		}
		return emptyHospitalityRider();
	});

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [equipmentIndexToLink, setEquipmentIndexToLink] = useState<
		number | null
	>(null);
	const [showInventoryPicker, setShowInventoryPicker] = useState(false);

	// Inventory linking handler
	const handleInventorySelect = (item: {
		id: string;
		name: string;
		brand: string | null;
		model: string | null;
	}) => {
		if (equipmentIndexToLink !== null) {
			const displayName = [item.brand, item.name].filter(Boolean).join(" ");
			updateEquipment(equipmentIndexToLink, {
				name: displayName || item.name,
				inventory_item_id: item.id,
				inventory_item_name: item.name,
			});
			setEquipmentIndexToLink(null);
		}
	};

	// Build exclude list for inventory picker (items already linked)
	const linkedInventoryIds = tech.equipment
		.map((e) => e.inventory_item_id)
		.filter((id): id is string => !!id);

	// String array helpers
	const referencedImages = useStringArray(tech.referenced_images || []);
	const hospitalityMeals = useStringArray(hosp.catering?.meals || []);
	const hospitalityDietary = useStringArray(hosp.catering?.dietary || []);
	const hospitalitySpirits = useStringArray(
		hosp.catering?.drinks.spirits || [],
	);
	const hospitalityMixers = useStringArray(hosp.catering?.drinks.mixers || []);
	const stageRequirements = useStringArray(
		tech.performance_requirements?.stage?.requirements || [],
	);

	// ---------- Helpers for equipment ----------

	const addEquipment = (artistBrings: boolean) => {
		setTech((prev) => ({
			...prev,
			equipment: [
				...prev.equipment,
				{
					name: "",
					quantity: 1,
					artist_brings: artistBrings,
					notes: artistBrings ? "Optional" : undefined,
				},
			],
		}));
	};

	const updateEquipment = (index: number, update: Partial<EquipmentItem>) => {
		setTech((prev) => {
			const equipment = [...prev.equipment];
			equipment[index] = { ...equipment[index], ...update };
			return { ...prev, equipment };
		});
	};

	const removeEquipment = (index: number) => {
		setTech((prev) => ({
			...prev,
			equipment: prev.equipment.filter((_, i) => i !== index),
		}));
	};

	// ---------- Helpers for arrays (monitors, power, furniture, cdjs, turntables, mixers) ----------

	const addArrayItem = <T,>(key: string, emptyItem: T) => {
		setTech((prev) => {
			if (key === "stage_setup.monitors") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						monitors: [
							...(prev.stage_setup!.monitors || []),
							emptyItem as StageMonitor,
						],
					},
				};
			}
			if (key === "stage_setup.power") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						power: [
							...(prev.stage_setup!.power || []),
							emptyItem as StagePower,
						],
					},
				};
			}
			if (key === "stage_setup.furniture") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						furniture: [
							...(prev.stage_setup!.furniture || []),
							emptyItem as StageFurniture,
						],
					},
				};
			}
			if (key === "backline.cdjs") {
				return {
					...prev,
					backline: {
						...prev.backline!,
						cdjs: [...(prev.backline!.cdjs || []), emptyItem as BacklineItem],
					},
				};
			}
			if (key === "backline.turntables") {
				return {
					...prev,
					backline: {
						...prev.backline!,
						turntables: [
							...(prev.backline!.turntables || []),
							emptyItem as BacklineItem,
						],
					},
				};
			}
			if (key === "audio.preferred_mixers") {
				return {
					...prev,
					audio: {
						...prev.audio,
						preferred_mixers: [
							...(prev.audio.preferred_mixers || []),
							emptyItem as MixerRequirement,
						],
					},
				};
			}
			return prev;
		});
	};

	const removeArrayItem = (key: string, index: number) => {
		setTech((prev) => {
			if (key === "stage_setup.monitors") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						monitors: (prev.stage_setup!.monitors || []).filter(
							(_, i) => i !== index,
						),
					},
				};
			}
			if (key === "stage_setup.power") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						power: (prev.stage_setup!.power || []).filter(
							(_, i) => i !== index,
						),
					},
				};
			}
			if (key === "stage_setup.furniture") {
				return {
					...prev,
					stage_setup: {
						...prev.stage_setup!,
						furniture: (prev.stage_setup!.furniture || []).filter(
							(_, i) => i !== index,
						),
					},
				};
			}
			if (key === "backline.cdjs") {
				return {
					...prev,
					backline: {
						...prev.backline!,
						cdjs: (prev.backline!.cdjs || []).filter((_, i) => i !== index),
					},
				};
			}
			if (key === "backline.turntables") {
				return {
					...prev,
					backline: {
						...prev.backline!,
						turntables: (prev.backline!.turntables || []).filter(
							(_, i) => i !== index,
						),
					},
				};
			}
			if (key === "audio.preferred_mixers") {
				return {
					...prev,
					audio: {
						...prev.audio,
						preferred_mixers: (prev.audio.preferred_mixers || []).filter(
							(_, i) => i !== index,
						),
					},
				};
			}
			return prev;
		});
	};

	// ---------- Save ----------

	const handleSave = async () => {
		setSaving(true);
		setError(null);

		try {
			// Build final payload, cleaning up referenced_images
			const finalTech: TechRider = {
				...tech,
				referenced_images: referencedImages.items,
				performance_requirements: {
					staff: { ...(tech.performance_requirements?.staff ?? {}) },
					stage: { requirements: stageRequirements.items },
				},
			};

			const finalHosp: HospitalityRider = {
				...hosp,
				catering: hosp.catering
					? {
							...hosp.catering,
							meals: hospitalityMeals.items,
							dietary: hospitalityDietary.items,
							drinks: {
								...hosp.catering.drinks,
								spirits: hospitalitySpirits.items,
								mixers: hospitalityMixers.items,
							},
						}
					: undefined,
			};

			const response = await fetch(`/api/artists/${artistId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tech_rider: finalTech,
					hospitality_rider: finalHosp,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save rider");
			}

			onOpenChange(false);
			onRiderSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setSaving(false);
		}
	};

	// ---------- Section header component ----------

	// ---------- Render ----------

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">
							Manual Rider Editor — {artistName}
						</DialogTitle>
					</DialogHeader>

					{error && (
						<div className="p-3 bg-red-950/50 border border-red-700 rounded-lg text-red-400 text-sm">
							{error}
						</div>
					)}

					<Tabs defaultValue="tech" className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-zinc-800">
							<TabsTrigger
								value="tech"
								className="data-[state=active]:bg-violet-600"
							>
								<Music className="h-4 w-4 mr-1" /> Technical Rider
							</TabsTrigger>
							<TabsTrigger
								value="hospitality"
								className="data-[state=active]:bg-violet-600"
							>
								<Utensils className="h-4 w-4 mr-1" /> Hospitality Rider
							</TabsTrigger>
						</TabsList>

						{/* ============ TECH RIDER TAB ============ */}
						<TabsContent value="tech" className="mt-4 space-y-4">
							<Accordion type="multiple" className="space-y-3">
								{/* --- Equipment --- */}
								<AccordionItem value="equipment" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Wrench className="h-4 w-4 text-violet-400" />
											<span>Equipment</span>
											<Badge className="bg-zinc-800 text-xs ml-2">
												{tech.equipment.length} item(s)
											</Badge>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										{/* Venue must supply group */}
										{tech.equipment.filter((e) => !e.artist_brings).length >
											0 && (
											<div>
												<p className="text-sm font-medium text-red-400 mb-2">
													Venue Must Supply
												</p>
												<div className="space-y-2">
													{tech.equipment
														.map((item, i) => ({ item, i }))
														.filter(({ item }) => !item.artist_brings)
														.map(({ item }) => {
															const realIndex = tech.equipment.indexOf(item);
															return (
																<EquipmentRow
																	key={`venue-${realIndex}`}
																	item={item}
																	index={realIndex}
																	update={updateEquipment}
																	remove={removeEquipment}
																/>
															);
														})}
												</div>
											</div>
										)}

										<Button
											variant="outline"
											size="sm"
											className="border-red-900/50 text-red-400 hover:bg-red-950/50"
											onClick={() => addEquipment(false)}
										>
											<Plus className="h-3 w-3 mr-1" /> Add Venue Supply Item
										</Button>

										{/* Artist brings group */}
										{tech.equipment.filter((e) => e.artist_brings).length >
											0 && (
											<div className="mt-3">
												<p className="text-sm font-medium text-green-400 mb-2">
													Artist Brings / Optional
												</p>
												<div className="space-y-2">
													{tech.equipment
														.map((item, i) => ({ item, i }))
														.filter(({ item }) => item.artist_brings)
														.map(({ item }) => {
															const realIndex = tech.equipment.indexOf(item);
															return (
																<EquipmentRow
																	key={`artist-${realIndex}`}
																	item={item}
																	index={realIndex}
																	update={updateEquipment}
																	remove={removeEquipment}
																/>
															);
														})}
												</div>
											</div>
										)}

										<Button
											variant="outline"
											size="sm"
											className="border-green-900/50 text-green-400 hover:bg-green-950/50 mt-2"
											onClick={() => addEquipment(true)}
										>
											<Plus className="h-3 w-3 mr-1" /> Add Artist-Brings Item
										</Button>
									</AccordionContent>
								</AccordionItem>

								{/* --- Stage Setup --- */}
								<AccordionItem value="stage-setup" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Music className="h-4 w-4 text-cyan-400" />
											<span>Stage Setup</span>
											<Badge className="bg-zinc-800 text-xs ml-2">
												{(
													(tech.stage_setup?.monitors?.length || 0) +
													(tech.stage_setup?.power?.length || 0) +
													(tech.stage_setup?.furniture?.length || 0)
												).toString()}{" "}
												item(s)
											</Badge>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-4 pt-2">
										{/* Monitors */}
										<div>
											<Label className="text-sm text-zinc-400 mb-1">
												Monitors
											</Label>
											{(tech.stage_setup?.monitors ?? []).map((m, i) => (
												<div
													key={`mon-${i}`}
													className="flex gap-2 mb-2 items-start"
												>
													<Input
														placeholder="Type"
														value={m.type}
														onChange={(e) => {
															const monitors = [
																...(tech.stage_setup!.monitors ?? []),
															];
															monitors[i] = {
																...monitors[i],
																type: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																stage_setup: { ...prev.stage_setup!, monitors },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Qty"
														value={m.quantity}
														onChange={(e) => {
															const monitors = [
																...(tech.stage_setup!.monitors ?? []),
															];
															monitors[i] = {
																...monitors[i],
																quantity: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																stage_setup: { ...prev.stage_setup!, monitors },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Input
														placeholder="Location"
														value={m.location}
														onChange={(e) => {
															const monitors = [
																...(tech.stage_setup!.monitors ?? []),
															];
															monitors[i] = {
																...monitors[i],
																location: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																stage_setup: { ...prev.stage_setup!, monitors },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-28"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() =>
															removeArrayItem("stage_setup.monitors", i)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("stage_setup.monitors", {
														type: "",
														quantity: 1,
														location: "stage",
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add Monitor
											</Button>
										</div>

										{/* Power */}
										<div>
											<Label className="text-sm text-zinc-400 mb-1">
												Power
											</Label>
											{(tech.stage_setup?.power ?? []).map((p, i) => (
												<div
													key={`pow-${i}`}
													className="flex gap-2 mb-2 items-start"
												>
													<Input
														placeholder="Type (e.g. Power Point)"
														value={p.type}
														onChange={(e) => {
															const power = [
																...(tech.stage_setup!.power ?? []),
															];
															power[i] = { ...power[i], type: e.target.value };
															setTech((prev) => ({
																...prev,
																stage_setup: { ...prev.stage_setup!, power },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Qty"
														value={p.quantity}
														onChange={(e) => {
															const power = [
																...(tech.stage_setup!.power ?? []),
															];
															power[i] = {
																...power[i],
																quantity: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																stage_setup: { ...prev.stage_setup!, power },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() =>
															removeArrayItem("stage_setup.power", i)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("stage_setup.power", {
														type: "",
														quantity: 1,
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add Power
											</Button>
										</div>

										{/* Furniture */}
										<div>
											<Label className="text-sm text-zinc-400 mb-1">
												Furniture
											</Label>
											{(tech.stage_setup?.furniture ?? []).map((f, i) => (
												<div
													key={`furn-${i}`}
													className="flex gap-2 mb-2 items-start"
												>
													<Input
														placeholder="Type"
														value={f.type}
														onChange={(e) => {
															const furniture = [
																...(tech.stage_setup!.furniture ?? []),
															];
															furniture[i] = {
																...furniture[i],
																type: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																stage_setup: {
																	...prev.stage_setup!,
																	furniture,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Qty"
														value={f.quantity}
														onChange={(e) => {
															const furniture = [
																...(tech.stage_setup!.furniture ?? []),
															];
															furniture[i] = {
																...furniture[i],
																quantity: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																stage_setup: {
																	...prev.stage_setup!,
																	furniture,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Input
														placeholder="Dimensions"
														value={f.dimensions || ""}
														onChange={(e) => {
															const furniture = [
																...(tech.stage_setup!.furniture ?? []),
															];
															furniture[i] = {
																...furniture[i],
																dimensions: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																stage_setup: {
																	...prev.stage_setup!,
																	furniture,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-40"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() =>
															removeArrayItem("stage_setup.furniture", i)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("stage_setup.furniture", {
														type: "",
														quantity: 1,
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add Furniture
											</Button>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Backline & Mixer --- */}
								<AccordionItem value="backline" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Music className="h-4 w-4 text-emerald-400" />
											<span>Backline &amp; Mixer</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-4 pt-2">
										{/* Mixer minimum requirements */}
										<div>
											<Label className="text-sm text-zinc-400">
												Mixer Minimum Requirements
											</Label>
											<Textarea
												placeholder="e.g. USB connectivity for MacBook required"
												value={tech.backline?.mixer_minimum_requirements || ""}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														backline: {
															...prev.backline!,
															mixer_minimum_requirements:
																e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>

										{/* Preferred Mixers */}
										<div>
											<Label className="text-sm text-zinc-400">
												Preferred Mixers
											</Label>
											{tech.audio.preferred_mixers?.map((m, i) => (
												<div
													key={`mix-${i}`}
													className="flex gap-2 mt-1 items-start"
												>
													<Input
														placeholder="Model"
														value={m.model}
														onChange={(e) => {
															const mixers = [
																...(tech.audio.preferred_mixers || []),
															];
															mixers[i] = {
																...mixers[i],
																model: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																audio: {
																	...prev.audio,
																	preferred_mixers: mixers,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Priority"
														value={m.priority}
														onChange={(e) => {
															const mixers = [
																...(tech.audio.preferred_mixers || []),
															];
															mixers[i] = {
																...mixers[i],
																priority: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																audio: {
																	...prev.audio,
																	preferred_mixers: mixers,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Input
														placeholder="Features"
														value={m.required_features || ""}
														onChange={(e) => {
															const mixers = [
																...(tech.audio.preferred_mixers || []),
															];
															mixers[i] = {
																...mixers[i],
																required_features: e.target.value || undefined,
															};
															setTech((prev) => ({
																...prev,
																audio: {
																	...prev.audio,
																	preferred_mixers: mixers,
																},
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() =>
															removeArrayItem("audio.preferred_mixers", i)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("audio.preferred_mixers", {
														model: "",
														priority: 99,
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add Mixer
											</Button>
										</div>

										{/* CDJs */}
										<div>
											<Label className="text-sm text-zinc-400">CDJs</Label>
											{tech.backline?.cdjs?.map((c, i) => (
												<div
													key={`cdj-${i}`}
													className="flex gap-2 mb-2 items-start"
												>
													<Input
														placeholder="Model"
														value={c.model}
														onChange={(e) => {
															const cdjs = [...(tech.backline!.cdjs || [])];
															cdjs[i] = { ...cdjs[i], model: e.target.value };
															setTech((prev) => ({
																...prev,
																backline: { ...prev.backline!, cdjs },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Qty"
														value={c.quantity}
														onChange={(e) => {
															const cdjs = [...(tech.backline!.cdjs || [])];
															cdjs[i] = {
																...cdjs[i],
																quantity: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																backline: { ...prev.backline!, cdjs },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() => removeArrayItem("backline.cdjs", i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("backline.cdjs", {
														model: "",
														quantity: 1,
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add CDJ
											</Button>
										</div>

										{/* Turntables */}
										<div>
											<Label className="text-sm text-zinc-400">
												Turntables
											</Label>
											{tech.backline?.turntables?.map((t, i) => (
												<div
													key={`tt-${i}`}
													className="flex gap-2 mb-2 items-start"
												>
													<Input
														placeholder="Model"
														value={t.model}
														onChange={(e) => {
															const turntables = [
																...(tech.backline!.turntables || []),
															];
															turntables[i] = {
																...turntables[i],
																model: e.target.value,
															};
															setTech((prev) => ({
																...prev,
																backline: { ...prev.backline!, turntables },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Input
														type="number"
														placeholder="Qty"
														value={t.quantity}
														onChange={(e) => {
															const turntables = [
																...(tech.backline!.turntables || []),
															];
															turntables[i] = {
																...turntables[i],
																quantity: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															};
															setTech((prev) => ({
																...prev,
																backline: { ...prev.backline!, turntables },
															}));
														}}
														className="bg-zinc-950 border-zinc-800 w-20"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
														onClick={() =>
															removeArrayItem("backline.turntables", i)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<Button
												variant="outline"
												size="sm"
												className="border-zinc-700 mt-1"
												onClick={() =>
													addArrayItem("backline.turntables", {
														model: "",
														quantity: 1,
													})
												}
											>
												<Plus className="h-3 w-3 mr-1" /> Add Turntable
											</Button>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Audio Setup --- */}
								<AccordionItem value="audio" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Music className="h-4 w-4 text-violet-400" />
											<span>Audio Setup</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label className="text-sm text-zinc-400">
													Inputs Needed
												</Label>
												<Input
													type="number"
													value={tech.audio.inputs_needed}
													onChange={(e) =>
														setTech((prev) => ({
															...prev,
															audio: {
																...prev.audio,
																inputs_needed: Math.max(
																	1,
																	parseInt(e.target.value) || 1,
																),
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
											<div>
												<Label className="text-sm text-zinc-400">
													Monitor Type
												</Label>
												<Select
													value={tech.audio.monitor_type}
													onValueChange={(v) =>
														setTech((prev) => ({
															...prev,
															audio: { ...prev.audio, monitor_type: v },
														}))
													}
												>
													<SelectTrigger className="bg-zinc-950 border-zinc-800">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="bg-zinc-900 border-zinc-800">
														<SelectItem value="booth">Booth</SelectItem>
														<SelectItem value="stage">Stage</SelectItem>
														<SelectItem value="in-ear">In-Ear</SelectItem>
														<SelectItem value="both">Both</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
										<div>
											<Label className="text-sm text-zinc-400">
												Special Audio Requirements
											</Label>
											<Textarea
												placeholder="e.g. stereo signal, USB cable for MacBook"
												value={tech.audio.special_requirements || ""}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														audio: {
															...prev.audio,
															special_requirements: e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Transport --- */}
								<AccordionItem value="transport" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Plane className="h-4 w-4 text-blue-400" />
											<span>Transport (Flights)</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-3">
												<Switch
													checked={tech.transport?.flights_needed || false}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															transport: {
																...prev.transport!,
																flights_needed: v,
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Flights Needed
												</Label>
											</div>
											<div className="flex items-center gap-3">
												<Switch
													checked={tech.transport?.priority_boarding || false}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															transport: {
																...prev.transport!,
																priority_boarding: v,
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Priority Boarding
												</Label>
												{tech.transport?.priority_boarding && (
													<Badge className="bg-red-600 text-xs">
														Priority!
													</Badge>
												)}
											</div>
										</div>
										<div>
											<Label className="text-sm text-zinc-400">
												Origin City
											</Label>
											<Input
												placeholder="e.g. Berlin"
												value={tech.transport?.origin_city || ""}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														transport: {
															...prev.transport!,
															origin_city: e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>
										<div>
											<Label className="text-sm text-zinc-400">
												Baggage Requirements
											</Label>
											<Input
												placeholder="e.g. luggage with clothing for 2 persons"
												value={tech.transport?.baggage_requirements || ""}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														transport: {
															...prev.transport!,
															baggage_requirements: e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Performance Requirements --- */}
								<AccordionItem value="performance" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Users className="h-4 w-4 text-indigo-400" />
											<span>Performance Requirements</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-4 pt-2">
										<p className="text-xs font-medium text-indigo-300">
											Staff Needs
										</p>
										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-3">
												<Switch
													checked={
														tech.performance_requirements?.staff?.sound_tech ||
														false
													}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	sound_tech: v,
																},
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Sound Technician
												</Label>
											</div>
											{tech.performance_requirements?.staff?.sound_tech && (
												<Input
													placeholder="Notes (e.g. 30 min soundcheck)"
													value={
														tech.performance_requirements?.staff
															?.sound_tech_notes || ""
													}
													onChange={(e) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	sound_tech_notes: e.target.value || undefined,
																},
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											)}
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-3">
												<Switch
													checked={
														tech.performance_requirements?.staff
															?.lighting_tech || false
													}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	lighting_tech: v,
																},
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Lighting Technician
												</Label>
											</div>
											{tech.performance_requirements?.staff?.lighting_tech && (
												<Input
													placeholder="Notes"
													value={
														tech.performance_requirements?.staff
															?.lighting_tech_notes || ""
													}
													onChange={(e) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	lighting_tech_notes:
																		e.target.value || undefined,
																},
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											)}
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-3">
												<Switch
													checked={
														tech.performance_requirements?.staff
															?.soundcheck_required || false
													}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	soundcheck_required: v,
																},
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Soundcheck Required
												</Label>
											</div>
											{tech.performance_requirements?.staff
												?.soundcheck_required && (
												<Input
													type="number"
													placeholder="Duration (min)"
													value={
														tech.performance_requirements?.staff
															?.soundcheck_duration_min || ""
													}
													onChange={(e) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	soundcheck_duration_min: e.target.value
																		? parseInt(e.target.value)
																		: null,
																},
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											)}
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-3">
												<Switch
													checked={
														tech.performance_requirements?.staff
															?.set_required || false
													}
													onCheckedChange={(v) =>
														setTech((prev) => ({
															...prev,
															performance_requirements: {
																...prev.performance_requirements!,
																staff: {
																	...prev.performance_requirements!.staff!,
																	set_required: v,
																},
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Set Required (Full Set)
												</Label>
											</div>
											<Input
												placeholder="Specific time (e.g. 22:00)"
												value={
													tech.performance_requirements?.staff?.specific_time ||
													""
												}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														performance_requirements: {
															...prev.performance_requirements!,
															staff: {
																...prev.performance_requirements!.staff!,
																specific_time: e.target.value || null,
															},
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800"
											/>
										</div>

										<div>
											<Label className="text-sm text-zinc-400">
												Party / Person Mentioned
											</Label>
											<Input
												placeholder="Name of party/person needing staff"
												value={
													tech.performance_requirements?.staff
														?.party_mentioned || ""
												}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														performance_requirements: {
															...prev.performance_requirements!,
															staff: {
																...prev.performance_requirements!.staff!,
																party_mentioned: e.target.value || null,
															},
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>

										{/* Stage Requirements */}
										<div>
											<Label className="text-sm text-zinc-400">
												Stage Requirements
											</Label>
											{stageRequirements.items.map((req, i) => (
												<div key={`sr-${i}`} className="flex gap-2 mt-1">
													<Input
														value={req}
														onChange={(e) => {
															const items = [...stageRequirements.items];
															items[i] = e.target.value;
															stageRequirements.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => stageRequirements.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add stage requirement"
													value={stageRequirements.input}
													onChange={(e) =>
														stageRequirements.setInput(e.target.value)
													}
													onKeyDown={stageRequirements.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={stageRequirements.add}
												>
													Add
												</Button>
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Technical Notes & Images --- */}
								<AccordionItem value="tech-notes" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4 text-zinc-400" />
											<span>Notes &amp; Images</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<div>
											<Label className="text-sm text-zinc-400">
												Technical Notes
											</Label>
											<Textarea
												placeholder="Additional technical notes..."
												value={tech.technical_notes || ""}
												onChange={(e) =>
													setTech((prev) => ({
														...prev,
														technical_notes: e.target.value || undefined,
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1 min-h-[80px]"
											/>
										</div>
										<div>
											<Label className="text-sm text-zinc-400">
												Referenced Images
											</Label>
											{referencedImages.items.map((ref, i) => (
												<div key={`ref-${i}`} className="flex gap-2 mt-1">
													<Input
														value={ref}
														onChange={(e) => {
															const items = [...referencedImages.items];
															items[i] = e.target.value;
															referencedImages.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => referencedImages.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Image reference (e.g. Figure 1)"
													value={referencedImages.input}
													onChange={(e) =>
														referencedImages.setInput(e.target.value)
													}
													onKeyDown={referencedImages.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={referencedImages.add}
												>
													Add
												</Button>
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</TabsContent>

						{/* ============ HOSPITALITY RIDER TAB ============ */}
						<TabsContent value="hospitality" className="mt-4 space-y-4">
							<Accordion type="multiple" className="space-y-3">
								{/* --- Accommodation --- */}
								<AccordionItem
									value="accommodation"
									className="border-zinc-800"
								>
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Hotel className="h-4 w-4 text-purple-400" />
											<span>Accommodation</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<div className="flex items-center gap-3">
											<Switch
												checked={hosp.accommodation?.required || false}
												onCheckedChange={(v) =>
													setHosp((prev) => ({
														...prev,
														accommodation: {
															...prev.accommodation!,
															required: v,
														},
													}))
												}
											/>
											<Label className="text-sm text-zinc-300">Required</Label>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label className="text-sm text-zinc-400">Nights</Label>
												<Input
													type="number"
													min={0}
													value={hosp.accommodation?.nights || 0}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															accommodation: {
																...prev.accommodation!,
																nights: Math.max(
																	0,
																	parseInt(e.target.value) || 0,
																),
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
											<div>
												<Label className="text-sm text-zinc-400">
													Room Type
												</Label>
												<Input
													placeholder="e.g. Kingsize bed, Single"
													value={hosp.accommodation?.room_type || ""}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															accommodation: {
																...prev.accommodation!,
																room_type: e.target.value,
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label className="text-sm text-zinc-400">
													Check In
												</Label>
												<Input
													placeholder="e.g. 14:00"
													value={hosp.accommodation?.check_in || ""}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															accommodation: {
																...prev.accommodation!,
																check_in: e.target.value || undefined,
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
											<div>
												<Label className="text-sm text-zinc-400">
													Check Out
												</Label>
												<Input
													placeholder="e.g. Late check-out"
													value={hosp.accommodation?.check_out || ""}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															accommodation: {
																...prev.accommodation!,
																check_out: e.target.value || undefined,
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
										</div>
										<div>
											<Label className="text-sm text-zinc-400">
												Location Preference
											</Label>
											<Input
												placeholder="e.g. minimum 3*"
												value={hosp.accommodation?.location_preference || ""}
												onChange={(e) =>
													setHosp((prev) => ({
														...prev,
														accommodation: {
															...prev.accommodation!,
															location_preference: e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Catering --- */}
								<AccordionItem value="catering" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Utensils className="h-4 w-4 text-orange-400" />
											<span>Catering</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-4 pt-2">
										{/* Meals */}
										<div>
											<Label className="text-sm text-zinc-400">Meals</Label>
											{hospitalityMeals.items.map((meal, i) => (
												<div key={`meal-${i}`} className="flex gap-2 mt-1">
													<Input
														value={meal}
														onChange={(e) => {
															const items = [...hospitalityMeals.items];
															items[i] = e.target.value;
															hospitalityMeals.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => hospitalityMeals.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add meal (e.g. Dinner for 2)"
													value={hospitalityMeals.input}
													onChange={(e) =>
														hospitalityMeals.setInput(e.target.value)
													}
													onKeyDown={hospitalityMeals.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={hospitalityMeals.add}
												>
													Add
												</Button>
											</div>
										</div>

										{/* Dietary */}
										<div>
											<Label className="text-sm text-zinc-400">Dietary</Label>
											{hospitalityDietary.items.map((d, i) => (
												<div key={`diet-${i}`} className="flex gap-2 mt-1">
													<Input
														value={d}
														onChange={(e) => {
															const items = [...hospitalityDietary.items];
															items[i] = e.target.value;
															hospitalityDietary.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => hospitalityDietary.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add dietary (e.g. Vegetarian)"
													value={hospitalityDietary.input}
													onChange={(e) =>
														hospitalityDietary.setInput(e.target.value)
													}
													onKeyDown={hospitalityDietary.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={hospitalityDietary.add}
												>
													Add
												</Button>
											</div>
										</div>

										{/* Drinks */}
										<div>
											<Label className="text-sm text-zinc-400">Drinks</Label>
											<div className="grid grid-cols-2 gap-3 mt-1">
												<div className="flex items-center gap-3">
													<Switch
														checked={hosp.catering?.drinks?.water || false}
														onCheckedChange={(v) =>
															setHosp((prev) => ({
																...prev,
																catering: {
																	...prev.catering!,
																	drinks: {
																		...prev.catering!.drinks,
																		water: v,
																	},
																},
															}))
														}
													/>
													<Label className="text-sm text-zinc-300">Water</Label>
												</div>
												<div className="flex items-center gap-3">
													<Switch
														checked={hosp.catering?.drinks?.alcopops || false}
														onCheckedChange={(v) =>
															setHosp((prev) => ({
																...prev,
																catering: {
																	...prev.catering!,
																	drinks: {
																		...prev.catering!.drinks,
																		alcopops: v,
																	},
																},
															}))
														}
													/>
													<Label className="text-sm text-zinc-300">
														Alcopops
													</Label>
												</div>
											</div>
										</div>

										{/* Spirits */}
										<div>
											<Label className="text-sm text-zinc-400">Spirits</Label>
											{hospitalitySpirits.items.map((s, i) => (
												<div key={`spirit-${i}`} className="flex gap-2 mt-1">
													<Input
														value={s}
														onChange={(e) => {
															const items = [...hospitalitySpirits.items];
															items[i] = e.target.value;
															hospitalitySpirits.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => hospitalitySpirits.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add spirit (e.g. Beer)"
													value={hospitalitySpirits.input}
													onChange={(e) =>
														hospitalitySpirits.setInput(e.target.value)
													}
													onKeyDown={hospitalitySpirits.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={hospitalitySpirits.add}
												>
													Add
												</Button>
											</div>
										</div>

										{/* Mixers */}
										<div>
											<Label className="text-sm text-zinc-400">Mixers</Label>
											{hospitalityMixers.items.map((m, i) => (
												<div key={`mix-hosp-${i}`} className="flex gap-2 mt-1">
													<Input
														value={m}
														onChange={(e) => {
															const items = [...hospitalityMixers.items];
															items[i] = e.target.value;
															hospitalityMixers.setItems(items);
														}}
														className="bg-zinc-950 border-zinc-800 flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-400 hover:bg-red-950/50"
														onClick={() => hospitalityMixers.remove(i)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add mixer (e.g. Coca Cola)"
													value={hospitalityMixers.input}
													onChange={(e) =>
														hospitalityMixers.setInput(e.target.value)
													}
													onKeyDown={hospitalityMixers.handleKeyDown}
													className="bg-zinc-950 border-zinc-800 flex-1"
												/>
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700"
													onClick={hospitalityMixers.add}
												>
													Add
												</Button>
											</div>
										</div>

										{/* Special Requests */}
										<div>
											<Label className="text-sm text-zinc-400">
												Special Catering Requests
											</Label>
											<Textarea
												placeholder="Additional food/drink requests"
												value={hosp.catering?.special_requests || ""}
												onChange={(e) =>
													setHosp((prev) => ({
														...prev,
														catering: {
															...prev.catering!,
															special_requests: e.target.value || undefined,
														},
													}))
												}
												className="bg-zinc-950 border-zinc-800 mt-1"
											/>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Ground Transport --- */}
								<AccordionItem
									value="ground-transport"
									className="border-zinc-800"
								>
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<Car className="h-4 w-4 text-green-400" />
											<span>Ground Transport</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<div className="flex items-center gap-3">
											<Switch
												checked={hosp.transport_ground?.car_service || false}
												onCheckedChange={(v) =>
													setHosp((prev) => ({
														...prev,
														transport_ground: {
															...prev.transport_ground!,
															car_service: v,
														},
													}))
												}
											/>
											<Label className="text-sm text-zinc-300">
												Car Service Required
											</Label>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label className="text-sm text-zinc-400">
													Pickup Time
												</Label>
												<Input
													placeholder="e.g. 15:00"
													value={hosp.transport_ground?.pickup_time || ""}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															transport_ground: {
																...prev.transport_ground!,
																pickup_time: e.target.value || undefined,
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
											<div>
												<Label className="text-sm text-zinc-400">
													Pickup Location
												</Label>
												<Input
													placeholder="e.g. Airport"
													value={hosp.transport_ground?.pickup_location || ""}
													onChange={(e) =>
														setHosp((prev) => ({
															...prev,
															transport_ground: {
																...prev.transport_ground!,
																pickup_location: e.target.value || undefined,
															},
														}))
													}
													className="bg-zinc-950 border-zinc-800"
												/>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label className="text-sm text-zinc-400">
													Vehicle Type
												</Label>
												<Select
													value={hosp.transport_ground?.vehicle_type || ""}
													onValueChange={(v) =>
														setHosp((prev) => ({
															...prev,
															transport_ground: {
																...prev.transport_ground!,
																vehicle_type: v || undefined,
															},
														}))
													}
												>
													<SelectTrigger className="bg-zinc-950 border-zinc-800">
														<SelectValue placeholder="Select" />
													</SelectTrigger>
													<SelectContent className="bg-zinc-900 border-zinc-800">
														<SelectItem value="Sedan">Sedan</SelectItem>
														<SelectItem value="Van">Van</SelectItem>
														<SelectItem value="SUV">SUV</SelectItem>
														<SelectItem value="Limo">Limo</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="flex items-center gap-3">
												<Switch
													checked={
														hosp.transport_ground?.return_required || false
													}
													onCheckedChange={(v) =>
														setHosp((prev) => ({
															...prev,
															transport_ground: {
																...prev.transport_ground!,
																return_required: v,
															},
														}))
													}
												/>
												<Label className="text-sm text-zinc-300">
													Return Required
												</Label>
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* --- Hospitality Notes --- */}
								<AccordionItem value="hosp-notes" className="border-zinc-800">
									<AccordionTrigger className="text-white hover:no-underline">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4 text-zinc-400" />
											<span>Hospitality Notes</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="space-y-3 pt-2">
										<Textarea
											placeholder="Additional hospitality notes..."
											value={hosp.hospitality_notes || ""}
											onChange={(e) =>
												setHosp((prev) => ({
													...prev,
													hospitality_notes: e.target.value || undefined,
												}))
											}
											className="bg-zinc-950 border-zinc-800 min-h-[80px]"
										/>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</TabsContent>
					</Tabs>

					{/* Footer Actions */}
					<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="border-zinc-700"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={saving}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Rider
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<InventoryItemPicker
				open={showInventoryPicker}
				onOpenChange={setShowInventoryPicker}
				onSelect={handleInventorySelect}
				excludeIds={linkedInventoryIds}
			/>
		</>
	);
}

// ---------- Sub-component: single equipment row ----------

function EquipmentRow({
	item,
	index,
	update,
	remove,
	onLinkInventory,
	excludeIds = [],
}: {
	item: EquipmentItem;
	index: number;
	update: (index: number, update: Partial<EquipmentItem>) => void;
	remove: (index: number) => void;
	onLinkInventory?: () => void;
	excludeIds?: string[];
}) {
	const borderColor = item.artist_brings
		? "border-green-900/30 bg-green-950/20"
		: "border-red-900/30 bg-red-950/20";

	const handleAutocompleteSelect = (selected: {
		id: string;
		name: string;
		brand: string | null;
		model: string | null;
	}) => {
		const displayName = [selected.brand, selected.name].filter(Boolean).join(" ");
		update(index, {
			name: displayName || selected.name,
			inventory_item_id: selected.id,
			inventory_item_name: selected.name,
		});
	};

	return (
		<div className={`flex gap-2 items-start p-2 rounded border ${borderColor}`}>
			<div className="flex-1 space-y-1">
				<div className="flex gap-2">
					<InventoryAutocomplete
						value={item.name}
						onChange={(val) => update(index, { name: val })}
						onSelectItem={handleAutocompleteSelect}
						placeholder="Equipment name (type to search inventory)"
						excludeIds={excludeIds}
						className="bg-zinc-950 border-zinc-800 flex-1"
					/>
					<Button
						variant="ghost"
						size="icon"
						className="text-violet-400 hover:bg-violet-950/50 flex-shrink-0"
						onClick={onLinkInventory}
						title="Browse inventory"
					>
						<Link2 className="h-4 w-4" />
					</Button>
				</div>
				{item.inventory_item_id && (
					<div className="flex items-center gap-1">
						<PackageCheck className="h-3 w-3 text-violet-400" />
						<span className="text-[10px] text-violet-400">
							Linked: {item.inventory_item_name || item.name}
						</span>
					</div>
				)}
			</div>
			<Input
				type="number"
				placeholder="Qty"
				value={item.quantity}
				onChange={(e) =>
					update(index, {
						quantity: Math.max(1, parseInt(e.target.value) || 1),
					})
				}
				className="bg-zinc-950 border-zinc-800 w-20"
			/>
			<Input
				placeholder="Notes"
				value={item.notes || ""}
				onChange={(e) => update(index, { notes: e.target.value || undefined })}
				className="bg-zinc-950 border-zinc-800 w-32"
			/>
			<Button
				variant="ghost"
				size="icon"
				className="text-red-400 hover:bg-red-950/50 flex-shrink-0"
				onClick={() => remove(index)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}
