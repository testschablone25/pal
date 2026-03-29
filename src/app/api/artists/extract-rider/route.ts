import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";

import { generateRiderTasksForArtist } from "@/lib/riders/task-generation";
import { supabaseConfig } from "@/lib/supabase/config";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL = "qwen3.5-2b";

const EXTRACTION_PROMPT = `Extract technical and hospitality rider data from the PDF text.

Return JSON only. No markdown. No commentary.

Schema:
{
  "tech_rider": {
    "equipment": [{ "name": "", "quantity": 1, "artist_brings": false, "notes": "" }],
    "stage_setup": {
      "monitors": [{ "type": "", "quantity": 0, "location": "" }],
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
    "transport": {
      "flights_needed": false,
      "priority_boarding": false,
      "baggage_requirements": "",
      "origin_city": ""
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
      "car_service": false,
      "pickup_time": "",
      "pickup_location": "",
      "return_required": false,
      "vehicle_type": ""
    },
    "hospitality_notes": ""
  }
}

Rules:
- Items under "THE ARTIST WILL BRING" are artist_brings=true.
- Items under "THE PROMOTER MUST PROVIDE" or "VENUE MUST PROVIDE" are artist_brings=false.
- FX Pedals are optional items the artist brings. Set artist_brings=true and notes="Optional".
- Put stage monitors, power points/sockets, tables, and laptop stands into stage_setup.
- Put mixer choices and USB-for-MacBook requirements into audio.preferred_mixers and backline.mixer_minimum_requirements.
- Put picture or image references into referenced_images.
- Extract travel requirements, hotel requirements, catering, and ground transport into hospitality_rider.
- Extract staff timing: soundcheck_required (boolean), soundcheck_duration_min (number or null).
- Extract if set performance is required: set_required (boolean).
- Extract specific time mentions: specific_time (string like "22:00" or null).
- Extract specific party/person mentioned: party_mentioned (name string or null).
- If no specific time mentioned, set specific_time to null.
- If no specific person/party mentioned for the task, set party_mentioned to null.
- If a field is missing, use false, 0, "", or [] instead of omitting it.`;

interface PdfTextRun {
  T: string;
}

interface PdfTextItem {
  x: number;
  y: number;
  R: PdfTextRun[];
}

interface PdfPage {
  Texts: PdfTextItem[];
}

interface EquipmentItem {
  name: string;
  quantity: number;
  artist_brings: boolean;
  notes?: string;
}

interface MixerRequirement {
  model: string;
  required_features?: string;
  priority: number;
}

interface BacklineItem {
  model: string;
  quantity: number;
}

interface StageMonitor {
  type: string;
  quantity: number;
  location: string;
}

interface StagePower {
  type: string;
  quantity: number;
}

interface StageFurniture {
  type: string;
  quantity: number;
  dimensions?: string;
}

interface StageSetup {
  monitors: StageMonitor[];
  power: StagePower[];
  furniture: StageFurniture[];
}

interface TechRider {
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

interface HospitalityRider {
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

interface ExtractionResult {
  tech_rider: TechRider;
  hospitality_rider: HospitalityRider;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      return Number.parseInt(match[0], 10);
    }
  }
  return fallback;
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "required"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

function joinNotes(values: Array<string | undefined | null>): string | undefined {
  const joined = uniqueStrings(values).join("\n");
  return joined || undefined;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dedupeItems<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isUppercaseHeader(line: string): boolean {
  const lettersOnly = line.replace(/[^A-Z]/g, "");
  return lettersOnly.length >= 5 && line === line.toUpperCase();
}

function findBlock(lines: string[], headers: RegExp[]): string[] {
  const start = lines.findIndex((line) => headers.some((header) => header.test(line)));
  if (start === -1) {
    return [];
  }

  const block: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (block.length > 0 && isUppercaseHeader(line)) {
      break;
    }
    block.push(line);
  }
  return block;
}

function parseQuantityFromLine(line: string, pattern: string, fallback: number): number {
  const patterns = [
    new RegExp(`x\\s*(\\d+)\\s*${pattern}`, "i"),
    new RegExp(`(\\d+)\\s*x\\s*${pattern}`, "i"),
    new RegExp(`(\\d+)\\s*${pattern}`, "i"),
    new RegExp(`${pattern}[^\\n.]{0,30}?x\\s*(\\d+)`, "i"),
  ];

  for (const regex of patterns) {
    const match = line.match(regex);
    if (match?.[1]) {
      return Number.parseInt(match[1], 10);
    }
  }

  return fallback;
}

function parseStringList(line: string): string[] {
  return line
    .replace(/^[*-]\s*/, "")
    .split(/,| and /i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEquipment(raw: unknown): EquipmentItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items = raw
    .map((item): EquipmentItem | null => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) {
          return null;
        }
        return {
          name: trimmed.replace(/^(?:x|×)?\s*\d+\s*/i, "").trim(),
          quantity: toNumberValue(trimmed, 1),
          artist_brings: false,
        };
      }

      if (!isRecord(item)) {
        return null;
      }

      const name = toStringValue(item.name);
      if (!name) {
        return null;
      }

      const normalizedName = name.replace(/^(?:x|×)?\s*\d+\s*/i, "").trim();
      const notes = toStringValue(item.notes) || undefined;
      const artistBrings = toBooleanValue(item.artist_brings);

      return {
        name: normalizedName,
        quantity: Math.max(1, toNumberValue(item.quantity, toNumberValue(name, 1))),
        artist_brings:
          artistBrings || /fx|pedal|effect/i.test(normalizedName),
        notes:
          /fx|pedal|effect/i.test(normalizedName) && !notes
            ? "Optional"
            : notes,
      };
    })
    .filter((item): item is EquipmentItem => item !== null);

  return dedupeItems(items, (item) => `${normalizeName(item.name)}|${item.artist_brings}|${item.notes || ""}`);
}

