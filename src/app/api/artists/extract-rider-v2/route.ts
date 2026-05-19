/**
 * Updated Rider Extraction API
 * Uses hybrid approach: text extraction + vision fallback
 */

import { NextRequest, NextResponse } from "next/server";
import {
	extractRiderHybrid,
	extractWithMethod,
} from "@/lib/riders/hybrid-extraction";
import { generateRiderTasksForArtist } from "@/lib/riders/task-generation";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL = "google/gemma-4-e2b";
const VISION_MODEL = process.env.VISION_MODEL || "llava-v1.6-vicuna-7b";

// Extraction prompt
const EXTRACTION_PROMPT = `You are an expert at extracting technical and hospitality rider data from PDF documents. 
Analyze the PDF text carefully and extract ALL information into the correct JSON fields. Be thorough - do not leave information unextracted.

CRITICAL FIELD MAPPING RULES:

## TECHNICAL RIDER (Stage & Performance Equipment)

### 1. BACKLINE (CRITICAL - DJ Equipment)
- Extract ALL CDJs, mixers, turntables into backline
- Examples:
  - "3x CDJ2000 NEXUS (Linked)" → "cdjs": [{"model": "CDJ2000 NEXUS", "quantity": 3}]
  - "x1 Allen&Heath 92 or 96 mixer" → "mixer_minimum_requirements": "Allen&Heath 92 or 96 mixer required"
- If artist specifies "DJ setup" or "DJ equipment" or mentions specific mixer/CDJ models, extract them!

### 2. STAGE SETUP (Monitors, Power, Furniture)
- "monitors": Extract booth monitors, wedge monitors
  - Example: "2x high quality booth monitors w/ full volume control" → monitors: [{"type": "Booth Monitors", "quantity": 2, "location": "booth", "notes": "with full volume control"}]
- "furniture": Tables, laptop stands, DJ booth

### 3. AUDIO (inputs_needed, monitor_type, special_requirements)
- "inputs_needed": number of audio inputs required
- "monitor_type": type of monitor (booth, wedge, in-ear, etc.)
- "special_requirements": any additional audio requirements

### 4. PERFORMANCE REQUIREMENTS - STAFF (CRITICAL - check every rider for these)
- Look for mentions of: "Sound Technician", "Sound Tech", "Lighting Technician", "Lighting Tech", "Tech Rider", "Stage Manager"
- Map to boolean fields:
  - "sound_tech": true if ANY sound technician/staff is mentioned
  - "lighting_tech": true if ANY lighting technician/staff is mentioned
  - Add details in _notes fields

### 5. EQUIPMENT (equipment array)
- "artist_brings": true if artist brings it, false if venue must supply
- Include quantity and any notes

### 6. TECHNICAL NOTES
- Any technical specifications, diagrams, special instructions that don't fit above
- DO NOT put travel/booking info here - that's for hospitality!

## HOSPITALITY RIDER

### 1. TRAVEL REQUIREMENTS (CRITICAL - goes in transport_ground, NOT in tech_rider!)
This is NOT the technical transport - it's how the artist gets to the venue!
- "flights_needed": true if ANY travel/flight info is mentioned (booking requirements, priority boarding, baggage, seat preferences, travel agent info) - if travel info exists, flights_needed should ALWAYS be true!
- "origin_city": departure city (e.g., "Flying from London", "Origin: Berlin")
- "priority_boarding": true if mentioned
- "baggage_requirements": hand luggage only, checked bags, seat preferences (window/aisle)
- "travel_booking_notes": "Travel options must be sent to agent before booking", "Priority boarding and window or aisle seat must be booked for low-budget airlines"
- Put ALL travel/flight info in transport_ground, NOT in tech_rider!

### 2. GROUND TRANSPORT (transport_ground)
- "car_service": true if car/van transport needed
- "pickup_time": pickup time
- "pickup_location": pickup location (airport, station)
- "return_required": return transport needed
- "vehicle_type": type of vehicle

### 3. ACCOMMODATION (nights, room_type, bed_type, hotel_requirements, check_in, check_out)
- "nights": number of nights required
- "room_type": Double, Single, Twin, Suite, "Double Room for single use"
- "bed_type": EXACTLY as written - preserve all details! Example: "double (x2 single beds is not acceptable)" or "king size bed required" - do NOT simplify or rewrite!
- "hotel_requirements": "minimum 4* hotel", "breakfast included", "free WIFI", "late checkout"
- "check_in": check-in time
- "check_out": check-out time (e.g., "late check-out")
- Extract hotel star requirements and amenities into hotel_requirements!

### 4. CATERING (meals, dietary, drinks, special_requests)
- "meals": Array of meal descriptions
- "dietary": Array of dietary requirements (snacks, allergies)
- "drinks.water": true if still water/bottled water mentioned
- "special_requests": Buyout options

### 5. HOSPITALITY NOTES
- Use ONLY for miscellaneous info that doesn't fit above

## EXTRACTION EXAMPLES:

Input: "3x CDJ2000 NEXUS (Linked) - x1 Allen&Heath 92 or 96 mixer"
Output: "backline": { "cdjs": [{"model": "CDJ2000 NEXUS", "quantity": 3}], "mixer_minimum_requirements": "Allen&Heath 92 or 96 mixer required" }

Input: "2x high quality booth monitors w/ full volume control"
Output: "stage_setup": { "monitors": [{"type": "Booth Monitors", "quantity": 2, "location": "booth", "notes": "with full volume control"}] }

Input: "Sound Technician and Lighting Technician required for the show"
Output: "performance_requirements": { "staff": { "sound_tech": true, "sound_tech_notes": "Sound Technician required", "lighting_tech": true, "lighting_tech_notes": "Lighting Technician required" } }

Input: "Travel options must be sent to agent before booking. Hand luggage only. Priority boarding and window or aisle seat must be booked for low-budget airlines."
Output: "transport_ground": { "flights_needed": true, "priority_boarding": true, "baggage_requirements": "hand luggage only", "travel_booking_notes": "Travel options must be sent to agent before booking. Priority boarding and window or aisle seat must be booked for low-budget airlines." }

Input: "x1 Double Room for single use, minimum of 4*. Bed must be double (x2 single beds is not acceptable). Hotel must include late checkout, breakfast & free WIFI in room."
Output: "accommodation": { "required": true, "nights": 1, "room_type": "Double Room for single use", "bed_type": "double (x2 single beds is not acceptable)", "hotel_requirements": "minimum 4* hotel with late checkout, breakfast and free WIFI", "check_out": "late checkout" }

Input: "1 night(s), Double Room for single use, minimum of 4*. Hotel must include late checkout, breakfast & free WIFI"
Output: "accommodation": { "required": true, "nights": 1, "room_type": "Double Room for single use", "check_out": "late checkout", "hotel_requirements": "minimum 4* hotel with breakfast and free WIFI" }

Input: "x1 hot, substantial, nutritious meal to be served at the artists' discretion. Snacks: bananas, nuts (NO hazelnuts and almonds), dark chocolate. Alternatively, promoter agrees to pay £45/€50 buyout per person per day."
Output: "catering": { "meals": ["x1 hot substantial nutritious meal at artist's discretion"], "dietary": ["bananas", "nuts (NO hazelnuts and almonds)", "dark chocolate"], "special_requests": "Promoter can pay £45/€50 buyout per person per day instead of catering" }

Return JSON only. No markdown. No commentary.

Schema:
{
  "tech_rider": {
    "equipment": [{ "name": "", "quantity": 1, "artist_brings": false, "notes": "" }],
    "stage_setup": {
      "monitors": [{ "type": "", "quantity": 0, "location": "", "notes": "" }],
      "power": [{ "type": "", "quantity": 0 }],
      "furniture": [{ "type": "", "quantity": 0, "dimensions": "" }]
    },
    "backline": {
      "cdjs": [{ "model": "", "quantity": 0 }],
      "turntables": [{ "model": "", "quantity": 0 }],
      "mixer_minimum_requirements": ""
    },
    "audio": {
      "inputs_needed": 2,
      "monitor_type": "booth",
      "preferred_mixers": [{ "model": "", "required_features": "", "priority": 1 }],
      "special_requirements": ""
    },
    "technical_notes": "",
    "referenced_images": [""],
    "performance_requirements": {
      "staff": {
        "sound_tech": false,
        "sound_tech_notes": "",
        "lighting_tech": false,
        "lighting_tech_notes": "",
        "soundcheck_required": false,
        "soundcheck_duration_min": null,
        "set_required": false,
        "specific_time": null,
        "party_mentioned": null
      },
      "stage": {
        "requirements": [""]
      }
    }
  },
  "hospitality_rider": {
    "accommodation": {
      "required": false,
      "nights": 0,
      "room_type": "",
      "bed_type": "",
      "hotel_requirements": "",
      "check_in": "",
      "check_out": "",
      "location_preference": ""
    },
    "catering": {
      "meals": [""],
      "dietary": [""],
      "drinks": {
        "alcopops": false,
        "spirits": [""],
        "mixers": [""],
        "water": false
      },
      "special_requests": ""
    },
    "transport_ground": {
      "flights_needed": false,
      "origin_city": "",
      "priority_boarding": false,
      "baggage_requirements": "",
      "travel_booking_notes": "",
      "car_service": false,
      "pickup_time": "",
      "pickup_location": "",
      "return_required": false,
      "vehicle_type": ""
    },
    "hospitality_notes": ""
  }
}`;

