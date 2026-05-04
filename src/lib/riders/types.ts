// Shared rider types used across rider-viewer, rider-editor, and extract-rider API

export interface EquipmentItem {
	name: string;
	quantity: number;
	artist_brings: boolean;
	notes?: string;
	inventory_item_id?: string;
	inventory_item_name?: string;
}

export interface MixerRequirement {
	model: string;
	required_features?: string;
	priority: number;
}

export interface BacklineItem {
	model: string;
	quantity: number;
}

export interface StageMonitor {
	type: string;
	quantity: number;
	location: string;
}

export interface StagePower {
	type: string;
	quantity: number;
}

export interface StageFurniture {
	type: string;
	quantity: number;
	dimensions?: string;
}

export interface StageSetup {
	monitors?: StageMonitor[];
	power?: StagePower[];
	furniture?: StageFurniture[];
}

export interface TechRider {
	equipment: EquipmentItem[];
	stage_setup?: StageSetup;
	backline?: {
		cdjs?: BacklineItem[];
		turntables?: BacklineItem[];
		mixer_minimum_requirements?: string;
	};
	audio: {
		inputs_needed: number;
		monitor_type: string;
		preferred_mixers?: MixerRequirement[];
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
		staff?: {
			sound_tech?: boolean;
			sound_tech_notes?: string;
			lighting_tech?: boolean;
			lighting_tech_notes?: string;
			soundcheck_required?: boolean;
			soundcheck_duration_min?: number | null;
			set_required?: boolean;
			specific_time?: string | null;
			party_mentioned?: string | null;
		};
		stage?: {
			requirements?: string[];
		};
	};
}

export interface HospitalityRider {
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
		drinks: {
			alcopops: boolean;
			spirits: string[];
			mixers: string[];
			water: boolean;
		};
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