function normalizeMixerRequirements(raw: unknown): MixerRequirement[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return dedupeItems(
    raw
      .map((item): MixerRequirement | null => {
        if (typeof item === "string") {
          const model = item.trim();
          return model ? { model, priority: 99 } : null;
        }

        if (!isRecord(item)) {
          return null;
        }

        const model = toStringValue(item.model);
        if (!model) {
          return null;
        }

        return {
          model,
          required_features: toStringValue(item.required_features) || undefined,
          priority: Math.max(1, toNumberValue(item.priority, 99)),
        };
      })
      .filter((item): item is MixerRequirement => item !== null),
    (item) => normalizeName(item.model),
  ).sort((left, right) => left.priority - right.priority);
}

function normalizeStageSetup(raw: unknown): StageSetup | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const normalizeMonitors = Array.isArray(raw.monitors)
    ? raw.monitors
        .map((item): StageMonitor | null => {
          if (!isRecord(item)) {
            return null;
          }
          const type = toStringValue(item.type);
          if (!type) {
            return null;
          }
          return {
            type,
            quantity: Math.max(1, toNumberValue(item.quantity, 1)),
            location: toStringValue(item.location, "stage"),
          };
        })
        .filter((item): item is StageMonitor => item !== null)
    : [];

  const normalizePower = Array.isArray(raw.power)
    ? raw.power
        .map((item): StagePower | null => {
          if (!isRecord(item)) {
            return null;
          }
          const type = toStringValue(item.type);
          if (!type) {
            return null;
          }
          return {
            type,
            quantity: Math.max(1, toNumberValue(item.quantity, 1)),
          };
        })
        .filter((item): item is StagePower => item !== null)
    : [];

  const normalizeFurniture = Array.isArray(raw.furniture)
    ? raw.furniture
        .map((item): StageFurniture | null => {
          if (!isRecord(item)) {
            return null;
          }
          const type = toStringValue(item.type);
          if (!type) {
            return null;
          }
          return {
            type,
            quantity: Math.max(1, toNumberValue(item.quantity, 1)),
            dimensions: toStringValue(item.dimensions) || undefined,
          };
        })
        .filter((item): item is StageFurniture => item !== null)
    : [];

  if (!normalizeMonitors.length && !normalizePower.length && !normalizeFurniture.length) {
    return undefined;
  }

  return {
    monitors: dedupeItems(normalizeMonitors, (item) => normalizeName(`${item.type} ${item.location}`)),
    power: dedupeItems(normalizePower, (item) => normalizeName(item.type)),
    furniture: dedupeItems(normalizeFurniture, (item) => normalizeName(item.type)),
  };
}

function normalizeBackline(raw: unknown): TechRider["backline"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const normalizeItems = (value: unknown): BacklineItem[] =>
    Array.isArray(value)
      ? value
          .map((item): BacklineItem | null => {
            if (!isRecord(item)) {
              return null;
            }
            const model = toStringValue(item.model);
            if (!model) {
              return null;
            }
            return {
              model,
              quantity: Math.max(1, toNumberValue(item.quantity, 1)),
            };
          })
          .filter((item): item is BacklineItem => item !== null)
      : [];

  const backline = {
    cdjs: normalizeItems(raw.cdjs),
    turntables: normalizeItems(raw.turntables),
    mixer_minimum_requirements: toStringValue(raw.mixer_minimum_requirements) || undefined,
  };

  if (!backline.cdjs.length && !backline.turntables.length && !backline.mixer_minimum_requirements) {
    return undefined;
  }

  return backline;
}

