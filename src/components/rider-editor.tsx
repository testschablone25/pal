"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemPicker } from "@/components/inventory-item-picker";
import { Loader2, Music, Utensils } from "lucide-react";
import type { TechRider, HospitalityRider } from "@/lib/riders/types";
import { RiderEditorTech } from "./rider-editor/rider-editor-tech";
import { RiderEditorStage } from "./rider-editor/rider-editor-stage";
import { RiderEditorHospitality } from "./rider-editor/rider-editor-hospitality";

interface RiderEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	artistId: string;
	artistName: string;
	techRider: TechRider | null;
	hospitalityRider: HospitalityRider | null;
	onRiderSaved: () => void;
}

// String array hook for managing list of strings
function useStringArray(initial: string[]) {
	const [items, setItems] = useState<string[]>(initial);
	return {
		items,
		setItems,
		add: () => setItems([...items, ""]),
		remove: (i: number) => setItems(items.filter((_, idx) => idx !== i)),
		update: (i: number, v: string) => {
			const next = [...items];
			next[i] = v;
			setItems(next);
		},
	};
}

function emptyTechRider(): TechRider {
	return {
		equipment: [],
		stage_setup: { monitors: [], power: [], furniture: [] },
		backline: { cdjs: [], turntables: [] },
		audio: { inputs_needed: 2, monitor_type: "booth", preferred_mixers: [] },
		transport: { flights_needed: false, priority_boarding: false },
		technical_notes: "",
		referenced_images: [],
		performance_requirements: {
			staff: { sound_tech: false, lighting_tech: false, soundcheck_required: false },
			stage: { requirements: [] },
		},
	};
}

function emptyHospitalityRider(): HospitalityRider {
	return {
		accommodation: { required: false, nights: 1, room_type: "double" },
		catering: { meals: [], dietary: [], drinks: { alcopops: false, spirits: [], mixers: [], water: false } },
		transport_ground: { car_service: false, return_required: false },
		hospitality_notes: "",
	};
}

