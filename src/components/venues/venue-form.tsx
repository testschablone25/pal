"use client";

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
import { Loader2 } from "lucide-react";

export interface VenueFormData {
	name: string;
	address: string;
	capacity: number;
	venue_type: string;
	contact_name: string;
	contact_phone: string;
	contact_email: string;
	notes: string;
}

export const VENUE_TYPES = [
	{ value: "", label: "Select type..." },
	{ value: "venue", label: "Venue" },
	{ value: "storage", label: "Lager (Storage)" },
	{ value: "office", label: "Office" },
	{ value: "mixed", label: "Mixed" },
];

export const venueTypeLabel: Record<string, string> = {
	venue: "Venue",
	storage: "Lager",
	office: "Office",
	mixed: "Mixed",
};

export const defaultVenueFormData = (
	overrides?: Partial<VenueFormData>,
): VenueFormData => ({
	name: "",
	address: "",
	capacity: 0,
	venue_type: "",
	contact_name: "",
	contact_phone: "",
	contact_email: "",
	notes: "",
	...overrides,
});

interface VenueFormProps {
	formData: VenueFormData;
	onFormChange: (data: VenueFormData) => void;
	onSubmit: (e: React.FormEvent) => Promise<void>;
	onCancel: () => void;
	submitLabel: string;
	submitting: boolean;
}

export function VenueForm({
	formData,
	onFormChange,
	onSubmit,
	onCancel,
	submitLabel,
	submitting,
}: VenueFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Venue Name *</label>
				<Input
					value={formData.name}
					onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
					placeholder="e.g., Club Neon"
					className="bg-zinc-950 border-zinc-800"
					autoFocus
					required
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Address</label>
				<Input
					value={formData.address}
					onChange={(e) =>
						onFormChange({ ...formData, address: e.target.value })
					}
					placeholder="Street address"
					className="bg-zinc-950 border-zinc-800"
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Venue Type</label>
				<Select
					value={formData.venue_type || undefined}
					onValueChange={(v) => onFormChange({ ...formData, venue_type: v })}
				>
					<SelectTrigger className="bg-zinc-950 border-zinc-800">
						<SelectValue placeholder="Select venue type" />
					</SelectTrigger>
					<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
						{VENUE_TYPES.filter((t) => t.value).map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Capacity *</label>
				<Input
					type="number"
					min={1}
					value={formData.capacity ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						onFormChange({
							...formData,
							capacity: val === "" ? 0 : parseInt(val, 10) || 0,
						});
					}}
					placeholder="Max capacity"
					className="bg-zinc-950 border-zinc-800"
					required
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="text-sm text-zinc-400 mb-1 block">
						Contact Name
					</label>
					<Input
						value={formData.contact_name}
						onChange={(e) =>
							onFormChange({ ...formData, contact_name: e.target.value })
						}
						placeholder="Venue manager"
						className="bg-zinc-950 border-zinc-800"
					/>
				</div>
				<div>
					<label className="text-sm text-zinc-400 mb-1 block">
						Contact Phone
					</label>
					<Input
						value={formData.contact_phone}
						onChange={(e) =>
							onFormChange({ ...formData, contact_phone: e.target.value })
						}
						placeholder="+49 ..."
						className="bg-zinc-950 border-zinc-800"
					/>
				</div>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">
					Contact Email
				</label>
				<Input
					type="email"
					value={formData.contact_email}
					onChange={(e) =>
						onFormChange({ ...formData, contact_email: e.target.value })
					}
					placeholder="contact@venue.com"
					className="bg-zinc-950 border-zinc-800"
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Notes</label>
				<Textarea
					value={formData.notes}
					onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
					placeholder="Load-in instructions, emergency contacts, venue rules..."
					className="bg-zinc-950 border-zinc-800 min-h-[80px]"
				/>
			</div>
			<div className="flex gap-2 pt-4">
				<Button
					type="submit"
					className="bg-violet-600 hover:bg-violet-700"
					disabled={submitting}
				>
					{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					{submitLabel}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="border-zinc-700"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