/**
 * Parse JSON from AI response
 */
function extractJsonFromResponse(
	content: string,
): Record<string, unknown> | null {
	if (!content) return null;

	// Try to find JSON in the response
	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return null;

	try {
		const parsed = JSON.parse(jsonMatch[0]);
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Call LM Studio API for text extraction
 */
async function callLmStudio(
	text: string,
	model: string,
): Promise<Record<string, unknown> | null> {
	try {
		const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: EXTRACTION_PROMPT },
					{ role: "user", content: text.slice(0, 12000) },
				],
				temperature: 0.1,
				max_tokens: 3000,
			}),
			signal: AbortSignal.timeout(120000),
		});

		if (!response.ok) {
			console.error(`[LM Studio] HTTP ${response.status}`);
			return null;
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content;
		return extractJsonFromResponse(content);
	} catch (error: any) {
		console.error(`[LM Studio] Error: ${error.message}`);
		return null;
	}
}

/**
 * Call LM Studio API for vision extraction
 */
async function callLmStudioVision(
	imageBase64: string,
	model: string,
): Promise<Record<string, unknown> | null> {
	try {
		const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: EXTRACTION_PROMPT },
					{
						role: "user",
						content: [
							{ type: "text", text: "Extract rider data from this PDF image:" },
							{
								type: "image_url",
								image_url: { url: `data:image/png;base64,${imageBase64}` },
							},
						],
					},
				],
				temperature: 0.1,
				max_tokens: 3000,
			}),
			signal: AbortSignal.timeout(120000),
		});

		if (!response.ok) {
			console.error(`[LM Studio Vision] HTTP ${response.status}`);
			return null;
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content;
		return extractJsonFromResponse(content);
	} catch (error: any) {
		console.error(`[LM Studio Vision] Error: ${error.message}`);
		return null;
	}
}