function normalizeTransport(raw: unknown): TechRider["transport"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const transport = {
    flights_needed: toBooleanValue(raw.flights_needed),
    priority_boarding: toBooleanValue(raw.priority_boarding),
    baggage_requirements: toStringValue(raw.baggage_requirements) || undefined,
    origin_city: toStringValue(raw.origin_city) || undefined,
  };

  if (
    !transport.flights_needed &&
    !transport.priority_boarding &&
    !transport.baggage_requirements &&
    !transport.origin_city
  ) {
    return undefined;
  }

  return transport;
}

function normalizeAccommodation(raw: unknown): HospitalityRider["accommodation"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const accommodation = {
    required: toBooleanValue(raw.required),
    nights: Math.max(0, toNumberValue(raw.nights, 0)),
    room_type: toStringValue(raw.room_type),
    check_in: toStringValue(raw.check_in) || undefined,
    check_out: toStringValue(raw.check_out) || undefined,
    location_preference: toStringValue(raw.location_preference) || undefined,
  };

  if (
    !accommodation.required &&
    accommodation.nights === 0 &&
    !accommodation.room_type &&
    !accommodation.check_in &&
    !accommodation.check_out &&
    !accommodation.location_preference
  ) {
    return undefined;
  }

  return accommodation;
}

function normalizeCatering(raw: unknown): HospitalityRider["catering"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const drinks = isRecord(raw.drinks) ? raw.drinks : {};
  const catering = {
    meals: Array.isArray(raw.meals) ? uniqueStrings(raw.meals.map((item) => toStringValue(item))) : [],
    dietary: Array.isArray(raw.dietary) ? uniqueStrings(raw.dietary.map((item) => toStringValue(item))) : [],
    drinks: {
      alcopops: toBooleanValue(drinks.alcopops),
      spirits: Array.isArray(drinks.spirits) ? uniqueStrings(drinks.spirits.map((item) => toStringValue(item))) : [],
      mixers: Array.isArray(drinks.mixers) ? uniqueStrings(drinks.mixers.map((item) => toStringValue(item))) : [],
      water: toBooleanValue(drinks.water),
    },
    special_requests: toStringValue(raw.special_requests) || undefined,
  };

  if (
    !catering.meals.length &&
    !catering.dietary.length &&
    !catering.drinks.alcopops &&
    !catering.drinks.spirits.length &&
    !catering.drinks.mixers.length &&
    !catering.drinks.water &&
    !catering.special_requests
  ) {
    return undefined;
  }

  return catering;
}

function normalizeGroundTransport(raw: unknown): HospitalityRider["transport_ground"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const transportGround = {
    car_service: toBooleanValue(raw.car_service),
    pickup_time: toStringValue(raw.pickup_time) || undefined,
    pickup_location: toStringValue(raw.pickup_location) || undefined,
    return_required: toBooleanValue(raw.return_required),
    vehicle_type: toStringValue(raw.vehicle_type) || undefined,
  };

  if (
    !transportGround.car_service &&
    !transportGround.pickup_time &&
    !transportGround.pickup_location &&
    !transportGround.return_required &&
    !transportGround.vehicle_type
  ) {
    return undefined;
  }

  return transportGround;
}

function mergeEquipment(primary: EquipmentItem[], fallback: EquipmentItem[]): EquipmentItem[] {
  return dedupeItems(
    [...primary, ...fallback].map((item) => ({
      ...item,
      notes:
        /fx|pedal|effect/i.test(item.name) && !item.notes
          ? "Optional"
          : item.notes,
      artist_brings:
        item.artist_brings || /fx|pedal|effect/i.test(item.name),
      quantity: Math.max(1, item.quantity),
    })),
    (item) => `${normalizeName(item.name)}|${item.artist_brings}|${item.notes || ""}`,
  );
}

function mergeStageSetup(primary: StageSetup | undefined, fallback: StageSetup | undefined): StageSetup | undefined {
  if (!primary && !fallback) {
    return undefined;
  }

  return {
    monitors: dedupeItems([...(primary?.monitors || []), ...(fallback?.monitors || [])], (item) => normalizeName(`${item.type} ${item.location}`)),
    power: dedupeItems([...(primary?.power || []), ...(fallback?.power || [])], (item) => normalizeName(item.type)),
    furniture: dedupeItems([...(primary?.furniture || []), ...(fallback?.furniture || [])], (item) => normalizeName(item.type)),
  };
}

