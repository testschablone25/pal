# Shift Planning — Finish Implementation & Manual Testing

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add the missing edit shift UI (the PUT endpoint exists but no frontend), then walk through manual testing to verify the full CRUD flow works end-to-end.

**Architecture:** The shift scheduling page at `src/app/staff/shifts/page.tsx` already has a fully working "Add Shift" dialog using react-hook-form + zod. We'll reuse the same form schema, dialog pattern, and form components to build an "Edit Shift" dialog. The PUT endpoint at `/api/shifts/[id]` already handles updates — we just need to wire it to the UI.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase, react-hook-form + zod, shadcn/ui (Dialog, Form, Select, Button, Badge)

**Current state:**
- Shift CRUD API: ✅ GET list, GET single, POST create, PUT update, DELETE
- Shift UI: ✅ Event selector, timeline view (18:00-06:00), shift list, add dialog, delete dialog, loading states, empty states, availability warnings
- **Missing:** ❌ Edit shift button/dialog — no way to update a shift from the UI
- **Missing:** ❌ Manual testing not yet performed

---

### Task 1: Add Edit Shift Dialog to the Shifts Page

**Objective:** Add an "Edit" button next to each shift (both in timeline view and list view) that opens a pre-populated dialog for editing shift details.

**Files:**
- Modify: `src/app/staff/shifts/page.tsx`

**Step 1: Understand the existing code**

The page already has:
- `Shift` interface with all fields (id, event_id, staff_id, role, start_time, end_time, break_minutes, status)
- `ShiftFormValues` zod schema matching the POST payload
- `onSubmit` handler that sends POST to `/api/shifts`
- Add Shift dialog using `<Form>`, `<Select>`, `<Input type="time">`, etc.
- Staff list fetched in `fetchStaff()`
- `formatTime()` helper for display

**Step 2: Add state for edit mode**

Add these state variables after the existing `shiftDialogOpen` and related states (line 118-122):

```tsx
const [editingShift, setEditingShift] = useState<Shift | null>(null);
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editSaving, setEditSaving] = useState(false);
```

**Step 3: Add edit form schema**

The same `shiftSchema` can be reused, but we need to handle the fact that on edit, we populate from an existing shift's values. Add a separate form for editing:

```tsx
const editForm = useForm<ShiftFormValues>({
  resolver: zodResolver(shiftSchema),
  defaultValues: {
    staff_id: '',
    role: '',
    start_time: '',
    end_time: '',
    break_minutes: 0,
    status: 'scheduled',
  },
});
```

**Step 4: Add `handleEditClick` function**

Add this after the `handleDeleteClick` function (around line 236):

```tsx
const handleEditClick = (shift: Shift) => {
  setEditingShift(shift);
  editForm.reset({
    staff_id: shift.staff_id,
    role: shift.role,
    start_time: formatTime(shift.start_time),
    end_time: formatTime(shift.end_time),
    break_minutes: shift.break_minutes,
    status: shift.status,
  });
  setEditDialogOpen(true);
};
```

**Step 5: Add `onEditSubmit` function**

Add this after the `onSubmit` function (around line 234):

```tsx
const onEditSubmit = async (values: ShiftFormValues) => {
  if (!selectedEventId || !editingShift) return;

  setEditSaving(true);
  try {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent) throw new Error('Event not found');

    const startDateTime = `${selectedEvent.date}T${values.start_time}:00`;
    const endDateTime = `${selectedEvent.date}T${values.end_time}:00`;

    const response = await fetch(`/api/shifts/${editingShift.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: selectedEventId,
        staff_id: values.staff_id,
        role: values.role,
        start_time: startDateTime,
        end_time: endDateTime,
        break_minutes: values.break_minutes,
        status: values.status,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update shift');
    }

    setEditDialogOpen(false);
    setEditingShift(null);
    editForm.reset();
    fetchShifts();
  } catch (error) {
    console.error('Error updating shift:', error);
  } finally {
    setEditSaving(false);
  }
};
```

**Step 6: Add Edit button to the shift list items**

In the list view (around line 554, before the Delete button), add an Edit button:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
  onClick={() => handleEditClick(shift)}
>
  <Pencil className="h-4 w-4" />
</Button>
```

Update the imports at the top of the file to include `Pencil` from lucide-react:

```tsx
import { Calendar, Clock, Plus, Trash2, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
```

