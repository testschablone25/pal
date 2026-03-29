import type { SupabaseClient } from '@supabase/supabase-js';

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

interface StageSetup {
  monitors?: Array<{
    type: string;
    quantity: number;
    location: string;
  }>;
  power?: Array<{
    type: string;
    quantity: number;
  }>;
  furniture?: Array<{
    type: string;
    quantity: number;
    dimensions?: string;
  }>;
}

interface BacklineItem {
  model: string;
  quantity: number;
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

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskCategory = 'flight' | 'equipment' | 'accommodation' | 'transport' | 'catering' | 'staff_soundcheck' | 'staff_set';
type AssignmentTarget = 'booker' | 'manager' | 'sound' | 'light' | 'logistics_sound';

interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  assignment_target: AssignmentTarget;
  category: TaskCategory;
  needs_refining?: boolean;
  duration_min?: number | null;
  specific_time?: string | null;
}

interface UserRoleRow {
  user_id: string;
}

interface StaffRow {
  id: string;
  profile_id: string | null;
  role: string;
}

interface AvailabilityRow {
  staff_id: string;
  available: boolean;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
}

interface EventRow {
  id: string | null;
  name: string;
  date: string;
  display_date?: string;
  unscheduled?: boolean;
  status?: string;
}

interface ArtistRow {
  id: string;
  name: string;
  tech_rider: unknown;
  hospitality_rider: unknown;
}

interface PerformanceRow {
  event_id: string | null;
}

interface AssignmentResolution {
  assigneeId?: string;
  warning?: string;
  needsDelegation: boolean;
}

interface EventTaskCreationResult {
  event_id: string | null;
  event_name: string;
  event_date: string;
  tasks_created: number;
  task_titles: string[];
  warnings: string[];
}

interface RoleContext {
  managerId?: string;
  bookerId?: string;
  soundStaff: StaffRow[];
  lightStaff: StaffRow[];
}

export interface RiderTaskGenerationResult {
  success: boolean;
  tasks_created: number;
  events: EventTaskCreationResult[];
  warnings: string[];
}

