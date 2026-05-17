# PLAN — Telephone Book + Venue Sorting + Artist Autocomplete

## Status: ✅ COMPLETED

### Feature 1 — Telephone / Address Book

| Step                                            | Status      |
| ----------------------------------------------- | ----------- |
| Create migration for `is_pal_location` column   | ✅ [DONE:1] |
| Permissions: `CONTACTS_READ`, `/contacts` route | ✅ [DONE:2] |
| Create `GET /api/contacts` endpoint             | ✅ [DONE:3] |
| Update venues API for `is_pal_location`         | ✅ [DONE:4] |
| Venues page: add PAL/External filter            | ✅ [DONE:5] |
| Create `/contacts` page with search             | ✅ [DONE:6] |
| Create `/contacts/loading.tsx`                  | ✅ [DONE:7] |
| Add "Contacts" to nav-bar                       | ✅ [DONE:8] |

### Feature 2 — Artist Autocomplete in Running Order

| Step                                                               | Status |
| ------------------------------------------------------------------ | ------ |
| Replace `<Select>` dropdown with search-as-you-type input          | ✅     |
| Debounced search against `/api/artists?name=`                      | ✅     |
| Show artist suggestions in Command popover (genre, city badges)    | ✅     |
| "Create new artist" option at bottom of suggestions                | ✅     |
| Inline create form (name, genre, city) with POST to `/api/artists` | ✅     |
| Auto-select newly created artist                                   | ✅     |

### Files created/modified

| File                                                         | Change                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `supabase/migrations/20260605000000_contacts_venue_sort.sql` | Migration: add `is_pal_location`                           |
| `src/lib/permissions.ts`                                     | Added `CONTACTS_READ`, `ROUTE_GROUPS.CONTACTS`             |
| `src/app/api/contacts/route.ts`                              | **New** — unified contact list API                         |
| `src/app/api/venues/route.ts`                                | Accept `is_pal_location` in POST                           |
| `src/app/api/venues/[id]/route.ts`                           | Accept `is_pal_location` in PUT                            |
| `src/app/contacts/page.tsx`                                  | **New** — telephone book page                              |
| `src/app/contacts/loading.tsx`                               | **New** — loading skeleton                                 |
| `src/app/venues/page.tsx`                                    | Added PAL/External filter buttons + filtering              |
| `src/components/nav-bar.tsx`                                 | Added Phone icon + "Contacts" nav item                     |
| `src/components/performance-form.tsx`                        | **Rewritten** — autocomplete artist search + inline create |
