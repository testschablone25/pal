/**
 * Seed PAL venues, sub-locations, and inventory items.
 *
 * Extracted from supabase/migrations/20260429000000_venue_sublocations_and_inventory_align.sql
 * Run with: npx tsx scripts/seed-pal-data.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding PAL venues...");

  const { error: venuesError } = await supabase.from("venues").upsert([
    {
      id: "a0000000-0000-4000-8000-000000000001",
      name: "PHOXXI Green Area",
      address:
        "Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg",
      capacity: 5000,
      venue_type: "venue",
    },
    {
      id: "a0000000-0000-4000-8000-000000000002",
      name: "Deichtor-Hallen",
      address:
        "Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg",
      capacity: 2000,
      venue_type: "storage",
    },
    {
      id: "a0000000-0000-4000-8000-000000000003",
      name: "Berliner Bahnhof",
      address:
        "Deichtorstraße 1/Deichtorhallen, Nordhalle, Deichtorstraße 1/Halle Nord, 20095 Hamburg",
      capacity: 3000,
      venue_type: "venue",
    },
    {
      id: "a0000000-0000-4000-8000-000000000004",
      name: "PAL Club GmbH & Co. KG",
      address: "Hammerbrookstr. 43, 20097 Hamburg",
      capacity: 1500,
      venue_type: "venue",
    },
    {
      id: "a0000000-0000-4000-8000-000000000005",
      name: "Fruchthof",
      address: null,
      capacity: 4000,
      venue_type: "mixed",
    },
    {
      id: "a0000000-0000-4000-8000-000000000006",
      name: "PAL Office",
      address: "Grindelhof 35a, 20146 Hamburg",
      capacity: 50,
      venue_type: "office",
    },
    {
      id: "a0000000-0000-4000-8000-000000000007",
      name: "Orbit Cafe",
      address: "Hammerbrookstr. 43, 20097 Hamburg",
      capacity: 100,
      venue_type: "venue",
    },
  ]);

  if (venuesError) {
    console.error("Error seeding venues:", venuesError);
    process.exit(1);
  }
  console.log("✓ Venues seeded");

  // ── Sub-locations ──────────────────────────────────────────────
  console.log("Seeding venue sub-locations...");

  const { error: subLocationsError } = await supabase
    .from("venue_sub_locations")
    .upsert([
      {
        venue_id: "a0000000-0000-4000-8000-000000000004",
        name: "KERN",
        description: "Main dancefloor / club area",
      },
      {
        venue_id: "a0000000-0000-4000-8000-000000000004",
        name: "ORB",
        description: "Second room / ambient area",
      },
      {
        venue_id: "a0000000-0000-4000-8000-000000000004",
        name: "ORBIT",
        description: "Third room / bar/lounge area",
      },
      {
        venue_id: "a0000000-0000-4000-8000-000000000001",
        name: "Openair",
        description: "Outdoor festival area",
      },
      {
        venue_id: "a0000000-0000-4000-8000-000000000005",
        name: "Openair",
        description: "Outdoor area at Fruchthof",
      },
    ]);

  if (subLocationsError) {
    console.error("Error seeding sub-locations:", subLocationsError);
    process.exit(1);
  }
  console.log("✓ Sub-locations seeded");

  // ── Inventory Items ────────────────────────────────────────────
  console.log("Seeding inventory items...");

  const { error: itemsError } = await supabase.from("items").upsert([
    // DJ & Audio Equipment
    {
      id: "b0000000-0000-4000-8000-000000000001",
      name: "CDJ 3000 inkl. Case",
      category: "dj_audio",
      serial_number: "CDJ3K-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000002",
      name: "CDJ 3000 inkl. Case",
      category: "dj_audio",
      serial_number: "CDJ3K-002",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000003",
      name: "CDJ 2000 NXS 2 inkl. Case",
      category: "dj_audio",
      serial_number: "CDJ2K-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000004",
      name: "XONE 96 inkl. Case",
      category: "dj_audio",
      serial_number: "XONE96-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000005",
      name: "XONE 96",
      category: "dj_audio",
      serial_number: "XONE96-002",
      current_location: "Deichtor-Hallen",
    },
    {
      id: "b0000000-0000-4000-8000-000000000006",
      name: "Technics SL 1210 MK7 inkl. Needle",
      category: "dj_audio",
      serial_number: "TECH-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000007",
      name: "Technics SL 1210 MK7 inkl. Needle",
      category: "dj_audio",
      serial_number: "TECH-002",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000008",
      name: "Scarlett 4i4 Oli",
      category: "dj_audio",
      serial_number: "SCAR-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    // Lighting Equipment
    {
      id: "b0000000-0000-4000-8000-000000000009",
      name: "AKAI APC 40 MK2",
      category: "lighting",
      serial_number: "AKAI-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000010",
      name: "Novation Maschine Kontrol",
      category: "lighting",
      serial_number: "NOV-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000011",
      name: "APELABS inkl. Case",
      category: "lighting",
      serial_number: "APE-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000012",
      name: "APELABS inkl. Case",
      category: "lighting",
      serial_number: "APE-002",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000013",
      name: "APELABS",
      category: "lighting",
      serial_number: "APE-003",
      current_location: "Fruchthof",
    },
    {
      id: "b0000000-0000-4000-8000-000000000014",
      name: "Moving Head NTSC",
      category: "lighting",
      serial_number: "MH-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000015",
      name: "Strobe Tigerstrobe",
      category: "lighting",
      serial_number: "STROBE-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000016",
      name: "Halogen-Ersatz ORB",
      category: "lighting",
      serial_number: "HAL-ORB-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000017",
      name: "Ground Fog",
      category: "lighting",
      serial_number: "GFOG-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000018",
      name: "Captain D Fog",
      category: "lighting",
      serial_number: "CFOG-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000019",
      name: "Tour Hazer 2",
      category: "lighting",
      serial_number: "HAZE-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000020",
      name: "EUROLITE Beam KERN",
      category: "lighting",
      serial_number: "BEAM-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000021",
      name: "Lazer",
      category: "lighting",
      serial_number: "LAZER-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000022",
      name: "Washlight",
      category: "lighting",
      serial_number: "WASH-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000023",
      name: "PAR 16",
      category: "lighting",
      serial_number: "PAR16-001",
      current_location: "Fruchthof",
    },
    // PA & SOUND
    {
      id: "b0000000-0000-4000-8000-000000000024",
      name: "PAL HORN",
      category: "pa_sound",
      serial_number: "HORN-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000025",
      name: "SANDEL & LARSSON TOP",
      category: "pa_sound",
      serial_number: "SLTOP-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000026",
      name: "PAL SUB STACK",
      category: "pa_sound",
      serial_number: "SUBSTACK-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000027",
      name: "KLING FREITAG CR1216",
      category: "pa_sound",
      serial_number: "KF1216-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000028",
      name: "VOID VENU 6",
      category: "pa_sound",
      serial_number: "VOID6-001",
      current_location: "Orbit Cafe",
    },
    {
      id: "b0000000-0000-4000-8000-000000000029",
      name: "KLING FREITAG BS 1",
      category: "pa_sound",
      serial_number: "KFBS1-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000030",
      name: "SSNAKE",
      category: "pa_sound",
      serial_number: "SNAKE-001",
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000031",
      name: "SSNAKE",
      category: "pa_sound",
      serial_number: "SNAKE-002",
      current_location: "Deichtor-Hallen",
    },
    {
      id: "b0000000-0000-4000-8000-000000000032",
      name: "FOHHN ROAD TOP",
      category: "pa_sound",
      serial_number: "FOHHNTOP-001",
      current_location: "Fruchthof",
    },
    {
      id: "b0000000-0000-4000-8000-000000000033",
      name: "FÖÖN SUB",
      category: "pa_sound",
      serial_number: "FSUB-001",
      current_location: "Fruchthof",
    },
    {
      id: "b0000000-0000-4000-8000-000000000034",
      name: "FÖÖN TOP",
      category: "pa_sound",
      serial_number: "FTOP-001",
      current_location: "Fruchthof",
    },
    {
      id: "b0000000-0000-4000-8000-000000000035",
      name: "KLING FREITAG SW115",
      category: "pa_sound",
      serial_number: "KFSW115-001",
      current_location: "Fruchthof",
    },
    {
      id: "b0000000-0000-4000-8000-000000000036",
      name: "SONOS",
      category: "pa_sound",
      serial_number: "SONOS-001",
      current_location: "PAL Office",
    },
    // Infrastructure & Signal
    {
      id: "b0000000-0000-4000-8000-000000000037",
      name: "Splitter",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000038",
      name: "Adapter",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000039",
      name: "XLR",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000040",
      name: "PowerCON",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000041",
      name: "Speakon",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000042",
      name: "Stromverteilung",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000043",
      name: "Turntable Chinch",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000044",
      name: "CDJ Chinch",
      category: "infrastructure",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    // Venue & Misc
    {
      id: "b0000000-0000-4000-8000-000000000045",
      name: "Sofa",
      category: "venue_misc",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000046",
      name: "Ventilator",
      category: "venue_misc",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
    {
      id: "b0000000-0000-4000-8000-000000000047",
      name: "Sitzkübel",
      category: "venue_misc",
      serial_number: null,
      current_location: "PAL Club GmbH & Co. KG",
    },
  ]);

  if (itemsError) {
    console.error("Error seeding items:", itemsError);
    process.exit(1);
  }
  console.log("✓ Items seeded");

  console.log("\n✅ PAL data seeding complete");
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
