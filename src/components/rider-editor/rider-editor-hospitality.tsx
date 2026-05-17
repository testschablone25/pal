"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2, Hotel, Car, Utensils } from "lucide-react";

interface HospitalRider {
	accommodation?: {
		required: boolean;
		nights: number;
		room_type: string;
		check_in?: string;
		check_out?: string;
		location_preference?: string;
	};
	catering?: {
		meals: string[];
		dietary: string[];
		drinks: { alcopops: boolean; spirits: string[]; mixers: string[]; water: boolean };
		special_requests?: string;
	};
	transport_ground?: {
		car_service: boolean;
		pickup_time?: string;
		pickup_location?: string;
		return_required: boolean;
		vehicle_type?: string;
	};
	hospitality_notes?: string;
}

interface StringArrayHook {
	items: string[];
	add: () => void;
	remove: (i: number) => void;
	update: (i: number, v: string) => void;
}

interface RiderEditorHospitalityProps {
	hosp: HospitalRider;
	onHospChange: (hosp: HospitalRider) => void;
	meals: StringArrayHook;
	dietary: StringArrayHook;
	spirits: StringArrayHook;
	mixers: StringArrayHook;
}

export function RiderEditorHospitality({
	hosp,
	onHospChange,
	meals,
	dietary,
	spirits,
	mixers,
}: RiderEditorHospitalityProps) {
	const setHosp = onHospChange;

	return (
		<Accordion type="multiple" className="space-y-3">
			{/* Accommodation */}
			<AccordionItem value="accommodation" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Hotel className="h-4 w-4 text-violet-400" />
						<span>Accommodation</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-3 pt-2">
					<div className="flex items-center gap-3">
						<Switch
							checked={hosp.accommodation?.required || false}
							onCheckedChange={(v) =>
								setHosp({
									...hosp,
									accommodation: v
										? { required: true, nights: 1, room_type: "double", check_in: "18:00", check_out: "14:00" }
										: undefined,
								})
							}
						/>
						<Label className="text-sm text-zinc-300">Accommodation Required</Label>
					</div>
					{hosp.accommodation?.required && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-sm text-zinc-400">Nights</Label>
									<Input type="number" value={hosp.accommodation.nights}
										onChange={(e) => setHosp({ ...hosp, accommodation: { ...hosp.accommodation!, nights: Math.max(1, parseInt(e.target.value) || 1) } })}
										className="bg-zinc-950 border-zinc-800" />
								</div>
								<div>
									<Label className="text-sm text-zinc-400">Room Type</Label>
									<Select value={hosp.accommodation.room_type}
										onValueChange={(v) => setHosp({ ...hosp, accommodation: { ...hosp.accommodation!, room_type: v } })}>
										<SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
										<SelectContent className="bg-zinc-900 border-zinc-800">
											<SelectItem value="single">Single</SelectItem>
											<SelectItem value="double">Double</SelectItem>
											<SelectItem value="suite">Suite</SelectItem>
											<SelectItem value="apartment">Apartment</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div>
								<Label className="text-sm text-zinc-400">Location Preference</Label>
								<Input placeholder="e.g. city center, near venue" value={hosp.accommodation.location_preference || ""}
									onChange={(e) => setHosp({ ...hosp, accommodation: { ...hosp.accommodation!, location_preference: e.target.value || undefined } })}
									className="bg-zinc-950 border-zinc-800" />
							</div>
						</>
					)}
				</AccordionContent>
			</AccordionItem>

			{/* Catering */}
			<AccordionItem value="catering" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Utensils className="h-4 w-4 text-orange-400" />
						<span>Catering &amp; Drinks</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-4 pt-2">
					{/* Meals */}
					<div>
						<Label className="text-sm text-zinc-400">Meals Required</Label>
						{meals.items.map((m, i) => (
							<div key={i} className="flex gap-2 mt-1">
								<Input value={m} onChange={(e) => meals.update(i, e.target.value)} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Button variant="ghost" size="icon" className="text-red-400" onClick={() => meals.remove(i)}><Trash2 className="h-4 w-4" /></Button>
							</div>
						))}
						<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={meals.add}>
							<Plus className="h-3 w-3 mr-1" /> Add Meal
						</Button>
					</div>

					{/* Dietary */}
					<div>
						<Label className="text-sm text-zinc-400">Dietary Requirements</Label>
						{dietary.items.map((d, i) => (
							<div key={i} className="flex gap-2 mt-1">
								<Input value={d} onChange={(e) => dietary.update(i, e.target.value)} className="bg-zinc-950 border-zinc-800 flex-1" />
								<Button variant="ghost" size="icon" className="text-red-400" onClick={() => dietary.remove(i)}><Trash2 className="h-4 w-4" /></Button>
							</div>
						))}
						<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={dietary.add}>
							<Plus className="h-3 w-3 mr-1" /> Add Dietary Restriction
						</Button>
					</div>

					{/* Drinks */}
					<div className="border border-zinc-800 rounded-lg p-3">
						<p className="text-sm font-medium text-zinc-300 mb-2">Drinks Rider</p>
						<div className="grid grid-cols-2 gap-3 mb-3">
							<div className="flex items-center gap-2">
								<Switch checked={hosp.catering?.drinks.alcopops || false}
									onCheckedChange={(v) => setHosp({ ...hosp, catering: { ...hosp.catering!, drinks: { ...hosp.catering!.drinks, alcopops: v } } })} />
								<Label className="text-sm text-zinc-300">Alcopops</Label>
							</div>
							<div className="flex items-center gap-2">
								<Switch checked={hosp.catering?.drinks.water || false}
									onCheckedChange={(v) => setHosp({ ...hosp, catering: { ...hosp.catering!, drinks: { ...hosp.catering!.drinks, water: v } } })} />
								<Label className="text-sm text-zinc-300">Water</Label>
							</div>
						</div>
						<div className="space-y-2">
							<div>
								<Label className="text-xs text-zinc-500">Spirits</Label>
								{spirits.items.map((s, i) => (
									<div key={i} className="flex gap-2 mt-1">
										<Input value={s} onChange={(e) => spirits.update(i, e.target.value)} className="bg-zinc-950 border-zinc-800 flex-1" />
										<Button variant="ghost" size="icon" className="text-red-400" onClick={() => spirits.remove(i)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								))}
								<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={spirits.add}>
									<Plus className="h-3 w-3 mr-1" /> Add Spirit
								</Button>
							</div>
							<div>
								<Label className="text-xs text-zinc-500">Mixers</Label>
								{mixers.items.map((mx, i) => (
									<div key={i} className="flex gap-2 mt-1">
										<Input value={mx} onChange={(e) => mixers.update(i, e.target.value)} className="bg-zinc-950 border-zinc-800 flex-1" />
										<Button variant="ghost" size="icon" className="text-red-400" onClick={() => mixers.remove(i)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								))}
								<Button variant="outline" size="sm" className="border-zinc-700 mt-1" onClick={mixers.add}>
									<Plus className="h-3 w-3 mr-1" /> Add Mixer
								</Button>
							</div>
						</div>
					</div>

					<div>
						<Label className="text-sm text-zinc-400">Special Food Requests</Label>
						<Textarea placeholder="Any special requests or notes" value={hosp.catering?.special_requests || ""}
							onChange={(e) => setHosp({ ...hosp, catering: { ...hosp.catering!, special_requests: e.target.value || undefined } })}
							className="bg-zinc-950 border-zinc-800" />
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Ground Transport */}
			<AccordionItem value="transport" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Car className="h-4 w-4 text-cyan-400" />
						<span>Ground Transport</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-3 pt-2">
					<div className="flex items-center gap-3">
						<Switch checked={hosp.transport_ground?.car_service || false}
							onCheckedChange={(v) => setHosp({ ...hosp, transport_ground: v ? { car_service: true, return_required: false } : undefined })} />
						<Label className="text-sm text-zinc-300">Car Service Required</Label>
					</div>
					{hosp.transport_ground?.car_service && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-sm text-zinc-400">Pickup Time</Label>
									<Input type="time" value={hosp.transport_ground.pickup_time || "20:00"}
										onChange={(e) => setHosp({ ...hosp, transport_ground: { ...hosp.transport_ground!, pickup_time: e.target.value } })}
										className="bg-zinc-950 border-zinc-800" />
								</div>
								<div>
									<Label className="text-sm text-zinc-400">Vehicle Type</Label>
									<Select value={hosp.transport_ground.vehicle_type || "sedan"}
										onValueChange={(v) => setHosp({ ...hosp, transport_ground: { ...hosp.transport_ground!, vehicle_type: v } })}>
										<SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
										<SelectContent className="bg-zinc-900 border-zinc-800">
											<SelectItem value="sedan">Sedan</SelectItem>
											<SelectItem value="van">Van</SelectItem>
											<SelectItem value="suv">SUV</SelectItem>
											<SelectItem value="sprinter">Sprinter</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div>
								<Label className="text-sm text-zinc-400">Pickup Location</Label>
								<Input placeholder="e.g. Hotel" value={hosp.transport_ground.pickup_location || ""}
									onChange={(e) => setHosp({ ...hosp, transport_ground: { ...hosp.transport_ground!, pickup_location: e.target.value } })}
									className="bg-zinc-950 border-zinc-800" />
							</div>
							<div className="flex items-center gap-3">
								<Switch checked={hosp.transport_ground.return_required}
									onCheckedChange={(v) => setHosp({ ...hosp, transport_ground: { ...hosp.transport_ground!, return_required: v } })} />
								<Label className="text-sm text-zinc-300">Return Trip Required</Label>
							</div>
						</>
					)}
				</AccordionContent>
			</AccordionItem>

			{/* Hospitality Notes */}
			<AccordionItem value="notes" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Utensils className="h-4 w-4 text-zinc-400" />
						<span>Hospitality Notes</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="pt-2">
					<Textarea placeholder="Additional hospitality notes" value={hosp.hospitality_notes || ""}
						onChange={(e) => setHosp({ ...hosp, hospitality_notes: e.target.value })}
						className="bg-zinc-950 border-zinc-800" />
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