function extractFallbackEquipment(lines: string[]): EquipmentItem[] {
  const equipment: EquipmentItem[] = [];
  const artistBlock = findBlock(lines, [/THE ARTIST WILL BRING/i]);

  for (const line of artistBlock) {
    const optional = /optional/i.test(line);
    if (!line.startsWith("-")) {
      continue;
    }

    for (const item of parseStringList(line.replace(/optional:/i, ""))) {
      equipment.push({
        name: item,
        quantity: 1,
        artist_brings: true,
        notes: optional ? "Optional" : undefined,
      });
    }
  }

  if (lines.some((line) => /fx pedals?/i.test(line))) {
    equipment.push({
      name: "FX Pedals",
      quantity: 1,
      artist_brings: true,
      notes: "Optional",
    });
  }

  return mergeEquipment([], equipment);
}

function extractStageSetup(lines: string[]): StageSetup | undefined {
  const monitors: StageMonitor[] = [];
  const power: StagePower[] = [];
  const furniture: StageFurniture[] = [];

  for (const line of lines) {
    if (/stereo monitors?/i.test(line)) {
      monitors.push({
        type: "Stereo Monitors",
        quantity: parseQuantityFromLine(line, "stereo\\s+monitors?", 4),
        location: /on stage/i.test(line) ? "on stage" : "stage",
      });
    }

    if (/(power point|socket|outlet)/i.test(line)) {
      power.push({
        type: "Power Point/Socket",
        quantity: parseQuantityFromLine(line, "(?:power point|socket|outlet)s?", 4),
      });
    }

    if (/\btable\b/i.test(line)) {
      const height = line.match(/height\s*([\d.,]+\s*m)/i)?.[1];
      const width = line.match(/(?:width|wifgth)\s*(?:ca\.?\s*)?([\d.,]+\s*m)/i)?.[1];
      furniture.push({
        type: "Table",
        quantity: parseQuantityFromLine(line, "table", 1),
        dimensions: joinNotes([
          height ? `height ${height}` : undefined,
          width ? `width ca. ${width}` : undefined,
        ]),
      });
    }

    if (/laptop stands?/i.test(line)) {
      furniture.push({
        type: "Laptop stands",
        quantity: parseQuantityFromLine(line, "laptop\\s+stands?", 3),
      });
    }
  }

  if (!monitors.length && !power.length && !furniture.length) {
    return undefined;
  }

  return {
    monitors: dedupeItems(monitors, (item) => normalizeName(item.type)),
    power: dedupeItems(power, (item) => normalizeName(item.type)),
    furniture: dedupeItems(furniture, (item) => normalizeName(item.type)),
  };
}

function extractMixerRequirements(lines: string[]): { preferred_mixers: MixerRequirement[]; minimum_requirements?: string; special_requirements?: string } {
  const fullText = lines.join("\n");
  const mixers: MixerRequirement[] = [];

  if (/pioneer\s+v10|djm-v10|\bv10\b/i.test(fullText)) {
    mixers.push({
      model: "Pioneer V10",
      required_features: /usb/i.test(fullText) && /macbook/i.test(fullText) ? "USB connectivity for MacBook" : undefined,
      priority: 1,
    });
  }

  if (/pioneer\s+djm\s*a9|djm-a9|\ba9\b/i.test(fullText)) {
    mixers.push({
      model: "Pioneer DJM A9",
      priority: 2,
    });
  }

  if (/djm ?900|nexus mk1|nexus mk2|nxs2/i.test(fullText)) {
    mixers.push({
      model: "DJM900 Nexus mk1/mk2",
      priority: 3,
    });
  }

  const minimumRequirements =
    /usb/i.test(fullText) && /macbook/i.test(fullText)
      ? "USB connectivity for MacBook required"
      : undefined;

  const stereoSignalLine = lines.find((line) => /stereo signal|usb cable/i.test(line));

  return {
    preferred_mixers: dedupeItems(mixers, (item) => normalizeName(item.model)).sort((left, right) => left.priority - right.priority),
    minimum_requirements: minimumRequirements,
    special_requirements: stereoSignalLine,
  };
}

function extractImageReferences(lines: string[]): string[] {
  return uniqueStrings(
    lines.filter((line) => /(picture|image|photo|figure|fig\.)/i.test(line)),
  );
}