/**
 * Main extraction function with hybrid approach
 */
/**
 * Post-process extracted data to fix common model extraction issues
 * The AI model doesn't always follow the schema perfectly, so we fix common issues here
 */
function normalizeExtractedData(data: Record<string, unknown>): void {
	const hospitality = data.hospitality_rider as
		| Record<string, unknown>
		| undefined;
	if (!hospitality) return;

	const transport = hospitality.transport_ground as
		| Record<string, unknown>
		| undefined;
	if (!transport) return;

	// Fix: If there's any travel info but flights_needed is false, set it to true
	const hasTravelInfo =
		transport.baggage_requirements ||
		transport.travel_booking_notes ||
		transport.priority_boarding ||
		transport.origin_city;

	const flightsNeeded = transport.flights_needed as boolean | undefined;

	if (hasTravelInfo && flightsNeeded === false) {
		console.log(
			"[Normalize] Setting flights_needed to true due to travel info",
		);
		transport.flights_needed = true;
	}

	// Fix: If there's accommodation info but required is not set, set it to true
	const accommodation = hospitality.accommodation as
		| Record<string, unknown>
		| undefined;
	if (accommodation) {
		const hasAccommodationInfo =
			accommodation.room_type ||
			accommodation.bed_type ||
			accommodation.hotel_requirements;
		const required = accommodation.required as boolean | undefined;
		if (hasAccommodationInfo && required === false) {
			console.log(
				"[Normalize] Setting accommodation.required to true due to accommodation info",
			);
			accommodation.required = true;
		}
	}
}

async function extractRider(
	buffer: Buffer,
	method: "auto" | "text" | "vision",
) {
	const startTime = Date.now();
	let extractionMethod = method;
	let extractedData: Record<string, unknown> | null = null;
	let warnings: string[] = [];

	// Step 1: Try text extraction
	if (method === "auto" || method === "text") {
		console.log("[Extract] Trying text extraction...");
		const textResult = await extractRiderHybrid(buffer, {
			lmStudioUrl: LM_STUDIO_URL,
			modelName: DEFAULT_MODEL,
			useVisionFallback: method === "auto",
		});

		if (textResult.quality !== "failed") {
			console.log(`[Extract] Text extraction: ${textResult.quality}`);
			extractedData = await callLmStudio(textResult.text, DEFAULT_MODEL);
			extractionMethod = "text";
			warnings = textResult.warnings;
		}
	}

	// Step 2: If text extraction failed or method is vision, use vision
	if (!extractedData && (method === "auto" || method === "vision")) {
		console.log("[Extract] Text extraction failed, trying vision...");
		extractionMethod = "vision";

		// Render PDF to image
		const { renderPdfToImages } = await import("@/lib/riders/pdf-to-image");
		const pages = await renderPdfToImages(buffer, { scale: 2.0, maxPages: 1 });

		if (pages.length > 0) {
			console.log("[Extract] Calling vision model...");
			extractedData = await callLmStudioVision(
				pages[0].imageData,
				VISION_MODEL,
			);
			warnings.push("Extracted using vision model");
		} else {
			warnings.push("Could not render PDF to image");
		}
	}

	const duration = Date.now() - startTime;

	return {
		extractedData,
		method: extractionMethod,
		duration,
		warnings,
	};
}

