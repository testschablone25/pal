/**
 * Seed comprehensive tech and hospitality riders for PAL artists
 * Automatically generates tasks based on rider requirements:
 * - Priority boarding → Booker task to book flights
 * - Equipment requirements → Technician task to check stock
 * - Accommodation needs → Manager task to book hotel
 * - Transport needs → Logistics task
 * 
 * Run with: npx tsx scripts/seed-riders-and-tasks.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// TECH AND HOSPITALITY RIDER DATA
// ============================================

interface TechRider {
  equipment: { name: string; quantity: number; required: boolean; notes?: string }[];
  audio: {
    inputs_needed: number;
    monitor_type: string;
    special_requirements?: string;
  };
  transport?: {
    flights_needed: boolean;
    priority_boarding: boolean;
    baggage_requirements?: string;
    origin_city?: string;
  };
  technical_notes?: string;
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

// Realistic riders based on artist type and status
const artistRiders: Record<string, { tech: TechRider; hospitality: HospitalityRider }> = {
  // INTERNATIONAL ARTISTS - Full riders with flights
  'FJAAK': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-A9', quantity: 1, required: true },
        { name: 'Headphones (Sennheiser HD25)', quantity: 2, required: true },
        { name: 'USB Stick (32GB+)', quantity: 1, required: true, notes: 'Bring own backup' },
      ],
      audio: {
        inputs_needed: 4,
        monitor_type: 'booth',
        special_requirements: 'Stereo booth monitor, sub kick preferred',
      },
      transport: {
        flights_needed: true,
        priority_boarding: true,
        baggage_requirements: '2x Flightcase CDJ (carry-on) + 1x large check-in',
        origin_city: 'Hamburg',
      },
      technical_notes: 'Live PA setup - need additional inputs for drum machine. Run time: 2 hours minimum.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['dinner', 'late_night_snack'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['vodka', 'jägermeister'],
          mixers: ['redbull', 'tonic'],
          water: true,
        },
      },
      transport_ground: {
        car_service: true,
        pickup_time: '21:00',
        pickup_location: 'studio',
        return_required: true,
        vehicle_type: 'van',
      },
      hospitality_notes: 'Green room for 3 persons. Fresh towels after set.',
    },
  },
  'Amotik': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones (Technics)', quantity: 1, required: true },
        { name: 'XLR cables (5m)', quantity: 2, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Clean booth monitor mix',
      },
      transport: {
        flights_needed: true,
        priority_boarding: true,
        baggage_requirements: '1x carry-on with laptop + 1x check-in',
        origin_city: 'Berlin',
      },
      technical_notes: 'Minimal setup. Prefers CDJ over laptop. Run time: 2 hours.',
    },
    hospitality: {
      accommodation: {
        required: true,
        nights: 1,
        room_type: 'single',
        check_in: '18:00',
        check_out: '14:00',
        location_preference: 'Near venue or city center',
      },
      catering: {
        meals: ['dinner'],
        dietary: ['vegetarian'],
        drinks: {
          alcopops: false,
          spirits: ['gin', 'whiskey'],
          mixers: ['tonic', 'ginger_ale'],
          water: true,
        },
        special_requests: 'Fresh fruit in room',
      },
      transport_ground: {
        car_service: true,
        pickup_time: '19:00',
        pickup_location: 'airport',
        return_required: true,
        vehicle_type: 'sedan',
      },
      hospitality_notes: 'Quiet room preferred. Late checkout if possible.',
    },
  },
  'Grace Dahl': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-V10', quantity: 1, required: true },
        { name: 'Headphones (Pioneer)', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'High-quality booth monitors essential',
      },
      transport: {
        flights_needed: true,
        priority_boarding: true,
        baggage_requirements: '1x carry-on + 1x equipment case (check-in)',
        origin_city: 'Berlin',
      },
      technical_notes: 'Fast tempo sets - need responsive players. 2 hour set.',
    },
    hospitality: {
      accommodation: {
        required: true,
        nights: 1,
        room_type: 'double',
        check_in: '16:00',
        check_out: '15:00',
        location_preference: 'Hotel with good breakfast',
      },
      catering: {
        meals: ['dinner', 'late_night_snack', 'breakfast'],
        dietary: ['gluten-free'],
        drinks: {
          alcopops: false,
          spirits: ['tequila', 'mezcal'],
          mixers: ['lime', 'tonic'],
          water: true,
        },
      },
      transport_ground: {
        car_service: true,
        pickup_time: '18:00',
        pickup_location: 'airport',
        return_required: true,
        vehicle_type: 'sedan',
      },
      hospitality_notes: 'Room temperature water backstage. Dark chocolate available.',
    },
  },
  'Jesse de Haan': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Allen & Heath Xone:96', quantity: 1, required: true, notes: 'Xone preferred over Pioneer mixer' },
        { name: 'Headphones (Sony MDR-7506)', quantity: 1, required: true },
        { name: 'USB Hub', quantity: 1, required: false },
      ],
      audio: {
        inputs_needed: 4,
        monitor_type: 'booth',
        special_requirements: 'Analog warmth in monitors, heavy sub preferred',
      },
      transport: {
        flights_needed: true,
        priority_boarding: true,
        baggage_requirements: '2x equipment cases + 1x personal luggage',
        origin_city: 'Amsterdam',
      },
      technical_notes: 'Industrial techno - needs high SPL capability. Run time: 2-3 hours.',
    },
    hospitality: {
      accommodation: {
        required: true,
        nights: 2,
        room_type: 'suite',
        check_in: '15:00',
        check_out: '12:00',
        location_preference: 'Quiet hotel, good mattress',
      },
      catering: {
        meals: ['dinner', 'late_night_snack', 'breakfast', 'lunch'],
        dietary: ['vegan'],
        drinks: {
          alcopops: false,
          spirits: ['vodka', 'rum', 'whiskey'],
          mixers: ['redbull', 'cola', 'tonic'],
          water: true,
        },
        special_requests: 'No alcohol backstage during set',
      },
      transport_ground: {
        car_service: true,
        pickup_time: '20:00',
        pickup_location: 'hotel',
        return_required: true,
        vehicle_type: 'sedan',
      },
      hospitality_notes: 'Vegan rider strictly. Fresh flowers in room. No strong perfumes backstage.',
    },
  },
  'Vincent Neumann': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Standard booth setup',
      },
      transport: {
        flights_needed: true,
        priority_boarding: false,
        baggage_requirements: '1x carry-on + 1x check-in',
        origin_city: 'Leipzig',
      },
      technical_notes: 'Standard DJ setup. 2 hour set.',
    },
    hospitality: {
      accommodation: {
        required: true,
        nights: 1,
        room_type: 'single',
        check_in: '18:00',
        check_out: '14:00',
      },
      catering: {
        meals: ['dinner'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['vodka', 'whiskey'],
          mixers: ['cola', 'tonic'],
          water: true,
        },
      },
      transport_ground: {
        car_service: true,
        pickup_time: '20:00',
        pickup_location: 'train station',
        return_required: true,
        vehicle_type: 'sedan',
      },
      hospitality_notes: '',
    },
  },
  'Bconscious': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Laptop stand', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Warm, full sound preferred',
      },
      transport: {
        flights_needed: true,
        priority_boarding: false,
        baggage_requirements: '1x carry-on + 1x vinyl case (check-in)',
        origin_city: 'Berlin',
      },
      technical_notes: 'Sometimes plays vinyl - ask if bringing records. 2 hour set.',
    },
    hospitality: {
      accommodation: {
        required: true,
        nights: 1,
        room_type: 'double',
        check_in: '17:00',
        check_out: '13:00',
      },
      catering: {
        meals: ['dinner'],
        dietary: ['vegetarian'],
        drinks: {
          alcopops: false,
          spirits: ['wine', 'prosecco'],
          mixers: [],
          water: true,
        },
      },
      transport_ground: {
        car_service: true,
        pickup_time: '19:00',
        pickup_location: 'airport',
        return_required: true,
        vehicle_type: 'sedan',
      },
      hospitality_notes: 'Italian espresso preferred. Good WiFi needed.',
    },
  },

  // HAMBURG LOCALS - No flights, minimal hospitality
  'Bobbie': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Technics SL-1210', quantity: 2, required: false, notes: 'If playing vinyl' },
        { name: 'Headphones (Sennheiser)', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 4,
        monitor_type: 'booth',
        special_requirements: 'Sub bass in monitors. Extended low-end for acid sets.',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'PAL resident - knows venue well. Can set up own gear. 4 hour sets typical.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['late_night_snack'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['vodka', 'jägermeister', 'whiskey'],
          mixers: ['redbull', 'cola'],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Lives locally. Green room access appreciated.',
    },
  },
  'Leopold Faerberboeck': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Standard PAL setup',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'PAL resident and booker. Runs own sound check. 3-4 hour sets.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: [],
        dietary: [],
        drinks: {
          alcopops: false,
          spirits: ['beer'],
          mixers: [],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Lives in Hamburg. Minimal hospitality needed.',
    },
  },
  'Danya': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: '',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'SNAG resident. Standard setup. 2-3 hour sets.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['late_night_snack'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['vodka'],
          mixers: ['redbull'],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Hamburg local.',
    },
  },
  'Carluschka': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Clean low-end for minimal dub',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'Minimal dub / acid specialist. Long, hypnotic sets. 3 hour minimum.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['late_night_snack'],
        dietary: ['vegetarian'],
        drinks: {
          alcopops: false,
          spirits: ['gin'],
          mixers: ['tonic', 'cucumber'],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Hamburg local.',
    },
  },
  'Coco Honig': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'EBM/industrial - needs punchy monitors',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'Eclectic style - EBM, industrial, acid. 2-3 hour sets.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['late_night_snack'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['whiskey', 'mezcal'],
          mixers: ['ginger_ale'],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Hamburg local.',
    },
  },
  'Worthmann': {
    tech: {
      equipment: [
        { name: 'Pioneer CDJ-3000', quantity: 2, required: true },
        { name: 'Pioneer DJM-900NXS2', quantity: 1, required: true },
        { name: 'Headphones', quantity: 1, required: true },
        { name: 'HDMI cable (5m)', quantity: 1, required: true, notes: 'For VJ setup' },
      ],
      audio: {
        inputs_needed: 2,
        monitor_type: 'booth',
        special_requirements: 'Sync audio with visuals - ask about VJ setup',
      },
      transport: {
        flights_needed: false,
        priority_boarding: false,
      },
      technical_notes: 'Also does VJing - may bring own laptop and controller. Coordinate with visuals team.',
    },
    hospitality: {
      accommodation: {
        required: false,
        nights: 0,
        room_type: 'none',
      },
      catering: {
        meals: ['late_night_snack'],
        dietary: [],
        drinks: {
          alcopops: true,
          spirits: ['vodka', 'rum'],
          mixers: ['cola', 'redbull'],
          water: true,
        },
      },
      transport_ground: {
        car_service: false,
        return_required: false,
      },
      hospitality_notes: 'Hamburg local and visual artist.',
    },
  },
};

// ============================================
// TASK GENERATION FROM RIDERS
// ============================================

interface GeneratedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_role: 'booker' | 'technician' | 'manager' | 'logistics';
  category: 'flight' | 'equipment' | 'accommodation' | 'transport' | 'catering';
}

function generateTasksFromRider(
  artistName: string,
  rider: { tech: TechRider; hospitality: HospitalityRider },
  eventName: string,
  eventDate: string
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  // 1. FLIGHT TASKS - Priority boarding requirement
  if (rider.tech.transport?.flights_needed && rider.tech.transport?.priority_boarding) {
    tasks.push({
      title: `✈️ Book flight with priority boarding: ${artistName}`,
      description: `Artist ${artistName} requires FLIGHT with PRIORITY BOARDING for ${eventName} (${eventDate}).

ROUTE: ${rider.tech.transport.origin_city || 'Unknown'} → Hamburg
REQUIREMENTS:
- Priority/Fast Track boarding required
- Baggage: ${rider.tech.transport.baggage_requirements || 'Standard'}
- Flight should arrive minimum 4 hours before set time

ACTION NEEDED:
1. Search flights arriving before 18:00 on ${eventDate}
2. Book with priority boarding / business class
3. Confirm baggage allowance for equipment
4. Send itinerary to artist management`,
      priority: 'urgent',
      assignee_role: 'booker',
      category: 'flight',
    });
  } else if (rider.tech.transport?.flights_needed) {
    tasks.push({
      title: `✈️ Book flight: ${artistName}`,
      description: `Artist ${artistName} requires flight booking for ${eventName} (${eventDate}).

ROUTE: ${rider.tech.transport.origin_city || 'Unknown'} → Hamburg
BAGGAGE: ${rider.tech.transport.baggage_requirements || 'Standard'}

ACTION NEEDED:
1. Search flights arriving before 18:00
2. Book economy or premium economy
3. Confirm baggage allowance
4. Send confirmation to artist`,
      priority: 'high',
      assignee_role: 'booker',
      category: 'flight',
    });
  }

  // 2. EQUIPMENT TASKS
  const requiredEquipment = rider.tech.equipment.filter(e => e.required);
  if (requiredEquipment.length > 0) {
    const equipmentList = requiredEquipment
      .map(e => `- ${e.name} (x${e.quantity})${e.notes ? ` - Note: ${e.notes}` : ''}`)
      .join('\n');

    tasks.push({
      title: `🔧 Check equipment stock for ${artistName}`,
      description: `Artist ${artistName} requires the following EQUIPMENT for ${eventName} (${eventDate}):

REQUIRED EQUIPMENT:
${equipmentList}

ACTION NEEDED:
1. Check stock for each item
2. Verify all items are in working condition
3. Reserve equipment for event date
4. If any item is missing/unavailable → notify booker immediately
5. Set up equipment 2 hours before set time

AUDIO SETUP:
- Inputs needed: ${rider.tech.audio.inputs_needed}
- Monitor type: ${rider.tech.audio.monitor_type}
${rider.tech.audio.special_requirements ? `- Special: ${rider.tech.audio.special_requirements}` : ''}`,
      priority: 'high',
      assignee_role: 'technician',
      category: 'equipment',
    });
  }

  // 3. ACCOMMODATION TASKS
  if (rider.hospitality.accommodation?.required) {
    tasks.push({
      title: `🏨 Book hotel: ${artistName}`,
      description: `Artist ${artistName} requires ACCOMMODATION for ${eventName} (${eventDate}).

REQUIREMENTS:
- Nights: ${rider.hospitality.accommodation.nights}
- Room type: ${rider.hospitality.accommodation.room_type}
- Check-in: ${rider.hospitality.accommodation.check_in || '18:00'}
- Check-out: ${rider.hospitality.accommodation.check_out || '14:00'}
- Location: ${rider.hospitality.accommodation.location_preference || 'Near venue'}

${rider.hospitality.hospitality_notes ? `SPECIAL NOTES: ${rider.hospitality.hospitality_notes}` : ''}

ACTION NEEDED:
1. Find hotel matching requirements
2. Book room(s) for specified dates
3. Confirm with hotel
4. Send hotel details to artist and management
5. Arrange late check-out if possible`,
      priority: 'medium',
      assignee_role: 'manager',
      category: 'accommodation',
    });
  }

  // 4. GROUND TRANSPORT TASKS
  if (rider.hospitality.transport_ground?.car_service) {
    tasks.push({
      title: `🚗 Arrange transport: ${artistName}`,
      description: `Artist ${artistName} requires GROUND TRANSPORT for ${eventName} (${eventDate}).

PICKUP:
- Time: ${rider.hospitality.transport_ground.pickup_time || '20:00'}
- Location: ${rider.hospitality.transport_ground.pickup_location || 'Hotel/Venue'}
- Vehicle: ${rider.hospitality.transport_ground.vehicle_type || 'Sedan'}

RETURN: ${rider.hospitality.transport_ground.return_required ? 'Required' : 'Not needed'}

ACTION NEEDED:
1. Book car service for pickup
2. Confirm driver contact with artist
3. Arrange return transport after set
4. Coordinate timing with set end time`,
      priority: 'medium',
      assignee_role: 'logistics',
      category: 'transport',
    });
  }

  // 5. CATERING TASKS (if specific requirements)
  if (rider.hospitality.catering?.dietary && rider.hospitality.catering.dietary.length > 0) {
    tasks.push({
      title: `🍽️ Prepare catering for ${artistName}`,
      description: `Artist ${artistName} has CATERING REQUIREMENTS for ${eventName} (${eventDate}).

MEALS NEEDED: ${rider.hospitality.catering.meals.join(', ') || 'None specified'}
DIETARY RESTRICTIONS: ${rider.hospitality.catering.dietary.join(', ')}
${rider.hospitality.catering.special_requests ? `SPECIAL REQUESTS: ${rider.hospitality.catering.special_requests}` : ''}

DRINKS:
- Alcopops: ${rider.hospitality.catering.drinks.alcopops ? 'Yes' : 'No'}
- Spirits: ${rider.hospitality.catering.drinks.spirits.join(', ') || 'None'}
- Mixers: ${rider.hospitality.catering.drinks.mixers.join(', ') || 'None'}
- Water: ${rider.hospitality.catering.drinks.water ? 'Yes' : 'No'}

ACTION NEEDED:
1. Order food matching dietary requirements
2. Stock green room with specified drinks
3. Ensure fresh water available throughout set
4. Prepare late-night snack options`,
      priority: 'low',
      assignee_role: 'manager',
      category: 'catering',
    });
  }

  return tasks;
}

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

async function seedRidersAndTasks() {
  console.log('🎵 Seeding artist riders and generating tasks...\n');

  // Step 1: Get all artists and events
  console.log('📊 Fetching artists and events...');
  const { data: artists } = await supabase.from('artists').select('id, name');
  const { data: events } = await supabase
    .from('events')
    .select('id, name, date')
    .order('date');

  if (!artists || !events) {
    console.error('Failed to fetch data');
    return;
  }

  console.log(`  - ${artists.length} artists`);
  console.log(`  - ${events.length} events`);

  const artistMap = new Map(artists.map(a => [a.name, a.id]));
  const eventMap = new Map(events.map(e => [e.name, { id: e.id, date: e.date }]));

  // Step 2: Update artists with riders
  console.log('\n📋 Adding riders to artists...');
  let ridersAdded = 0;

  for (const [artistName, riders] of Object.entries(artistRiders)) {
    const artistId = artistMap.get(artistName);
    if (!artistId) {
      console.log(`  ⚠️ Artist not found: ${artistName}`);
      continue;
    }

    const { error } = await supabase
      .from('artists')
      .update({
        tech_rider: riders.tech as any,
        hospitality_rider: riders.hospitality as any,
      })
      .eq('id', artistId);

    if (error) {
      console.error(`  ✗ Error updating ${artistName}:`, error.message);
    } else {
      ridersAdded++;
      console.log(`  ✓ ${artistName}`);
    }
  }

  console.log(`\n✅ Added riders to ${ridersAdded} artists`);

  // Step 3: Get staff for task assignment
  console.log('\n👤 Fetching staff for task assignment...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', ['booker@pal.test', 'manager@pal.test', 'staff@pal.test']);

  const bookerId = profiles?.find(p => p.email === 'booker@pal.test')?.id;
  const managerId = profiles?.find(p => p.email === 'manager@pal.test')?.id;
  const technicianId = profiles?.find(p => p.email === 'staff@pal.test')?.id;

  console.log(`  - Booker (admin): ${bookerId ? '✓' : '✗'}`);
  console.log(`  - Manager: ${managerId ? '✓' : '✗'}`);
  console.log(`  - Technician (staff): ${technicianId ? '✓' : '✗'}`);

  // Step 4: Generate tasks from riders
  console.log('\n📝 Generating tasks from riders...');

  // Get performances to link tasks to events
  const { data: performances } = await supabase
    .from('performances')
    .select(`
      id,
      event_id,
      artists(id, name, tech_rider, hospitality_rider),
      events(id, name, date)
    `);

  let tasksCreated = 0;
  const generatedTasks: any[] = [];

  for (const perf of performances || []) {
    const artist = perf.artists as any;
    const event = perf.events as any;
    const artistName = artist?.name;

    if (!artistName || !artistRiders[artistName]) continue;

    const rider = artistRiders[artistName];
    const tasks = generateTasksFromRider(artistName, rider, event.name, event.date);

    for (const task of tasks) {
      // Determine assignee based on role
      let assigneeId: string | undefined;
      switch (task.assignee_role) {
        case 'booker':
          assigneeId = bookerId;
          break;
        case 'technician':
          assigneeId = technicianId;
          break;
        case 'manager':
        case 'logistics':
          assigneeId = managerId;
          break;
      }

      generatedTasks.push({
        title: task.title,
        description: task.description,
        status: 'todo',
        priority: task.priority,
        assignee_id: assigneeId,
        event_id: event.id,
      });
    }
  }

  // Step 5: Clear old rider-related tasks and insert new ones
  console.log(`\n🗑️ Clearing old rider-related tasks...`);
  await supabase
    .from('tasks')
    .delete()
    .or('title.ilike.%.%,title.ilike.%.%');

  // Insert tasks in batches
  console.log(`📤 Inserting ${generatedTasks.length} tasks...`);
  
  for (const task of generatedTasks) {
    const { error } = await supabase.from('tasks').insert(task);
    if (error) {
      console.error(`  ✗ Error: ${task.title.substring(0, 50)}...`);
    } else {
      tasksCreated++;
    }
  }

  console.log(`\n✅ Created ${tasksCreated} tasks from riders`);

  // Step 6: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Artists with riders: ${ridersAdded}`);
  console.log(`Tasks generated: ${tasksCreated}`);
  console.log('\nTask breakdown by type:');

  const taskCounts = {
    flights: generatedTasks.filter(t => t.title.includes('✈️')).length,
    equipment: generatedTasks.filter(t => t.title.includes('🔧')).length,
    accommodation: generatedTasks.filter(t => t.title.includes('🏨')).length,
    transport: generatedTasks.filter(t => t.title.includes('🚗')).length,
    catering: generatedTasks.filter(t => t.title.includes('🍽️')).length,
  };

  console.log(`  ✈️  Flight bookings: ${taskCounts.flights}`);
  console.log(`  🔧 Equipment checks: ${taskCounts.equipment}`);
  console.log(`  🏨 Hotel bookings: ${taskCounts.accommodation}`);
  console.log(`  🚗 Transport arrangements: ${taskCounts.transport}`);
  console.log(`  🍽️  Catering preparation: ${taskCounts.catering}`);

  console.log('\n✅ Rider seeding complete!');
  console.log('Tasks are now visible in the Workflow and Dashboard.');
}

seedRidersAndTasks().catch(console.error);