function extractTransport(lines: string[]): TechRider["transport"] | undefined {
  const travelLines = [
    ...findBlock(lines, [/TRAVEL REQUIREMENTS/i]),
    ...findBlock(lines, [/Flight requirements:/i]),
  ];

  if (!travelLines.length) {
    return undefined;
  }

  const joined = travelLines.join("\n");
  const origin = joined.match(/departing from\s+([A-Za-zÀ-ÿ\s-]+)/i)?.[1]?.trim();
  const baggage = travelLines.find((line) => /luggage|baggage/i.test(line));

  return {
    flights_needed: /flight|departing from|priority boarding/i.test(joined),
    priority_boarding: /priority boarding/i.test(joined),
    origin_city: origin || undefined,
    baggage_requirements: baggage ? baggage.replace(/^[*-]\s*/, "") : undefined,
  };
}

function extractAccommodation(lines: string[]): HospitalityRider["accommodation"] | undefined {
  const accommodationLines = findBlock(lines, [/ACCOM+ODATION REQUIREMENTS/i, /ACCOMODATION REQUIREMENTS/i]);
  if (!accommodationLines.length) {
    return undefined;
  }

  const joined = accommodationLines.join("\n");
  const nights = toNumberValue(joined.match(/(\d+)\s*(?:x\s*)?night/i)?.[1], 1);
  const roomType =
    joined.match(/kingsize bed/i)?.[0] ||
    joined.match(/single|double|twin/i)?.[0] ||
    "Hotel room";

  return {
    required: true,
    nights,
    room_type: roomType,
    check_out: /late check-?out/i.test(joined) ? "Late check-out" : undefined,
    location_preference: joined.match(/minimum\s+\d+\*/i)?.[0] || undefined,
  };
}

function extractCatering(lines: string[]): HospitalityRider["catering"] | undefined {
  const hospitalityLines = findBlock(lines, [/HOSPITALITY REQUIREMENTS/i]);
  if (!hospitalityLines.length) {
    return undefined;
  }

  const meals = hospitalityLines
    .filter((line) => /meal|breakfast|lunch|dinner/i.test(line))
    .map((line) => line.replace(/^[*-]\s*/, ""));

  const drinksMixers: string[] = [];
  if (hospitalityLines.some((line) => /coca cola/i.test(line))) {
    drinksMixers.push("Coca Cola");
  }
  if (hospitalityLines.some((line) => /mate tea/i.test(line))) {
    drinksMixers.push("Mate Tea");
  }

  const spirits: string[] = [];
  if (hospitalityLines.some((line) => /beer/i.test(line))) {
    spirits.push("Beer");
  }
  if (hospitalityLines.some((line) => /spirit/i.test(line))) {
    spirits.push("Spirits on request");
  }

  const specialRequests = hospitalityLines
    .filter((line) => !/meal|water|coca cola|mate tea/i.test(line))
    .map((line) => line.replace(/^[*-]\s*/, ""));

  return {
    meals: uniqueStrings(meals),
    dietary: [],
    drinks: {
      alcopops: false,
      spirits: uniqueStrings(spirits),
      mixers: uniqueStrings(drinksMixers),
      water: hospitalityLines.some((line) => /water/i.test(line)),
    },
    special_requests: joinNotes(specialRequests),
  };
}

function extractGroundTransport(lines: string[]): HospitalityRider["transport_ground"] | undefined {
  const joined = lines.join("\n");
  if (!/pickup|driver|car service|ground transport/i.test(joined)) {
    return undefined;
  }

  return {
    car_service: true,
    pickup_time: joined.match(/pickup[^.\n]*?(\d{1,2}:\d{2})/i)?.[1] || undefined,
    pickup_location: joined.match(/pickup[^.\n]*from\s+([A-Za-zÀ-ÿ\s-]+)/i)?.[1]?.trim() || undefined,
    return_required: /return/i.test(joined),
    vehicle_type: /van/i.test(joined) ? "Van" : /sedan/i.test(joined) ? "Sedan" : undefined,
  };
}

function buildTechnicalNotes(lines: string[]): string | undefined {
  const notes = lines.filter((line) =>
    /soundcheck|stereo signal|usb cable|travel options must be sent|train bookings/i.test(line),
  );
  return joinNotes(notes);
}

function buildHospitalityNotes(lines: string[]): string | undefined {
  const notes = [
    ...findBlock(lines, [/HOSPITALITY REQUIREMENTS/i]),
    ...findBlock(lines, [/TRAVEL REQUIREMENTS/i]),
    ...findBlock(lines, [/ACCOM+ODATION REQUIREMENTS/i, /ACCOMODATION REQUIREMENTS/i]),
  ];

  return joinNotes(notes.map((line) => line.replace(/^[*-]\s*/, "")));
}