Also add the same Edit button in the timeline view (around line 465-473), before the Delete button in the timeline bars.

**Step 7: Add Edit Shift Dialog**

Add this JSX after the Delete Confirmation Dialog (after line 773, before the closing `</div>`):

```tsx
{/* Edit Shift Dialog */}
<Dialog open={editDialogOpen} onOpenChange={(open) => {
  if (!open) {
    setEditDialogOpen(false);
    setEditingShift(null);
  }
}}>
  <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
    <DialogHeader>
      <DialogTitle className="text-white">Edit Shift</DialogTitle>
      <DialogDescription className="text-zinc-400">
        Update shift details for {selectedEvent?.name}
      </DialogDescription>
    </DialogHeader>
    <Form {...editForm}>
      <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
        <FormField
          control={editForm.control}
          name="staff_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff Member *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {staff.map((member) => {
                    const unavailable = isStaffUnavailable(member.id);
                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          {member.profiles?.full_name || 'Unknown'}
                          {unavailable && (
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={editForm.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={editForm.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="time"
                    className="bg-zinc-950 border-zinc-800"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={editForm.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="time"
                    className="bg-zinc-950 border-zinc-800"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={editForm.control}
          name="break_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Break (minutes)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="0"
                  className="bg-zinc-950 border-zinc-800"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={editForm.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditDialogOpen(false);
              setEditingShift(null);
            }}
            className="border-zinc-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={editSaving}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

**Step 8: Test build**

```bash
cd /root/pal && npm run build
```

Expected: Build succeeds with no TypeScript errors. If there are compile errors, fix them.

Then run lint:
```bash
npm run lint
```

Expected: No lint errors.

---

### Task 2: Manual Testing — Shift CRUD Walkthrough

**Objective:** Spin up the dev server and manually verify every shift CRUD operation works end-to-end.

**Files:**
- None to modify — purely manual testing

**Prerequisites:** Dev server must be running (`npm run dev`). You need login credentials for the PAL app.

**Manual Test Checklist:**

1. **Navigate to Shift Planning page**
   - Go to `/staff/shifts`
   - ✅ Verify event selector dropdown shows published events
   - ✅ Verify selecting an event loads the timeline and shift list

2. **Create a shift (Add)**
   - ✅ Click "Add Shift"
   - ✅ Verify dialog opens with all fields: Staff Member, Role, Start Time, End Time, Break, Status
   - ✅ Fill in valid data and submit
   - ✅ Verify the new shift appears in both the timeline view and the list view
   - ✅ Verify the "Total Shifts" count updates

3. **Edit a shift (the new feature)**
   - ✅ Click the Edit (pencil) button on a shift in the list view
   - ✅ Verify the edit dialog opens pre-populated with the shift's current values
   - ✅ Change staff member, role, time, and status
   - ✅ Save — verify the list and timeline update with new values

4. **Edit from timeline view**
   - ✅ Click the Edit button on a shift bar in the timeline view
   - ✅ Verify same pre-populated dialog opens
   - ✅ Make a change and save

5. **Delete a shift**
   - ✅ Click the Delete (trash) button on a shift
   - ✅ Verify confirmation dialog appears
   - ✅ Confirm — verify shift is removed from both views

6. **Edge cases**
   - ✅ Try to create a shift with empty fields — verify validation errors appear
   - ✅ Verify the availability warning badge shows for staff marked as unavailable
   - ✅ Switch events — verify shifts reload for the selected event

7. **Status badges**
   - ✅ Verify colors: scheduled (zinc), confirmed (emerald), completed (blue), cancelled (red)

Report any bugs, console errors, or unexpected behavior.

---

### Task 3: Fix Any Bugs Found During Testing

**Objective:** Fix any issues discovered during manual testing in Task 2.

**Files:** As needed, based on bugs found

**Step 1:** If bugs were found, create focused fix tasks (one per bug) with:
- The exact error/issue description
- Root cause analysis
- Fix implementation

**Step 2:** After fixing, re-run manual testing to verify the fix

**Step 3:** Commit fixes with descriptive messages

---

### Verification

- [ ] Edit shift dialog opens pre-populated with existing data
- [ ] PUT request succeeds and shift updates in DB
- [ ] Timeline and list views reflect updated data
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] All CRUD operations verified manually
- [ ] No console errors during testing