const RIDER_SOURCE_MARKER = '[RIDER_TASK]';
const RIDER_TITLE_KEYWORDS = [
  'Book flight',
  'Venue Equipment',
  'Arrange technical staff',
  'Arrange sound technician',
  'Arrange lighting technician',
  'Book hotel',
  'Arrange transport',
  'Prepare catering',
  'Delegate',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTechRider(value: unknown): TechRider | null {
  return isRecord(value) ? (value as unknown as TechRider) : null;
}

function parseHospitalityRider(value: unknown): HospitalityRider | null {
  return isRecord(value) ? (value as unknown as HospitalityRider) : null;
}

function isOptionalNote(notes?: string): boolean {
  return Boolean(notes?.toLowerCase().includes('optional'));
}

function withSourceMarker(description: string, artistId: string, eventId: string | null): string {
  const eventKey = eventId || 'none';
  return `${description}\n\n${RIDER_SOURCE_MARKER}[artist:${artistId}][event:${eventKey}]`;
}

function isRiderTaskTitleForArtist(title: string, artistName: string): boolean {
  return title.includes(artistName) && RIDER_TITLE_KEYWORDS.some((keyword) => title.includes(keyword));
}

function buildTaskDrafts(
  artistName: string,
  techRider: TechRider | null,
  hospitalityRider: HospitalityRider | null,
  eventName: string,
  eventDate: string
): TaskDraft[] {
  const tasks: TaskDraft[] = [];

  if (techRider?.transport?.flights_needed) {
    const isPriority = techRider.transport.priority_boarding;
    tasks.push({
      title: `${isPriority ? '✈️ Book flight with PRIORITY BOARDING' : '✈️ Book flight'}: ${artistName}`,
      description: `Artist ${artistName} requires flight booking for ${eventName} (${eventDate}).

ROUTE: ${techRider.transport.origin_city || 'Unknown'} → Hamburg
${isPriority ? '**PRIORITY BOARDING / FAST TRACK REQUIRED**' : ''}
BAGGAGE: ${techRider.transport.baggage_requirements || 'Standard'}

ACTION NEEDED:
1. Search flights arriving minimum 4 hours before set time
2. ${isPriority ? 'Book with priority boarding / business class' : 'Book economy or premium economy'}
3. Confirm baggage allowance for equipment
4. Send itinerary to artist management`,
      priority: isPriority ? 'urgent' : 'high',
      assignment_target: 'booker',
      category: 'flight',
    });
  }

  const venueSupplies = techRider?.equipment?.filter((item) => !item.artist_brings) || [];
  const artistBrings = techRider?.equipment?.filter((item) => item.artist_brings && !isOptionalNote(item.notes)) || [];
  const artistOptional = techRider?.equipment?.filter((item) => item.artist_brings && isOptionalNote(item.notes)) || [];

  let venueEquipmentList = venueSupplies
    .map((item) => `- ${item.name} (x${item.quantity})${item.notes ? ` - ${item.notes}` : ''}`)
    .join('\n');

  const stageSetup = techRider?.stage_setup;
  if (stageSetup?.monitors?.length) {
    venueEquipmentList += `\n\nSTAGE MONITORS:\n${stageSetup.monitors
      .map((monitor) => `- ${monitor.type}: ${monitor.quantity} (${monitor.location})`)
      .join('\n')}`;
  }
  if (stageSetup?.power?.length) {
    venueEquipmentList += `\n\nPOWER REQUIREMENTS:\n${stageSetup.power
      .map((power) => `- ${power.type}: ${power.quantity}`)
      .join('\n')}`;
  }
  if (stageSetup?.furniture?.length) {
    venueEquipmentList += `\n\nFURNITURE:\n${stageSetup.furniture
      .map((item) => `- ${item.type}: ${item.quantity}${item.dimensions ? ` (${item.dimensions})` : ''}`)
      .join('\n')}`;
  }

  const mixers = techRider?.audio?.preferred_mixers;
  if (mixers && mixers.length > 0) {
    venueEquipmentList += `\n\nMIXER REQUIREMENTS (MUST HAVE USB FOR MACBOOK):\n${mixers
      .slice()
      .sort((left, right) => left.priority - right.priority)
      .map((mixer) =>
        `${mixer.priority === 1 ? '✓ PRIMARY' : mixer.priority === 2 ? '◯ SECONDARY' : '○ FALLBACK'}: ${mixer.model}${mixer.required_features ? ` - ${mixer.required_features}` : ''}`
      )
      .join('\n')}`;
  }

  const backline = techRider?.backline;
  if (backline?.cdjs?.length) {
    venueEquipmentList += `\n\nBACKLINE - CDJs:\n${backline.cdjs.map((item) => `- ${item.model}: ${item.quantity}`).join('\n')}`;
  }
  if (backline?.turntables?.length) {
    venueEquipmentList += `\n\nBACKLINE - TURNTABLES:\n${backline.turntables.map((item) => `- ${item.model}: ${item.quantity}`).join('\n')}`;
  }
  if (backline?.mixer_minimum_requirements) {
    venueEquipmentList += `\n\nMIXER MINIMUM REQUIREMENTS: ${backline.mixer_minimum_requirements}`;
  }

  if (techRider?.referenced_images?.length) {
    venueEquipmentList += `\n\nREFERENCED IMAGES (check rider PDF):\n${techRider.referenced_images.slice(0, 3).join('\n')}`;
  }

  const audioInfo = techRider?.audio;
  const hasAudioSetup = (audioInfo?.inputs_needed && audioInfo.inputs_needed > 2) || 
    audioInfo?.preferred_mixers?.length || 
    audioInfo?.special_requirements;

  if (hasAudioSetup) {
    const mixerList = audioInfo.preferred_mixers?.length
      ? audioInfo.preferred_mixers
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map(m => `${m.priority === 1 ? '✓' : m.priority === 2 ? '○' : '○'} ${m.model}${m.required_features ? ` (${m.required_features})` : ''}`)
          .join('\n')
      : 'Not specified';

    tasks.push({
      title: `🎚️ Audio Setup: ${artistName}`,
      description: `Audio setup requirements for ${artistName} at ${eventName} (${eventDate}).

INPUTS NEEDED: ${audioInfo.inputs_needed || 2}
MONITOR TYPE: ${audioInfo.monitor_type || 'booth'}
${audioInfo.special_requirements ? `SPECIAL REQUIREMENTS: ${audioInfo.special_requirements}` : ''}

MIXER PREFERENCES:
${mixerList}

ACTION NEEDED:
1. Verify mixer availability (check USB connectivity for MacBook)
2. Confirm input channel count matches requirements
3. Set up monitor wedges/IEMs as specified
4. Test audio before artist soundcheck`,
      priority: 'high',
      assignment_target: 'sound',
      category: 'equipment',
    });
  }

  const stageSetupData = techRider?.stage_setup;
  const hasStageSetup = stageSetupData?.monitors?.length || 
    stageSetupData?.power?.length || 
    stageSetupData?.furniture?.length;

  if (hasStageSetup) {
    const monitorsList = stageSetupData.monitors?.length
      ? stageSetupData.monitors.map(m => `- ${m.type}: ${m.quantity} (${m.location})`).join('\n')
      : 'None';
    const powerList = stageSetupData.power?.length
      ? stageSetupData.power.map(p => `- ${p.type}: ${p.quantity}`).join('\n')
      : 'None';
    const furnitureList = stageSetupData.furniture?.length
      ? stageSetupData.furniture.map(f => `- ${f.type}: ${f.quantity}${f.dimensions ? ` (${f.dimensions})` : ''}`).join('\n')
      : 'None';

    tasks.push({
      title: `🎭 Stage Setup: ${artistName}`,
      description: `Stage setup requirements for ${artistName} at ${eventName} (${eventDate}).

MONITORS:
${monitorsList}

POWER:
${powerList}

FURNITURE:
${furnitureList}

ACTION NEEDED:
1. Set up monitors as specified
2. Verify power distribution for equipment
3. Arrange furniture per requirements
4. Check referenced images in rider PDF`,
      priority: 'high',
      assignment_target: 'sound',
      category: 'equipment',
    });
  }

  const backlineData = techRider?.backline;
  const hasBackline = backlineData?.cdjs?.length || 
    backlineData?.turntables?.length || 
    backlineData?.mixer_minimum_requirements;

  if (hasBackline) {
    const cdjsList = backlineData.cdjs?.length
      ? backlineData.cdjs.map(c => `- ${c.model}: ${c.quantity}`).join('\n')
      : 'None';
    const turntablesList = backlineData.turntables?.length
      ? backlineData.turntables.map(t => `- ${t.model}: ${t.quantity}`).join('\n')
      : 'None';

    tasks.push({
      title: `💿 Backline Setup: ${artistName}`,
      description: `Backline requirements for ${artistName} at ${eventName} (${eventDate}).

CDJs:
${cdjsList}

TURNTABLES:
${turntablesList}

MIXER MINIMUM REQUIREMENTS:
${backlineData.mixer_minimum_requirements || 'None specified'}

ACTION NEEDED:
1. Verify backline equipment availability
2. Set up as specified
3. Test equipment before soundcheck`,
      priority: 'medium',
      assignment_target: 'sound',
      category: 'equipment',
    });
  }

  if (venueSupplies.length > 0) {
    const venueList = venueSupplies
      .map(item => `- ${item.name} (x${item.quantity})${item.notes ? ` - ${item.notes}` : ''}`)
      .join('\n');

    const artistListText = artistBrings.length > 0
      ? artistBrings.map(i => `- ${i.name} (x${i.quantity})`).join('\n')
      : 'None';
    const optionalListText = artistOptional.length > 0
      ? artistOptional.map(i => `- ${i.name} (x${i.quantity})${i.notes ? ` (${i.notes})` : ''}`).join('\n')
      : 'None';

    tasks.push({
      title: `📦 Venue Equipment: ${artistName}`,
      description: `Venue must supply the following for ${artistName} at ${eventName} (${eventDate}):

${venueList}

ARTIST BRINGS:
${artistListText}
${optionalListText !== 'None' ? `\nOPTIONAL:\n${optionalListText}` : ''}

ACTION NEEDED:
1. Verify all equipment is available
2. Set up before soundcheck
3. Notify booker if anything is missing`,
      priority: 'high',
      assignment_target: 'sound',
      category: 'equipment',
    });
  }

  const perfReqs = techRider?.performance_requirements;

  if (perfReqs?.staff?.sound_tech) {
    const soundNotes = perfReqs.staff.sound_tech_notes || '';
    const hasSpecificTime = Boolean(perfReqs.staff.specific_time);
    const hasParty = Boolean(perfReqs.staff.party_mentioned);
    const hasGranularStaffInfo = perfReqs.staff.soundcheck_required || perfReqs.staff.set_required;

    if (!hasGranularStaffInfo) {
      tasks.push({
        title: `👨‍🔧 Arrange sound technician: ${artistName}`,
        description: `Artist ${artistName} requires a sound technician for ${eventName} (${eventDate}).

NOTES:
${soundNotes || 'Sound technician required for soundcheck and full set.'}

ACTION NEEDED:
1. Assign a qualified sound technician
2. Confirm availability for soundcheck and full set
3. Get exact timing from artist management`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'equipment',
        needs_refining: true,
      });
    }

    if (perfReqs.staff.soundcheck_required) {
      tasks.push({
        title: `🎛️ Sound Engineer - Soundcheck: ${artistName}`,
        description: `Sound engineer required for soundcheck with ${artistName} for ${eventName} (${eventDate}).

DETAILS:
${perfReqs.staff.soundcheck_duration_min ? `Duration: ${perfReqs.staff.soundcheck_duration_min} minutes` : 'Duration: TBD'}
Time: ${perfReqs.staff.specific_time || 'TBD'}
Party: ${perfReqs.staff.party_mentioned || 'TBD'}
${soundNotes ? `Notes: ${soundNotes}` : ''}

ACTION NEEDED:
1. Assign sound engineer for soundcheck
2. Confirm exact time with artist management
3. Update task with specific time when known`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'staff_soundcheck',
        needs_refining: !hasSpecificTime || !hasParty,
        duration_min: perfReqs.staff.soundcheck_duration_min || null,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }

    if (perfReqs.staff.set_required) {
      tasks.push({
        title: `🎛️ Sound Engineer - Set: ${artistName}`,
        description: `Sound engineer required for full set by ${artistName} for ${eventName} (${eventDate}).

DETAILS:
Time: ${perfReqs.staff.specific_time || 'TBD'}
Party: ${perfReqs.staff.party_mentioned || 'TBD'}
${soundNotes ? `Notes: ${soundNotes}` : ''}

ACTION NEEDED:
1. Assign sound engineer for the full set
2. Confirm set time with artist management
3. Update task with specific time when known`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'staff_set',
        needs_refining: !hasSpecificTime || !hasParty,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }
  }

  if (perfReqs?.staff?.lighting_tech) {
    const lightNotes = perfReqs.staff.lighting_tech_notes || '';
    const hasSpecificTime = Boolean(perfReqs.staff.specific_time);
    const hasParty = Boolean(perfReqs.staff.party_mentioned);
    const hasGranularLightInfo = perfReqs.staff.soundcheck_required || perfReqs.staff.set_required;

    if (!hasGranularLightInfo) {
      tasks.push({
        title: `💡 Arrange lighting technician: ${artistName}`,
        description: `Artist ${artistName} requires a lighting technician for ${eventName} (${eventDate}).

NOTES:
${lightNotes || 'Lighting technician required for full set.'}

ACTION NEEDED:
1. Assign a qualified lighting technician
2. Confirm lighting cues with artist management
3. Get set timing for lighting programming`,
        priority: 'high',
        assignment_target: 'light',
        category: 'equipment',
        needs_refining: true,
      });
    }

    if (perfReqs.staff.soundcheck_required) {
      tasks.push({
        title: `💡 Lighting Engineer - Soundcheck: ${artistName}`,
        description: `Lighting engineer required for soundcheck with ${artistName} for ${eventName} (${eventDate}).

DETAILS:
Time: ${perfReqs.staff.specific_time || 'TBD'}
Party: ${perfReqs.staff.party_mentioned || 'TBD'}
${lightNotes ? `Notes: ${lightNotes}` : ''}

ACTION NEEDED:
1. Assign lighting engineer for soundcheck
2. Confirm exact time with artist management`,
        priority: 'high',
        assignment_target: 'light',
        category: 'staff_soundcheck',
        needs_refining: !hasSpecificTime || !hasParty,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }

    if (perfReqs.staff.set_required) {
      tasks.push({
        title: `💡 Lighting Engineer - Set: ${artistName}`,
        description: `Lighting engineer required for full set by ${artistName} for ${eventName} (${eventDate}).

DETAILS:
Time: ${perfReqs.staff.specific_time || 'TBD'}
Party: ${perfReqs.staff.party_mentioned || 'TBD'}
${lightNotes ? `Notes: ${lightNotes}` : ''}

ACTION NEEDED:
1. Assign lighting engineer for the full set
2. Confirm set time with artist management`,
        priority: 'high',
        assignment_target: 'light',
        category: 'staff_set',
        needs_refining: !hasSpecificTime || !hasParty,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }
  }

  if (hospitalityRider?.accommodation?.required) {
    tasks.push({
      title: `🏨 Book hotel: ${artistName}`,
      description: `Artist ${artistName} requires accommodation for ${eventName} (${eventDate}).

REQUIREMENTS:
- Nights: ${hospitalityRider.accommodation.nights}
- Room type: ${hospitalityRider.accommodation.room_type}
- Check-in: ${hospitalityRider.accommodation.check_in || '18:00'}
- Check-out: ${hospitalityRider.accommodation.check_out || '14:00'}
- Location: ${hospitalityRider.accommodation.location_preference || 'Near venue'}
${hospitalityRider.hospitality_notes ? `\nSPECIAL NOTES: ${hospitalityRider.hospitality_notes}` : ''}

ACTION NEEDED:
1. Find hotel matching requirements
2. Book room(s)
3. Send confirmation to artist`,
      priority: 'medium',
      assignment_target: 'booker',
      category: 'accommodation',
    });
  }

  if (hospitalityRider?.transport_ground?.car_service) {
    tasks.push({
      title: `🚗 Arrange transport: ${artistName}`,
      description: `Artist ${artistName} needs ground transport for ${eventName} (${eventDate}).

PICKUP:
- Time: ${hospitalityRider.transport_ground.pickup_time || '20:00'}
- Location: ${hospitalityRider.transport_ground.pickup_location || 'Hotel'}
- Vehicle: ${hospitalityRider.transport_ground.vehicle_type || 'Sedan'}
- Return: ${hospitalityRider.transport_ground.return_required ? 'Required' : 'Not needed'}`,
      priority: 'medium',
      assignment_target: 'logistics_sound',
      category: 'transport',
    });
  }

  if (hospitalityRider?.catering?.dietary?.length || hospitalityRider?.catering?.drinks) {
    const catering = hospitalityRider.catering;
    tasks.push({
      title: `🍽️ Prepare catering: ${artistName}`,
      description: `Catering requirements for ${artistName} at ${eventName} (${eventDate}).

MEALS: ${catering?.meals?.join(', ') || 'None specified'}
DIETARY: ${catering?.dietary?.join(', ') || 'None'}
${catering?.special_requests ? `SPECIAL: ${catering.special_requests}` : ''}

DRINKS:
- Spirits: ${catering?.drinks?.spirits?.join(', ') || 'None'}
- Mixers: ${catering?.drinks?.mixers?.join(', ') || 'None'}
- Alcopops: ${catering?.drinks?.alcopops ? 'Yes' : 'No'}
- Water: ${catering?.drinks?.water ? 'Yes' : 'No'}`,
      priority: 'low',
      assignment_target: 'manager',
      category: 'catering',
    });
  }

  return tasks;
}

async function getSingleRoleAssignee(
  supabase: SupabaseClient,
  role: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', role)
    .order('created_at', { ascending: true })
    .limit(1);

  if (!Array.isArray(data) || data.length === 0) {
    return undefined;
  }

  const record = data[0] as UserRoleRow;
  return record.user_id;
}

async function buildRoleContext(supabase: SupabaseClient): Promise<RoleContext> {
  const [bookerId, managerId] = await Promise.all([
    getSingleRoleAssignee(supabase, 'booker'),
    getSingleRoleAssignee(supabase, 'manager'),
  ]);

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, profile_id, role')
    .in('role', ['sound', 'light']);

  const staffRows = (Array.isArray(staffData) ? staffData : []) as StaffRow[];

  return {
    managerId,
    bookerId,
    soundStaff: staffRows.filter((row) => row.role === 'sound' && Boolean(row.profile_id)),
    lightStaff: staffRows.filter((row) => row.role === 'light' && Boolean(row.profile_id)),
  };
}

async function getAvailableStaffForDate(
  supabase: SupabaseClient,
  candidates: StaffRow[],
  eventDate: string
): Promise<StaffRow[]> {
  if (candidates.length === 0) {
    return [];
  }

  const candidateIds = candidates.map((candidate) => candidate.id);
  const { data: availabilityData } = await supabase
    .from('availability')
    .select('staff_id, available')
    .eq('date', eventDate)
    .in('staff_id', candidateIds);

  const rows = (Array.isArray(availabilityData) ? availabilityData : []) as AvailabilityRow[];

  if (rows.length === 0) {
    return candidates;
  }

  const availableIds = new Set(
    rows
      .filter((row) => row.available)
      .map((row) => row.staff_id)
  );

  return candidates.filter((candidate) => availableIds.has(candidate.id));
}

async function resolveAssignment(
  supabase: SupabaseClient,
  roleContext: RoleContext,
  assignmentTarget: AssignmentTarget,
  eventDate: string
): Promise<AssignmentResolution> {
  if (assignmentTarget === 'booker') {
    return {
      assigneeId: roleContext.bookerId,
      warning: roleContext.bookerId ? undefined : 'No booker user role found for assignment',
      needsDelegation: false,
    };
  }

  if (assignmentTarget === 'manager') {
    return {
      assigneeId: roleContext.managerId,
      warning: roleContext.managerId ? undefined : 'No manager user role found for assignment',
      needsDelegation: false,
    };
  }

  const targetRole = assignmentTarget === 'light' ? 'light' : 'sound';
  const candidates = targetRole === 'light' ? roleContext.lightStaff : roleContext.soundStaff;
  const availableCandidates = await getAvailableStaffForDate(supabase, candidates, eventDate);

  if (availableCandidates.length === 1) {
    return {
      assigneeId: availableCandidates[0].profile_id || undefined,
      needsDelegation: false,
    };
  }

  if (availableCandidates.length > 1) {
    return {
      warning: `Multiple ${targetRole} staff are available on ${eventDate}; leaving task unassigned`,
      needsDelegation: true,
    };
  }

  if (assignmentTarget === 'logistics_sound' && roleContext.managerId) {
    return {
      assigneeId: roleContext.managerId,
      warning: `No available sound staff on ${eventDate}; logistics task assigned to manager`,
      needsDelegation: false,
    };
  }

  return {
    warning: `No available ${targetRole} staff on ${eventDate}; task left unassigned`,
    needsDelegation: false,
  };
}

async function cleanupExistingRiderTasks(
  supabase: SupabaseClient,
  eventId: string | null,
  artistId: string,
  artistName: string
): Promise<void> {
  const query = supabase
    .from('tasks')
    .select('id, title, description');

  const { data } = eventId
    ? await query.eq('event_id', eventId)
    : await query.is('event_id', null);

  const existing = (Array.isArray(data) ? data : []) as TaskRow[];
  const eventKey = eventId || 'none';
  const taggedMarker = `${RIDER_SOURCE_MARKER}[artist:${artistId}][event:${eventKey}]`;

  const taskIds = existing
    .filter((task) =>
      task.description?.includes(taggedMarker) ||
      isRiderTaskTitleForArtist(task.title, artistName)
    )
    .map((task) => task.id);

  if (taskIds.length === 0) {
    return;
  }

  await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds);
}

async function createDelegationTask(
  supabase: SupabaseClient,
  managerId: string | undefined,
  eventId: string | null,
  artistId: string,
  artistName: string,
  eventName: string,
  eventDate: string,
  originalTaskTitle: string,
  roleLabel: 'sound' | 'light'
): Promise<string | null> {
  if (!managerId) {
    return null;
  }

  const title = `🧭 Delegate ${roleLabel} assignment: ${artistName}`;
  const description = withSourceMarker(
    `Multiple ${roleLabel} staff are available for ${eventName} (${eventDate}).

TASK TO DELEGATE:
- ${originalTaskTitle}

ACTION NEEDED:
1. Review currently available ${roleLabel} staff
2. Manually assign the rider task to one staff member
3. Confirm assignment before event day`,
    artistId,
    eventId
  );

  const { data } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      status: 'todo',
      priority: 'high',
      assignee_id: managerId,
      event_id: eventId || null,
    })
    .select('title')
    .single();

  if (!data || !isRecord(data) || typeof data.title !== 'string') {
    return null;
  }

  return data.title;
}

async function createTasksForEvent(
  supabase: SupabaseClient,
  roleContext: RoleContext,
  artistId: string,
  artistName: string,
  techRider: TechRider | null,
  hospitalityRider: HospitalityRider | null,
  event: EventRow
): Promise<EventTaskCreationResult> {
  const eventWarnings: string[] = [];
  const taskTitles: string[] = [];
  const eventDateLabel = event.display_date || event.date;
  const drafts = buildTaskDrafts(artistName, techRider, hospitalityRider, event.name, eventDateLabel);

  await cleanupExistingRiderTasks(supabase, event.id, artistId, artistName);

  for (const draft of drafts) {
    const assignment = await resolveAssignment(supabase, roleContext, draft.assignment_target, event.date);
    if (assignment.warning) {
      eventWarnings.push(assignment.warning);
    }

    const description = withSourceMarker(draft.description, artistId, event.id);
    const { data: insertedTask, error } = await supabase
      .from('tasks')
      .insert({
        title: draft.title,
        description,
        status: draft.needs_refining ? 'needs_refining' : 'todo',
        priority: draft.priority,
        assignee_id: assignment.assigneeId,
        event_id: event.id || null,
      })
      .select('title')
      .single();

    if (error) {
      eventWarnings.push(`Failed to create task "${draft.title}": ${error.message}`);
      continue;
    }

    if (insertedTask && isRecord(insertedTask) && typeof insertedTask.title === 'string') {
      taskTitles.push(insertedTask.title);
    }

    if (assignment.needsDelegation) {
      const delegationTitle = await createDelegationTask(
        supabase,
        roleContext.managerId,
        event.id,
        artistId,
        artistName,
        event.name,
        event.date,
        draft.title,
        draft.assignment_target === 'light' ? 'light' : 'sound'
      );

      if (delegationTitle) {
        taskTitles.push(delegationTitle);
      } else {
        eventWarnings.push(`Could not create manager delegation task for "${draft.title}"`);
      }
    }
  }

  return {
    event_id: event.id,
    event_name: event.name,
    event_date: eventDateLabel,
    tasks_created: taskTitles.length,
    task_titles: taskTitles,
    warnings: eventWarnings,
  };
}

async function resolveTargetEvents(
  supabase: SupabaseClient,
  artistId: string,
  explicitEventId?: string
): Promise<{ events: EventRow[]; warnings: string[] }> {
  const warnings: string[] = [];

  if (explicitEventId) {
    const { data } = await supabase
      .from('events')
      .select('id, name, date, status')
      .eq('id', explicitEventId)
      .single();

    if (!data || !isRecord(data)) {
      return { events: [], warnings: ['Specified event for task generation was not found'] };
    }

    return {
      events: [data as EventRow],
      warnings,
    };
  }

  const { data: performancesData } = await supabase
    .from('performances')
    .select('event_id')
    .eq('artist_id', artistId);

  const performanceRows = (Array.isArray(performancesData) ? performancesData : []) as PerformanceRow[];
  const eventIds = [...new Set(
    performanceRows
      .map((performance) => performance.event_id)
      .filter((eventId): eventId is string => Boolean(eventId))
  )];

  if (eventIds.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      events: [{
        id: null,
        name: 'Unscheduled Artist Booking',
        date: today,
        display_date: 'TBD',
        unscheduled: true,
      }],
      warnings: ['No performances linked to this artist; tasks were created as unscheduled booking tasks'],
    };
  }

  const { data: eventsData } = await supabase
    .from('events')
    .select('id, name, date, status')
    .in('id', eventIds)
    .order('date', { ascending: true });

  const events = (Array.isArray(eventsData) ? eventsData : []) as EventRow[];
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter((event) => event.date >= today && event.status !== 'cancelled');

  if (upcomingEvents.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      events: [{
        id: null,
        name: 'Unscheduled Artist Booking',
        date: today,
        display_date: 'TBD',
        unscheduled: true,
      }],
      warnings: ['No upcoming events found for this artist; tasks were created as unscheduled booking tasks'],
    };
  }

  return {
    events: upcomingEvents,
    warnings,
  };
}

export async function generateRiderTasksForArtist(
  supabase: SupabaseClient,
  artistId: string,
  eventId?: string
): Promise<RiderTaskGenerationResult> {
  console.log('[TaskGen] Starting for artist:', artistId, 'eventId:', eventId);
  
  const { data: artistData } = await supabase
    .from('artists')
    .select('id, name, tech_rider, hospitality_rider')
    .eq('id', artistId)
    .single();

  if (!artistData || !isRecord(artistData)) {
    throw new Error('Artist not found');
  }

  const artist = artistData as ArtistRow;
  const techRider = parseTechRider(artist.tech_rider);
  const hospitalityRider = parseHospitalityRider(artist.hospitality_rider);

  const targetEvents = await resolveTargetEvents(supabase, artistId, eventId);
  console.log('[TaskGen] Target events found:', targetEvents.events.length, 'warnings:', targetEvents.warnings);
  if (targetEvents.events.length === 0) {
    return {
      success: true,
      tasks_created: 0,
      events: [],
      warnings: targetEvents.warnings,
    };
  }

  const roleContext = await buildRoleContext(supabase);
  const eventResults: EventTaskCreationResult[] = [];

  console.log('[TaskGen] Creating tasks for', targetEvents.events.length, 'events');
  for (const event of targetEvents.events) {
    console.log('[TaskGen] Processing event:', event.name, event.date);
    const eventResult = await createTasksForEvent(
      supabase,
      roleContext,
      artist.id,
      artist.name,
      techRider,
      hospitalityRider,
      event
    );
    eventResults.push(eventResult);
  }

  const totalTasks = eventResults.reduce((sum, event) => sum + event.tasks_created, 0);
  console.log('[TaskGen] Total tasks created:', totalTasks);
  
  return {
    success: true,
    tasks_created: totalTasks,
    events: eventResults,
    warnings: [
      ...targetEvents.warnings,
      ...eventResults.flatMap((event) => event.warnings),
    ],
  };
}