function buildExtractionResult(parsed: Record<string, unknown>, pdfText: string): ExtractionResult {
  const lines = splitLines(pdfText);
  const techData = isRecord(parsed.tech_rider) ? parsed.tech_rider : {};
  const hospitalityData = isRecord(parsed.hospitality_rider) ? parsed.hospitality_rider : {};
  const audioData = isRecord(techData.audio) ? techData.audio : {};

  const mixerFallback = extractMixerRequirements(lines);
  const stageSetupFallback = extractStageSetup(lines);
  const equipmentFallback = extractFallbackEquipment(lines);
  const transportFallback = extractTransport(lines);
  const accommodationFallback = extractAccommodation(lines);
  const cateringFallback = extractCatering(lines);
  const groundTransportFallback = extractGroundTransport(lines);
  const imageFallback = extractImageReferences(lines);

  const techRider: TechRider = {
    equipment: mergeEquipment(normalizeEquipment(techData.equipment), equipmentFallback),
    stage_setup: mergeStageSetup(normalizeStageSetup(techData.stage_setup), stageSetupFallback),
    backline: normalizeBackline(techData.backline),
    audio: {
      inputs_needed: Math.max(1, toNumberValue(audioData.inputs_needed, 2)),
      monitor_type: toStringValue(audioData.monitor_type, "booth"),
      preferred_mixers: dedupeItems(
        [
          ...normalizeMixerRequirements(audioData.preferred_mixers),
          ...mixerFallback.preferred_mixers,
        ],
        (item) => normalizeName(item.model),
      ).sort((left, right) => left.priority - right.priority),
      special_requirements: joinNotes([
        toStringValue(audioData.special_requirements) || undefined,
        mixerFallback.special_requirements,
      ]),
    },
    transport: normalizeTransport(techData.transport) || transportFallback,
    technical_notes: joinNotes([
      toStringValue(techData.technical_notes) || undefined,
      buildTechnicalNotes(lines),
    ]),
    referenced_images: uniqueStrings([
      ...(Array.isArray(techData.referenced_images)
        ? techData.referenced_images.map((item) => toStringValue(item))
        : []),
      ...imageFallback,
    ]),
    performance_requirements: buildPerformanceRequirements(techData.performance_requirements, pdfText),
  };

  if (mixerFallback.minimum_requirements) {
    techRider.backline = {
      ...(techRider.backline || {}),
      mixer_minimum_requirements:
        techRider.backline?.mixer_minimum_requirements || mixerFallback.minimum_requirements,
    };
  }

  const hospitalityRider: HospitalityRider = {
    accommodation: normalizeAccommodation(hospitalityData.accommodation) || accommodationFallback,
    catering: normalizeCatering(hospitalityData.catering) || cateringFallback,
    transport_ground:
      normalizeGroundTransport(hospitalityData.transport_ground) || groundTransportFallback,
    hospitality_notes: joinNotes([
      toStringValue(hospitalityData.hospitality_notes) || undefined,
      buildHospitalityNotes(lines),
    ]),
  };

  return {
    tech_rider: techRider,
    hospitality_rider: hospitalityRider,
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: PdfPage[] }) => {
      const pages = pdfData.Pages || [];
      const extractedLines: string[] = [];

      for (const page of pages) {
        const items = [...(page.Texts || [])].sort((left, right) => (left.y - right.y) || (left.x - right.x));
        let currentY: number | null = null;
        let currentLine: string[] = [];

        for (const item of items) {
          const text = (item.R || [])
            .map((run) => decodeURIComponent(run.T || ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (!text) {
            continue;
          }

          if (currentY === null || Math.abs(item.y - currentY) > 0.35) {
            if (currentLine.length) {
              extractedLines.push(currentLine.join(" ").trim());
            }
            currentLine = [text];
            currentY = item.y;
          } else {
            currentLine.push(text);
          }
        }

        if (currentLine.length) {
          extractedLines.push(currentLine.join(" ").trim());
        }

        extractedLines.push("");
      }

      resolve(extractedLines.join("\n").trim());
    });

    pdfParser.on("pdfParser_dataError", (error: Error | { parserError: Error }) => {
      const message = error instanceof Error ? error.message : error.parserError.message;
      reject(new Error(message || "PDF parsing failed"));
    });

    pdfParser.parseBuffer(buffer);
  });
}

function extractJsonPayload(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonString = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonString);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    console.error("[LM Studio] JSON parse failed:", error);
    return null;
  }
}

