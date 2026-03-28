# Enhanced Staff Task Generation from Rider PDFs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance AI rider extraction and task generation to create granular staff tasks (sound/light engineer) with specific times and parties, and add a "Needs Refining" Kanban column for tasks without specified details.

**Architecture:** Add new Kanban column, enhance AI extraction schema, update task generation to create separate soundcheck/set tasks with proper status assignment.

**Tech Stack:** Next.js, Supabase, dnd-kit, React

---

## File Structure

- `src/app/workflow/page.tsx` - Add needs_refining column to Kanban
- `src/app/api/artists/extract-rider/route.ts` - Enhance AI extraction prompt
- `src/lib/riders/task-generation.ts` - Update task generation logic
- `src/components/task-card.tsx` - May need status badge updates

---

### Task 1: Add "Needs Refining" Kanban Column

**Files:**
- Modify: `src/app/workflow/page.tsx:55-60`

- [ ] **Step 1: Add needs_refining column to COLUMNS array**

```typescript
const COLUMNS: Column[] = [
  { id: 'needs_refining', title: 'Needs Refining', status: 'needs_refining', color: 'bg-orange-600' },
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-zinc-600' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'bg-blue-600' },
  { id: 'review', title: 'Review', status: 'review', color: 'bg-yellow-600' },
  { id: 'done', title: 'Done', status: 'done', color: 'bg-green-600' },
];
```

- [ ] **Step 2: Add needs_refining to tasksByStatus grouping**

Modify the tasksByStatus useMemo to include needs_refining:
```typescript
const tasksByStatus = useMemo(() => {
  const grouped: Record<string, Task[]> = {
    needs_refining: [],
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  // ... rest of logic
}, [filteredTasks]);
```

- [ ] **Step 3: Add needs_refining column to grid**

In the JSX, add the needs_refining column to the grid (before todo):
```typescript
<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  {COLUMNS.map((column) => (
    // ... existing column rendering
  ))}
</div>
```

- [ ] **Step 4: Update Column interface**

Ensure Column type includes needs_refining:
```typescript
interface Column {
  id: string;
  title: string;
  status: Task['status'];
  color: string;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/workflow/page.tsx
git commit -m "feat: add needs_refining column to Kanban board"
```

---

### Task 2: Enhance AI Extraction Schema

**Files:**
- Modify: `src/app/api/artists/extract-rider/route.ts:13-85` (EXTRACTION_PROMPT)
- Modify: `src/app/api/artists/extract-rider/route.ts:164-175` (TechRider interface)

- [ ] **Step 1: Update EXTRACTION_PROMPT to extract granular staff details**

Replace current prompt section with enhanced version - find lines 43-46 and add:

```typescript
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
```

Add to Rules section (around line 84):
```
- Extract staff timing: soundcheck_required (boolean), soundcheck_duration_min (number or null)
- Extract if set performance is required: set_required (boolean)
- Extract specific time mentions: specific_time (string like "22:00" or null)
- Extract specific party/person mentioned: party_mentioned (name string or null)
- If no specific time mentioned, set specific_time to null
- If no specific person/party mentioned for the task, set party_mentioned to null
```

- [ ] **Step 2: Update TechRider interface**

Modify lines 164-175 to include new fields:

```typescript
interface PerformanceRequirements {
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
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artists/extract-rider/route.ts
git commit -m "feat: enhance AI extraction for granular staff requirements"
```

---

### Task 3: Update Task Generation Logic

**Files:**
- Modify: `src/lib/riders/task-generation.ts:103-115` (TaskDraft interface)
- Modify: `src/lib/riders/task-generation.ts:341-386` (buildTaskDrafts for staff)
- Modify: `src/lib/riders/task-generation.ts:661-735` (createTasksForEvent)

- [ ] **Step 1: Update TaskDraft interface**

Change TaskCategory to include new types:
```typescript
type TaskCategory = 'flight' | 'equipment' | 'accommodation' | 'transport' | 'catering' | 'staff_soundcheck' | 'staff_set';

interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  assignment_target: AssignmentTarget;
  category: TaskCategory;
  needs_refining?: boolean;  // NEW FIELD
  duration_min?: number | null;  // NEW FIELD
  specific_time?: string | null;  // NEW FIELD
}
```

- [ ] **Step 2: Replace staff task generation in buildTaskDrafts**

Replace lines 341-386 with enhanced version:

```typescript
  // Sound Engineer Tasks
  if (perfReqs?.staff?.sound_tech) {
    const soundNotes = perfReqs.staff.sound_tech_notes || '';
    
    // Soundcheck task
    if (perfReqs.staff.soundcheck_required) {
      const hasSpecificTime = perfReqs.staff.specific_time !== null;
      const hasParty = perfReqs.staff.party_mentioned !== null;
      
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
    
    // Set task
    if (perfReqs.staff.set_required) {
      const hasSpecificTime = perfReqs.staff.specific_time !== null;
      const hasParty = perfReqs.staff.party_mentioned !== null;
      
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

  // Lighting Engineer Tasks  
  if (perfReqs?.staff?.lighting_tech) {
    const lightNotes = perfReqs.staff.lighting_tech_notes || '';
    
    // Soundcheck task for lighting (if mentioned)
    if (perfReqs.staff.soundcheck_required) {
      const hasSpecificTime = perfReqs.staff.specific_time !== null;
      const hasParty = perfReqs.staff.party_mentioned !== null;
      
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
    
    // Set task for lighting
    if (perfReqs.staff.set_required) {
      const hasSpecificTime = perfReqs.staff.specific_time !== null;
      const hasParty = perfReqs.staff.party_mentioned !== null;
      
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
```

- [ ] **Step 3: Update createTasksForEvent to use needs_refining status**

Modify the task creation in createTasksForEvent (around line 686):

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/riders/task-generation.ts
git commit -m "feat: generate granular staff tasks with needs_refining status"
```

---

### Task 4: Test End-to-End Flow

**Files:**
- No file changes - testing only

- [ ] **Step 1: Verify Kanban loads with new column**

Run: `npm run dev`
Navigate to /workflow
Verify: 5 columns visible including "Needs Refining"

- [ ] **Step 2: Create a test task with needs_refining status**

Use Supabase dashboard or API to create a task with status='needs_refining'
Verify: Task appears in "Needs Refining" column

- [ ] **Step 3: Test drag from needs_refining to todo**

Drag a task from Needs Refining to To Do
Verify: Task moves and status updates in database

- [ ] **Step 4: Test complete flow with PDF upload**

Upload a rider PDF that mentions "Sound engineer must be present for set"
Verify: Tasks created in correct column based on extracted data

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: verify enhanced staff task generation flow"
```

---

### Task 5: Run Lint and Tests

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

- [ ] **Step 2: Run knip**

```bash
npm run knip
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: fix lint issues and pass tests"
```
