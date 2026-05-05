"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, Music, Zap, ArmchairIcon } from "lucide-react";

interface StageSetup {
	monitors?: Array<{ type: string; quantity: number; location: string }>;
	power?: Array<{ type: string; quantity: number }>;
	furniture?: Array<{ type: string; quantity: number; dimensions?: string }>;
}

interface RiderEditorStageProps {
	stageSetup: StageSetup;
	onStageChange: (stage: StageSetup) => void;
}

export function RiderEditorStage({ stageSetup, onStageChange }: RiderEditorStageProps) {
	const setStage = onStageChange;
	const monitors = stageSetup.monitors || [];
	const power = stageSetup.power || [];
	const furniture = stageSetup.furniture || [];

	return (
		<Accordion type="multiple" className="space-y-3">
			<AccordionItem value="monitors" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Music className="h-4 w-4 text-cyan-400" />
						<span>Stage Monitors ({monitors.length})</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-2 pt-2">
					{monitors.map((m, i) => (
						<div key={`mon-${i}`} className="flex gap-2 mb-2 items-start">
							<Input placeholder="Type" value={m.type}
								onChange={(e) => {
									const upd = [...monitors];
									upd[i] = { ...upd[i], type: e.target.value };
									setStage({ ...stageSetup, monitors: upd });
								}}
								className="bg-zinc-950 border-zinc-800 flex-1" />
							<Input type="number" placeholder="Qty" value={m.quantity}
								onChange={(e) => {
									const upd = [...monitors];
									upd[i] = { ...upd[i], quantity: Math.max(1, parseInt(e.target.value) || 1) };
									setStage({ ...stageSetup, monitors: upd });
								}}
								className="bg-zinc-950 border-zinc-800 w-20" />
							<Input placeholder="Location" value={m.location}
								onChange={(e) => {
									const upd = [...monitors];
									upd[i] = { ...upd[i], location: e.target.value };
									setStage({ ...stageSetup, monitors: upd });
								}}
								className="bg-zinc-950 border-zinc-800 w-28" />
							<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50"
								onClick={() => setStage({ ...stageSetup, monitors: monitors.filter((_, idx) => idx !== i) })}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
					<Button variant="outline" size="sm" className="border-zinc-700"
						onClick={() => setStage({ ...stageSetup, monitors: [...monitors, { type: "", quantity: 1, location: "stage" }] })}>
						<Plus className="h-3 w-3 mr-1" /> Add Monitor
					</Button>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="power" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<Zap className="h-4 w-4 text-yellow-400" />
						<span>Power Requirements ({power.length})</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-2 pt-2">
					{power.map((p, i) => (
						<div key={`pow-${i}`} className="flex gap-2 mb-2 items-start">
							<Input placeholder="Type (e.g. Power Point)" value={p.type}
								onChange={(e) => {
									const upd = [...power];
									upd[i] = { ...upd[i], type: e.target.value };
									setStage({ ...stageSetup, power: upd });
								}}
								className="bg-zinc-950 border-zinc-800 flex-1" />
							<Input type="number" placeholder="Qty" value={p.quantity}
								onChange={(e) => {
									const upd = [...power];
									upd[i] = { ...upd[i], quantity: Math.max(1, parseInt(e.target.value) || 1) };
									setStage({ ...stageSetup, power: upd });
								}}
								className="bg-zinc-950 border-zinc-800 w-20" />
							<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50"
								onClick={() => setStage({ ...stageSetup, power: power.filter((_, idx) => idx !== i) })}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
					<Button variant="outline" size="sm" className="border-zinc-700"
						onClick={() => setStage({ ...stageSetup, power: [...power, { type: "", quantity: 1 }] })}>
						<Plus className="h-3 w-3 mr-1" /> Add Power
					</Button>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="furniture" className="border-zinc-800">
				<AccordionTrigger className="text-white hover:no-underline">
					<div className="flex items-center gap-2">
						<ArmchairIcon className="h-4 w-4 text-emerald-400" />
						<span>Furniture ({furniture.length})</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="space-y-2 pt-2">
					{furniture.map((f, i) => (
						<div key={`furn-${i}`} className="flex gap-2 mb-2 items-start">
							<Input placeholder="Type" value={f.type}
								onChange={(e) => {
									const upd = [...furniture];
									upd[i] = { ...upd[i], type: e.target.value };
									setStage({ ...stageSetup, furniture: upd });
								}}
								className="bg-zinc-950 border-zinc-800 flex-1" />
							<Input type="number" placeholder="Qty" value={f.quantity}
								onChange={(e) => {
									const upd = [...furniture];
									upd[i] = { ...upd[i], quantity: Math.max(1, parseInt(e.target.value) || 1) };
									setStage({ ...stageSetup, furniture: upd });
								}}
								className="bg-zinc-950 border-zinc-800 w-20" />
							<Input placeholder="Dimensions" value={f.dimensions || ""}
								onChange={(e) => {
									const upd = [...furniture];
									upd[i] = { ...upd[i], dimensions: e.target.value };
									setStage({ ...stageSetup, furniture: upd });
								}}
								className="bg-zinc-950 border-zinc-800 w-40" />
							<Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-950/50"
								onClick={() => setStage({ ...stageSetup, furniture: furniture.filter((_, idx) => idx !== i) })}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
					<Button variant="outline" size="sm" className="border-zinc-700"
						onClick={() => setStage({ ...stageSetup, furniture: [...furniture, { type: "", quantity: 1 }] })}>
						<Plus className="h-3 w-3 mr-1" /> Add Furniture
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