function buildPerformanceRequirements(
  aiExtracted: unknown,
  pdfText: string
): TechRider["performance_requirements"] {
  const aiData = isRecord(aiExtracted) && isRecord(aiExtracted.staff) ? aiExtracted.staff : {};
  const detected = detectStaffRequirements(pdfText);
  
  // Use AI data if available, otherwise use detected data
  const staff = {
    sound_tech: Boolean(aiData.sound_tech || detected.sound_tech),
    sound_tech_notes: toStringValue(aiData.sound_tech_notes) || detected.sound_tech_notes || undefined,
    lighting_tech: Boolean(aiData.lighting_tech || detected.lighting_tech),
    lighting_tech_notes: toStringValue(aiData.lighting_tech_notes) || detected.lighting_tech_notes || undefined,
    soundcheck_required: Boolean(aiData.soundcheck_required || detected.soundcheck_required),
    soundcheck_duration_min: toNumberValue(aiData.soundcheck_duration_min, detected.soundcheck_duration_min || 0) || detected.soundcheck_duration_min,
    set_required: Boolean(aiData.set_required || detected.set_required),
    specific_time: toStringValue(aiData.specific_time) || detected.specific_time || null,
    party_mentioned: toStringValue(aiData.party_mentioned) || detected.party_mentioned || null,
  };
  
  // Only return if we detected any staff requirements
  const hasStaffRequirements = staff.sound_tech || staff.lighting_tech;
  const stageData = isRecord(aiExtracted) && isRecord(aiExtracted.stage)
    ? { requirements: Array.isArray(aiExtracted.stage.requirements) ? aiExtracted.stage.requirements.map((v: unknown) => toStringValue(v)).filter(Boolean) as string[] : [] }
    : undefined;
  
  return hasStaffRequirements
    ? { staff, stage: stageData }
    : undefined;
}