/**
 * GET - Check extraction status
 */
export async function GET() {
	try {
		const response = await fetch(`${LM_STUDIO_URL}/models`, {
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			return NextResponse.json({
				status: "disconnected",
				message: "LM Studio not running",
			});
		}

		const data = await response.json();
		const models = Array.isArray(data.data)
			? data.data.map((m: any) => m.id)
			: [];

		return NextResponse.json({
			status: "connected",
			models,
			defaultModel: DEFAULT_MODEL,
			visionModel: VISION_MODEL,
		});
	} catch {
		return NextResponse.json({
			status: "disconnected",
			message: "LM Studio not accessible",
		});
	}
}

/**
 * POST - Extract rider from PDF
 */
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "ARTISTS_WRITE");
		if (!auth.authorized) return auth.response;

		const supabase = getAuthenticatedClient(request);
		const formData = await request.formData();
		const file = formData.get("file");
		const artistId = formData.get("artist_id");
		const riderType = formData.get("rider_type");
		const eventId = formData.get("event_id");
		const method = formData.get("method") || "auto"; // 'auto', 'text', or 'vision'

		if (!(file instanceof File) || typeof artistId !== "string") {
			return NextResponse.json(
				{ error: "Missing file or artist_id" },
				{ status: 400 },
			);
		}

		if (file.type !== "application/pdf") {
			return NextResponse.json(
				{ error: "Only PDF files are supported" },
				{ status: 400 },
			);
		}

		console.log(`[API] Processing: ${file.name} (method: ${method})`);

		// Read file buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// Extract rider data
		const {
			extractedData,
			method: usedMethod,
			duration,
			warnings,
		} = await extractRider(buffer, method as any);

		if (!extractedData) {
			return NextResponse.json(
				{ error: "Failed to extract rider data", warnings },
				{ status: 500 },
			);
		}

		// Post-process extracted data to fix common model extraction issues
		normalizeExtractedData(extractedData);

		// Update artist record
		const updateData: Record<string, unknown> = {};
		if (riderType === "tech" || riderType === "both") {
			updateData.tech_rider = (extractedData as any).tech_rider;
		}
		if (riderType === "hospitality" || riderType === "both" || !riderType) {
			updateData.hospitality_rider = (extractedData as any).hospitality_rider;
		}

		// Add document to artist's documents
		const { data: artist } = await supabase
			.from("artists")
			.select("documents, tech_rider, hospitality_rider")
			.eq("id", artistId)
			.single();

		const documents = Array.isArray(artist?.documents)
			? [...artist.documents]
			: [];

		if (artist?.tech_rider || artist?.hospitality_rider) {
			documents.push({
				name: `Rider Archive - ${new Date().toISOString().split("T")[0]}`,
				type: "archived_rider",
				archived_at: new Date().toISOString(),
				tech_rider: artist.tech_rider,
				hospitality_rider: artist.hospitality_rider,
			});
		}

		documents.push({
			name: file.name,
			type: "rider",
			uploaded_at: new Date().toISOString(),
		});
		updateData.documents = documents;

		const { error: updateError } = await supabase
			.from("artists")
			.update(updateData)
			.eq("id", artistId);

		if (updateError) {
			return NextResponse.json(
				{ error: `Failed to save rider: ${updateError.message}` },
				{ status: 500 },
			);
		}

		// Generate tasks
		let tasksCreated = 0;
		let taskEvents: any[] = [];
		let taskWarnings: string[] = [];

		try {
			const taskResult = await generateRiderTasksForArtist(
				supabase,
				artistId,
				typeof eventId === "string" ? eventId : undefined,
			);
			tasksCreated = taskResult.tasks_created;
			taskEvents = taskResult.events;
			taskWarnings = taskResult.warnings;
		} catch (taskError: any) {
			console.error("[Tasks] Generation failed:", taskError.message);
			taskWarnings.push("Rider saved, but automatic task generation failed");
		}

		return NextResponse.json({
			success: true,
			extractionMethod: usedMethod,
			durationMs: duration,
			tech_rider: (extractedData as any).tech_rider,
			hospitality_rider: (extractedData as any).hospitality_rider,
			tasks_created: tasksCreated,
			task_events: taskEvents,
			warnings: [...warnings, ...taskWarnings],
		});
	} catch (error: any) {
		console.error("[API] Error:", error);
		return NextResponse.json(
			{ error: "Internal server error", details: error.message },
			{ status: 500 },
		);
	}
}
