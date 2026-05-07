# WP-6 Result: Fix "Self" Mode in Availability Page

**Status:** ✅ Complete

**File modified:** `src/app/staff/availability/page.tsx`

## Changes Made

1. **Added import:** `import { createClient } from "@/lib/supabase/browser";`

2. **Replaced demo code** (lines 30-32) that picked the first staff member:

   ```ts
   // BEFORE: For demo purposes, use the first staff member
   setStaffMemberId(staffList[0].id);

   // AFTER: Match the logged-in user's profile_id to find their staff record
   const supabase = createClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();
   if (user) {
     const myStaffRecord = staffList.find(
       (s: Record<string, unknown>) => s.profile_id === user.id,
     );
     if (myStaffRecord) {
       setStaffMemberId(myStaffRecord.id as string);
     }
   }
   ```

3. **Removed demo comment** and replaced with descriptive comment.

## How It Works

- When `viewMode === "self"`, the effect fetches all staff from `/api/staff`
- After receiving the staff list, it gets the current Supabase session user
- It matches `staff.profile_id === user.id` to find the current user's staff record
- If a match is found, `staffMemberId` is set to that record's ID
- If no match is found, `staffMemberId` stays `undefined` (component handles this gracefully)

## Validation

- [x] Lint passes for modified file (0 issues)
- [x] "All" mode unaffected — still uses the Select dropdown
- [x] `profile_id` is available in staff API response (staff table column, selected via `*`)
- [x] Error handling: if `getUser()` fails or no match found, falls through gracefully
- [x] No type errors — uses `Record<string, unknown>` for untyped fetch response

## Dependencies

- Requires WP-3 (`STAFF_READ` includes `"staff"` role) for staff users to call `/api/staff`
- Requires WP-5 (staff records linked to profiles via `profile_id`) for matching to work

## Risk

- Low. If user has no staff record, they simply won't have a pre-selected staff member and will see the "all" view (or an empty calendar).
- The `createClient()` call is a browser client singleton (no extra network overhead).