function detectStaffRequirements(pdfText: string): {
  sound_tech: boolean;
  sound_tech_notes: string;
  lighting_tech: boolean;
  lighting_tech_notes: string;
  soundcheck_required: boolean;
  soundcheck_duration_min: number | null;
  set_required: boolean;
  specific_time: string | null;
  party_mentioned: string | null;
} {
  const text = pdfText.toLowerCase();
  
  // Sound engineer detection
  const soundKeywords = [
    'sound engineer', 'sound tech', 'sound technician', 'soundcheck',
    'audio engineer', 'front of house', 'f.o.h', 'foh engineer',
    'sound operator', 'mix engineer', 'mixer operator'
  ];
  const soundRequired = soundKeywords.some(kw => text.includes(kw));
  
  // Lighting engineer detection  
  const lightKeywords = [
    'lighting engineer', 'light engineer', 'lighting tech', 'lighting technician',
    'ld', 'lighting designer', 'lighting operator', 'light operator',
    'visual engineer', 'vj', 'visual operator'
  ];
  const lightRequired = lightKeywords.some(kw => text.includes(kw));
  
  // Soundcheck detection
  const soundcheckMatch = text.match(/soundcheck\s*(?:for|duration|:)?\s*(?:(\d+)\s*(?:min|mins|minutes|hrs?|hours?))?/i);
  const soundcheckRequired = soundcheckMatch !== null;
  let soundcheckDuration = null;
  if (soundcheckMatch && soundcheckMatch[1]) {
    const num = parseInt(soundcheckMatch[1]);
    const unit = text.includes('hour') || text.includes('hr') ? 60 : 1;
    soundcheckDuration = num * unit;
  }
  
  // Set/performance detection
  const setKeywords = ['set', 'performance', 'during the show', 'during the set', 'whole set', 'full set', 'entire set'];
  const setRequired = setKeywords.some(kw => text.includes(kw));
  
  // Time extraction
  const timeMatch = text.match(/(?:at|from|starting|scheduled for)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const specificTime = timeMatch ? timeMatch[1] : null;
  
  // Party/artist name extraction (if mentioned as needing staff)
  const partyMatch = text.match(/(?:for|with|during)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  const party = partyMatch ? partyMatch[1] : null;
  
  // Extract notes
  let soundNotes = '';
  if (text.includes('30 min') || text.includes('30min')) {
    soundNotes = 'Soundcheck duration: 30 minutes';
  }
  if (text.includes('full set') || text.includes('whole set')) {
    soundNotes += soundNotes ? '; ' : '';
    soundNotes += 'Required for full set';
  }
  
  let lightNotes = '';
  if (text.includes('lighting cues') || text.includes('light show')) {
    lightNotes = 'Lighting cues required';
  }
  
  return {
    sound_tech: soundRequired,
    sound_tech_notes: soundNotes,
    lighting_tech: lightRequired,
    lighting_tech_notes: lightNotes,
    soundcheck_required: soundcheckRequired,
    soundcheck_duration_min: soundcheckDuration,
    set_required: setRequired,
    specific_time: specificTime,
    party_mentioned: party,
  };
}

async function extractWithLMStudio(pdfText: string): Promise<ExtractionResult | null> {
  try {
    let modelName = process.env.LM_STUDIO_MODEL || DEFAULT_MODEL;

    try {
      const modelsResponse = await fetch(`${LM_STUDIO_URL}/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        if (Array.isArray(modelsData.data) && modelsData.data[0]?.id) {
          modelName = modelsData.data[0].id as string;
        }
      }
    } catch {
      // Use fallback model
    }

    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: pdfText.slice(0, 12000) },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LM Studio] HTTP error:", response.status, errorText);
      return buildExtractionResult({}, pdfText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      console.error("[LM Studio] Empty completion");
      return buildExtractionResult({}, pdfText);
    }

    const parsed = extractJsonPayload(content);
    if (!parsed) {
      return buildExtractionResult({}, pdfText);
    }

    return buildExtractionResult(parsed, pdfText);
  } catch (error) {
    console.error("LM Studio extraction failed:", error);
    return buildExtractionResult({}, pdfText);
  }
}

function getWarnings(data: ExtractionResult): string[] {
  const warnings: string[] = [];

  if (data.tech_rider.transport?.priority_boarding) {
    warnings.push("Priority boarding required");
  }

  const venueSupplies = data.tech_rider.equipment.filter((item) => !item.artist_brings);
  if (venueSupplies.length > 0) {
    warnings.push(`Venue must supply ${venueSupplies.length} equipment item(s)`);
  }

  if (data.tech_rider.stage_setup?.monitors.length) {
    warnings.push("Stage monitor setup required");
  }

  if (data.hospitality_rider.accommodation?.required) {
    warnings.push("Accommodation required");
  }

  if (data.hospitality_rider.transport_ground?.car_service) {
    warnings.push("Ground transport required");
  }

  return warnings;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const artistId = formData.get("artist_id");
    const riderType = formData.get("rider_type");
    const eventId = formData.get("event_id");

    if (!(file instanceof File) || typeof artistId !== "string") {
      return NextResponse.json({ error: "Missing file or artist_id" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    try {
      const healthCheck = await fetch(`${LM_STUDIO_URL}/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!healthCheck.ok) {
        console.warn("[LM Studio] Health check failed, using PDF fallback extraction only");
      }
    } catch {
      console.warn("[LM Studio] Unreachable, using PDF fallback extraction only");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfText = await extractPdfText(buffer);

    if (pdfText.length < 50) {
      return NextResponse.json({ error: "PDF text extraction failed" }, { status: 400 });
    }

    const extracted = await extractWithLMStudio(pdfText);
    if (!extracted) {
      return NextResponse.json({ error: "Failed to extract rider data" }, { status: 500 });
    }

    const updateData: Record<string, unknown> = {};
    if (riderType === "tech" || riderType === "both") {
      updateData.tech_rider = extracted.tech_rider;
    }
    if (riderType === "hospitality" || riderType === "both" || !riderType) {
      updateData.hospitality_rider = extracted.hospitality_rider;
    }

    const { data: artist } = await supabase
      .from("artists")
      .select("documents, tech_rider, hospitality_rider")
      .eq("id", artistId)
      .single();

    const documents = Array.isArray(artist?.documents) ? [...artist.documents] : [];

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

    const extractionWarnings = getWarnings(extracted);
    let tasksCreated = 0;
    let taskEvents: Array<{
      event_id: string | null;
      event_name: string;
      event_date: string;
      tasks_created: number;
      task_titles: string[];
    }> = [];
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
    } catch (taskError) {
      console.error("[Rider tasks] automatic generation failed:", taskError);
      taskWarnings = ["Rider saved, but automatic task generation failed"];
    }

    return NextResponse.json({
      success: true,
      tech_rider: extracted.tech_rider,
      hospitality_rider: extracted.hospitality_rider,
      tasks_created: tasksCreated,
      task_events: taskEvents,
      warnings: [...extractionWarnings, ...taskWarnings],
    });
  } catch (error) {
    console.error("Rider error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "disconnected",
        message: "LM Studio not running on port 1234",
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: "connected",
      models: Array.isArray(data.data) ? data.data.map((model: { id: string }) => model.id) : [],
    });
  } catch {
    return NextResponse.json({
      status: "disconnected",
      message: "LM Studio not accessible",
    });
  }
}
