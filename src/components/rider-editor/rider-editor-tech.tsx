"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Wrench, Music, Plane } from "lucide-react";

interface EquipmentItem {
	name: string;
	quantity: number;
	artist_brings: boolean;
	notes?: string;
	inventory_item_id?: string;
	inventory_item_name?: string;
}

interface TechRider {
	equipment: EquipmentItem[];
	stage_setup?: {
		monitors?: Array<{ type: string; quantity: number; location: string }>;
		power?: Array<{ type: string; quantity: number }>;
		furniture?: Array<{ type: string; quantity: number; dimensions?: string }>;
	};
	backline?: {
		cdjs?: Array<{ model: string; quantity: number }>;
		turntables?: Array<{ model: string; quantity: number }>;
		mixer_minimum_requirements?: string;
	};
	audio: {
		inputs_needed: number;
		monitor_type: string;
		preferred_mixers?: Array<{ model: string; required_features?: string; priority: number }>;
		special_requirements?: string;
	};
	transport?: {
		flights_needed: boolean;
		priority_boarding: boolean;
		baggage_requirements?: string;
		origin_city?: string;
	};
	technical_notes?: string;
	referenced_images?: string[];
	performance_requirements?: {
		staff?: { sound_tech?: boolean; lighting_tech?: boolean; soundcheck_required?: boolean };
		stage?: { requirements?: string[] };
	};
}

interface RiderEditorTechProps {
	tech: TechRider;
	onTechChange: (tech: TechRider) => void;
	onLinkInventory: (index: number) => void;
	linkedInventoryIds: string[];
	referencedImages: { items: string[]; add: () => void; remove: (i: number) => void; update: (i: number, v: string) => void };
}