export function RiderEditor({
	open,
	onOpenChange,
	artistId,
	artistName,
	techRider,
	hospitalityRider,
	onRiderSaved,
}: RiderEditorProps) {
	const [tech, setTech] = useState<TechRider>(() => {
		if (techRider) {
			const defaults = emptyTechRider();
			return {
				...defaults,
				...techRider,
				stage_setup: { ...defaults.stage_setup!, ...(techRider.stage_setup || {}) },
				backline: { ...defaults.backline!, ...(techRider.backline || {}) },
				audio: { ...defaults.audio, ...techRider.audio },
				transport: techRider.transport ? { ...defaults.transport!, ...techRider.transport } : undefined,
				performance_requirements: techRider.performance_requirements
					? {
							staff: { ...defaults.performance_requirements!.staff!, ...(techRider.performance_requirements.staff || {}) },
							stage: { ...defaults.performance_requirements!.stage!, ...(techRider.performance_requirements.stage || {}) },
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
				accommodation: hospitalityRider.accommodation ? { ...defaults.accommodation!, ...hospitalityRider.accommodation } : undefined,
				catering: hospitalityRider.catering ? { ...defaults.catering!, ...hospitalityRider.catering, drinks: { ...defaults.catering!.drinks, ...(hospitalityRider.catering.drinks || {}) } } : undefined,
				transport_ground: hospitalityRider.transport_ground ? { ...defaults.transport_ground!, ...hospitalityRider.transport_ground } : undefined,
				hospitality_notes: hospitalityRider.hospitality_notes || "",
			};
		}
		return emptyHospitalityRider();
	});

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [equipmentIndexToLink, setEquipmentIndexToLink] = useState<number | null>(null);
	const [showInventoryPicker, setShowInventoryPicker] = useState(false);

	const linkedInventoryIds = tech.equipment.map((e) => e.inventory_item_id).filter((id): id is string => !!id);

	const referencedImages = useStringArray(tech.referenced_images || []);
	const hospitalityMeals = useStringArray(hosp.catering?.meals || []);
	const hospitalityDietary = useStringArray(hosp.catering?.dietary || []);
	const hospitalitySpirits = useStringArray(hosp.catering?.drinks.spirits || []);
	const hospitalityMixers = useStringArray(hosp.catering?.drinks.mixers || []);

	const handleInventorySelect = (item: { id: string; name: string; brand: string | null; model: string | null }) => {
		if (equipmentIndexToLink !== null) {
			const displayName = [item.brand, item.name].filter(Boolean).join(" ");
			const equipment = [...tech.equipment];
			equipment[equipmentIndexToLink] = {
				...equipment[equipmentIndexToLink],
				name: displayName || item.name,
				inventory_item_id: item.id,
				inventory_item_name: item.name,
			};
			setTech({ ...tech, equipment });
			setEquipmentIndexToLink(null);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		try {
			const finalTech: TechRider = {
				...tech,
				referenced_images: referencedImages.items,
				performance_requirements: {
					staff: { ...(tech.performance_requirements?.staff ?? {}) },
					stage: { requirements: [] },
				},
			};
			const finalHosp: HospitalityRider = {
				...hosp,
				catering: hosp.catering ? {
					...hosp.catering,
					meals: hospitalityMeals.items,
					dietary: hospitalityDietary.items,
					drinks: { ...hosp.catering.drinks, spirits: hospitalitySpirits.items, mixers: hospitalityMixers.items },
				} : undefined,
			};
			const response = await fetch(`/api/artists/${artistId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tech_rider: finalTech, hospitality_rider: finalHosp }),
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

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-white">Manual Rider Editor — {artistName}</DialogTitle>
					</DialogHeader>

					{error && (
						<div className="p-3 bg-red-950/50 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
					)}

					<Tabs defaultValue="tech" className="w-full">
						<TabsList className="grid w-full grid-cols-3 bg-zinc-800">
							<TabsTrigger value="tech" className="data-[state=active]:bg-violet-600">
								<Music className="h-4 w-4 mr-1" /> Tech
							</TabsTrigger>
							<TabsTrigger value="stage" className="data-[state=active]:bg-violet-600">
								<Music className="h-4 w-4 mr-1" /> Stage
							</TabsTrigger>
							<TabsTrigger value="hospitality" className="data-[state=active]:bg-violet-600">
								<Utensils className="h-4 w-4 mr-1" /> Hospitality
							</TabsTrigger>
						</TabsList>

						<TabsContent value="tech" className="mt-4 space-y-4">
							<RiderEditorTech
								tech={tech}
								onTechChange={setTech}
								onLinkInventory={(idx) => { setEquipmentIndexToLink(idx); setShowInventoryPicker(true); }}
								linkedInventoryIds={linkedInventoryIds}
								referencedImages={referencedImages}
							/>
						</TabsContent>

						<TabsContent value="stage" className="mt-4 space-y-4">
							<RiderEditorStage
								stageSetup={tech.stage_setup!}
								onStageChange={(stage) => setTech({ ...tech, stage_setup: stage })}
							/>
						</TabsContent>

						<TabsContent value="hospitality" className="mt-4 space-y-4">
							<RiderEditorHospitality
								hosp={hosp}
								onHospChange={setHosp}
								meals={hospitalityMeals}
								dietary={hospitalityDietary}
								spirits={hospitalitySpirits}
								mixers={hospitalityMixers}
							/>
						</TabsContent>
					</Tabs>

					<div className="flex justify-end pt-4 border-t border-zinc-800">
						<Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
							{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
							{saving ? "Saving..." : "Save Rider"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{showInventoryPicker && (
				<InventoryItemPicker
					open={showInventoryPicker}
					onOpenChange={setShowInventoryPicker}
					onSelect={handleInventorySelect}
					excludeIds={linkedInventoryIds}
				/>
			)}
		</>
	);
}