function EquipmentRow({
	item,
	index,
	onUpdate,
	onRemove,
	onLinkInventory,
}: {
	item: EquipmentItem;
	index: number;
	onUpdate: (i: number, update: Partial<EquipmentItem>) => void;
	onRemove: (i: number) => void;
	onLinkInventory: (i: number) => void;
}) {
	return (
		<div className="flex gap-2 items-start flex-wrap">
			<div className="flex-1 min-w-[150px]">
				<Input
					placeholder="Equipment name"
					value={item.name}
					onChange={(e) => onUpdate(index, { name: e.target.value })}
					className="bg-zinc-950 border-zinc-800"
				/>
			</div>
			<Input
				type="number"
				placeholder="Qty"
				value={item.quantity}
				onChange={(e) =>
					onUpdate(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
				}
				className="bg-zinc-950 border-zinc-800 w-16"
			/>
			<Input
				placeholder="Notes"
				value={item.notes || ""}
				onChange={(e) => onUpdate(index, { notes: e.target.value })}
				className="bg-zinc-950 border-zinc-800 w-28"
			/>
			<Button
				variant="ghost"
				size="icon"
				className="text-blue-400 hover:bg-blue-950/50"
				onClick={() => onLinkInventory(index)}
				title="Link inventory item"
			>
				<Wrench className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="text-red-400 hover:bg-red-950/50"
				onClick={() => onRemove(index)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			{item.inventory_item_name && (
				<Badge className="bg-blue-600/20 text-blue-300 text-[10px]">
					{item.inventory_item_name}
				</Badge>
			)}
		</div>
	);
}

export function RiderEditorTech({
	tech,
	onTechChange,
	onLinkInventory,
	linkedInventoryIds,
	referencedImages,
}: RiderEditorTechProps) {
	const setTech = onTechChange;

	const addEquipment = (artistBrings: boolean) => {
		setTech({
			...tech,
			equipment: [
				...tech.equipment,
				{ name: "", quantity: 1, artist_brings: artistBrings, notes: artistBrings ? "Optional" : undefined },
			],
		});
	};

	const updateEquipment = (index: number, update: Partial<EquipmentItem>) => {
		const equipment = [...tech.equipment];
		equipment[index] = { ...equipment[index], ...update };
		setTech({ ...tech, equipment });
	};

	const removeEquipment = (index: number) => {
		setTech({ ...tech, equipment: tech.equipment.filter((_, i) => i !== index) });
	};

	const venueItems = tech.equipment.filter((e) => !e.artist_brings);
	const artistItems = tech.equipment.filter((e) => e.artist_brings);

	return (
		<Accordion type="multiple" className="space-y-3">
			{/* Equipment */}
			<AccordionItem value="equipment" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Wrench className="h-4 w-4 text-violet-400" />
						<span>Equipment</span>
						<Badge className="bg-zinc-800 text-xs ml-2">{tech.equipment.length} item(s)</Badge>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-3 pt-2">
					{venueItems.length > 0 && (
						<div>
							<p className="text-sm font-medium text-red-400 mb-2">Venue Must Supply</p>
							<div className="space-y-2">
								{venueItems.map((item) => {
									const realIndex = tech.equipment.indexOf(item);
									return (
										<EquipmentRow
											key={`venue-${realIndex}`}
											item={item}
											index={realIndex}
											onUpdate={updateEquipment}
											onRemove={removeEquipment}
											onLinkInventory={onLinkInventory}
										/>
									);
								})}
							</div>
						</div>
					)}
					<Button variant="outline" size="sm" className="border-red-900/50 text-red-400 hover:bg-red-950/50" onClick={() => addEquipment(false)}>
						<Plus className="h-3 w-3 mr-1" /> Add Venue Supply Item
					</Button>

					{artistItems.length > 0 && (
						<div className="mt-3">
							<p className="text-sm font-medium text-green-400 mb-2">Artist Brings / Optional</p>
							<div className="space-y-2">
								{artistItems.map((item) => {
									const realIndex = tech.equipment.indexOf(item);
									return (
										<EquipmentRow
											key={`artist-${realIndex}`}
											item={item}
											index={realIndex}
											onUpdate={updateEquipment}
											onRemove={removeEquipment}
											onLinkInventory={onLinkInventory}
										/>
									);
								})}
							</div>
						</div>
					)}
					<Button variant="outline" size="sm" className="border-green-900/50 text-green-400 hover:bg-green-950/50 mt-2" onClick={() => addEquipment(true)}>
						<Plus className="h-3 w-3 mr-1" /> Add Artist-Brings Item
					</Button>
				</AccordionContent>
			</AccordionItem>

			{/* Backline & Mixer */}
			<AccordionItem value="backline" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Music className="h-4 w-4 text-emerald-400" />
						<span>Backline &amp; Mixer</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-4 pt-2">
					<div>
						<Label className="text-sm text-zinc-400">Mixer Minimum Requirements</Label>
						<Textarea
							placeholder="e.g. USB connectivity for MacBook required"
							value={tech.backline?.mixer_minimum_requirements || ""}
							onChange={(e) =>
								setTech({
									...tech,
									backline: { ...tech.backline!, mixer_minimum_requirements: e.target.value || undefined },
								})
							}
							className="bg-zinc-950 border-zinc-800 mt-1"
						/>
					</div>
					{/* Preferred Mixers */}
					<div>
						<Label className="text-sm text-zinc-400">Preferred Mixers</Label>
						{(tech.audio.preferred_mixers || []).map((m, i) => (
							<div key={`mix-${i}`} className="flex gap-2 mt-1 items-start">
								<Input placeholder="Model" value={m.model} onChange={(e) => {
									const mixers = [...(tech.audio.preferred_mixers || [])];
									mixers[i] = { ...mixers[i], model: e.target.value };
									setTech({ ...tech, audio: { ...tech.audio, preferred_mixers: mixers } });
								}} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Input type="number" placeholder="Priority" value={m.priority} onChange={(e) => {
									const mixers = [...(tech.audio.preferred_mixers || [])];
									mixers[i] = { ...mixers[i], priority: Math.max(1, parseInt(e.target.value) || 1) };
									setTech({ ...tech, audio: { ...tech.audio, preferred_mixers: mixers } });
								}} className="bg-zinc-950 border-zinc-800 w-20" />
								<Input placeholder="Features" value={m.required_features || ""} onChange={(e) => {
									const mixers = [...(tech.audio.preferred_mixers || [])];
									mixers[i] = { ...mixers[i], required_features: e.target.value || undefined };
									setTech({ ...tech, audio: { ...tech.audio, preferred_mixers: mixers } });
								}} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50" onClick={() => {
									const mixers = tech.audio.preferred_mixers?.filter((_, idx) => idx !== i);
									setTech({ ...tech, audio: { ...tech.audio, preferred_mixers: mixers } });
								}}><Trash2 className="h-4 w-4" /></Button>
							</div>
						))}
						<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={() => {
							const mixers = [...(tech.audio.preferred_mixers || []), { model: "", priority: 99 }];
							setTech({ ...tech, audio: { ...tech.audio, preferred_mixers: mixers } });
						}}><Plus className="h-3 w-3 mr-1" /> Add Mixer</Button>
					</div>
					{/* CDJs */}
					<div>
						<Label className="text-sm text-zinc-400">CDJs</Label>
						{(tech.backline?.cdjs || []).map((c, i) => (
							<div key={`cdj-${i}`} className="flex gap-2 mb-2 items-start">
								<Input placeholder="Model" value={c.model} onChange={(e) => {
									const cdjs = [...(tech.backline!.cdjs || [])];
									cdjs[i] = { ...cdjs[i], model: e.target.value };
									setTech({ ...tech, backline: { ...tech.backline!, cdjs } });
								}} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Input type="number" placeholder="Qty" value={c.quantity} onChange={(e) => {
									const cdjs = [...(tech.backline!.cdjs || [])];
									cdjs[i] = { ...cdjs[i], quantity: Math.max(1, parseInt(e.target.value) || 1) };
									setTech({ ...tech, backline: { ...tech.backline!, cdjs } });
								}} className="bg-zinc-950 border-zinc-800 w-20" />
								<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50" onClick={() => {
									const cdjs = tech.backline?.cdjs?.filter((_, idx) => idx !== i);
									setTech({ ...tech, backline: { ...tech.backline!, cdjs } });
								}}><Trash2 className="h-4 w-4" /></Button>
							</div>
						))}
						<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={() => {
							const cdjs = [...(tech.backline?.cdjs || []), { model: "", quantity: 1 }];
							setTech({ ...tech, backline: { ...tech.backline!, cdjs } });
						}}><Plus className="h-3 w-3 mr-1" /> Add CDJ</Button>
					</div>
					{/* Turntables */}
					<div>
						<Label className="text-sm text-zinc-400">Turntables</Label>
						{(tech.backline?.turntables || []).map((t, i) => (
							<div key={`tt-${i}`} className="flex gap-2 mb-2 items-start">
								<Input placeholder="Model" value={t.model} onChange={(e) => {
									const turntables = [...(tech.backline!.turntables || [])];
									turntables[i] = { ...turntables[i], model: e.target.value };
									setTech({ ...tech, backline: { ...tech.backline!, turntables } });
								}} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Input type="number" placeholder="Qty" value={t.quantity} onChange={(e) => {
									const turntables = [...(tech.backline!.turntables || [])];
									turntables[i] = { ...turntables[i], quantity: Math.max(1, parseInt(e.target.value) || 1) };
									setTech({ ...tech, backline: { ...tech.backline!, turntables } });
								}} className="bg-zinc-950 border-zinc-800 w-20" />
								<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50" onClick={() => {
									const turntables = tech.backline?.turntables?.filter((_, idx) => idx !== i);
									setTech({ ...tech, backline: { ...tech.backline!, turntables } });
								}}><Trash2 className="h-4 w-4" /></Button>
							</div>
						))}
						<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={() => {
							const turntables = [...(tech.backline?.turntables || []), { model: "", quantity: 1 }];
							setTech({ ...tech, backline: { ...tech.backline!, turntables } });
						}}><Plus className="h-3 w-3 mr-1" /> Add Turntable</Button>
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Audio Setup */}
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
							<Label className="text-sm text-zinc-400">Inputs Needed</Label>
							<Input type="number" value={tech.audio.inputs_needed} onChange={(e) =>
								setTech({ ...tech, audio: { ...tech.audio, inputs_needed: Math.max(1, parseInt(e.target.value) || 1) } })
							} className="bg-zinc-950 border-zinc-800" />
						</div>
						<div>
							<Label className="text-sm text-zinc-400">Monitor Type</Label>
							<Select value={tech.audio.monitor_type} onValueChange={(v) =>
								setTech({ ...tech, audio: { ...tech.audio, monitor_type: v } })
							}>
								<SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
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
						<Label className="text-sm text-zinc-400">Special Audio Requirements</Label>
						<Textarea placeholder="e.g. stereo signal, USB cable for MacBook" value={tech.audio.special_requirements || ""}
							onChange={(e) => setTech({ ...tech, audio: { ...tech.audio, special_requirements: e.target.value || undefined } })}
							className="bg-zinc-950 border-zinc-800 mt-1" />
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Transport */}
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
							<Switch checked={tech.transport?.flights_needed || false}
								onCheckedChange={(v) => setTech({ ...tech, transport: { ...tech.transport!, flights_needed: v } })} />
							<Label className="text-sm text-zinc-300">Flights Needed</Label>
						</div>
						<div className="flex items-center gap-3">
							<Switch checked={tech.transport?.priority_boarding || false}
								onCheckedChange={(v) => setTech({ ...tech, transport: { ...tech.transport!, priority_boarding: v } })} />
							<Label className="text-sm text-zinc-300">Priority Boarding</Label>
						</div>
					</div>
					<div>
						<Label className="text-sm text-zinc-400">Origin City</Label>
						<Input placeholder="e.g. Berlin" value={tech.transport?.origin_city || ""}
							onChange={(e) => setTech({ ...tech, transport: { ...tech.transport!, origin_city: e.target.value || undefined } })}
							className="bg-zinc-950 border-zinc-800" />
					</div>
					<div>
						<Label className="text-sm text-zinc-400">Baggage Requirements</Label>
						<Textarea placeholder="e.g. 2 large flight cases + 1 carry-on" value={tech.transport?.baggage_requirements || ""}
							onChange={(e) => setTech({ ...tech, transport: { ...tech.transport!, baggage_requirements: e.target.value || undefined } })}
							className="bg-zinc-950 border-zinc-800" />
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Referenced Images */}
			<AccordionItem value="images" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Music className="h-4 w-4 text-zinc-400" />
						<span>Referenced Images</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-2 pt-2">
					{referencedImages.items.map((img, i) => (
						<div key={i} className="flex gap-2">
							<Input value={img} onChange={(e) => referencedImages.update(i, e.target.value)}
								className="bg-zinc-950 border-zinc-800 flex-1" />
							<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50" onClick={() => referencedImages.remove(i)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
					<Button variant="outline" size="sm" className="border-zinc-700" onClick={referencedImages.add}>
						<Plus className="h-3 w-3 mr-1" /> Add Image URL
					</Button>
				</AccordionContent>
			</AccordionItem>

			{/* Technical Notes */}
			<AccordionItem value="notes" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Music className="h-4 w-4 text-zinc-400" />
						<span>Technical Notes</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="pt-2">
					<Textarea placeholder="Additional technical notes" value={tech.technical_notes || ""}
						onChange={(e) => setTech({ ...tech, technical_notes: e.target.value || undefined })}
						className="bg-zinc-950 border-zinc-800" />
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
