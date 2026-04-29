# Plan: Align Roles, Venues & Inventory with PAL-TOOL.xlsx

## Context

The PAL backoffice provided a spreadsheet (`PAL-TOOL.xlsx`) documenting their current operational data for roles, locations (venues), and inventory. The existing PAL Nightclub Booking System already covers many of these areas but has gaps:

1. **Venues** lack sub-location/area support — PAL locations like "PAL Club GmbH & Co. KG" have multiple floors/areas ("KERN, ORB, ORBIT") where inventory items can be placed.
2. **Inventory categories** differ between PAL's real-world categories and the current system's categories.
3. **Roles** are well-aligned (already multi-role, same roles), but some mapping/validation is needed.
4. **`items.current_location`** is plain text — should reference venue sub-locations for structured tracking.

## Approach

We'll add a **venue sub-locations** system (floors/areas/zones) so each venue can have named sub-locations, and inventory items can be placed at a specific sub-location via a foreign key. We'll also align inventory categories with PAL's categories and ensure the role system matches.

## PAL-TOOL.xlsx Summary (Reference)

### Role Assignment

| Head-Rolle         | Roles from PAL sheet (multi-role capable)           |
| ------------------ | --------------------------------------------------- |
| Manager            | Andre, David, Mary — "Alles" permission             |
| ADMIN              | Alexander — "Alles" permission                      |
| Azubi              | Johann, Anton — Booking, Staff, Social Media        |
| Manager+Tech+Label | Oliver — Tech, Staff, Social Media, Label, Booking  |
| Staff              | Gordon, Marvin, Mahoni, Tillmann — various          |
| Tech               | Jeldrik — Tech, Staff, Social Media, Label, Booking |
| Night-Management   | Lea Marie, Linus — Staff, HR                        |
| Gastro             | Max, Lu, Roses — Gastro, Staff, HR                  |
| HR & Finances      | Nathalie — HR                                       |
| Awareness          | (unnamed) — Awareness                               |

### Location

| Location               | Address            | Type                 | Floors/Sub-locations |
| ---------------------- | ------------------ | -------------------- | -------------------- |
| PHOXXI Green Area      | Deichtorstr. 1     | Venue                | Openair              |
| Deichtor-Hallen        | Deichtorstr. 1     | Lager                | —                    |
| Berliner Bahnhof       | Deichtorstr. 1     | Venue                | —                    |
| PAL Club GmbH & Co. KG | Hammerbrookstr. 43 | Venue                | **KERN, ORB, ORBIT** |
| Fruchthof              | —                  | Venue, Office, Lager | Openair              |
| PAL Office             | Grindelhof 35a     | Office               | —                    |
| Orbit Cafe             | Hammerbrookstr. 43 | Venue                | —                    |

### Inventory Categories (PAL)

- **DJ & Audio Equipment** (CDJ 3000, XONE 96, Technics SL 1210, Scarlett 4i4)
- **Lighting Equipment** (APELABS, Moving Head, Strobe, Fog machines, Lasers)
- **PA & SOUND** (PAL HORN, KLING FREITAG, VOID VENU 6, SSNAKE, SONOS)
- **Infrastructure & Signal** (Splitter, Adapter, XLR, PowerCON, Speakon)
- **Venue & Misc** (Sofa, Ventilator, Sitzkübel)

## Current System State

### Roles (`multi_role_system.sql` + `permissions.ts`)

- Multi-role via `user_roles` table (user_id, role) with UNIQUE constraint
- 13 roles: admin, manager, booking, social-media, night-management, label, staff, tech, tech-lead, gastro, backoffice, awareness, azubi
- Permission system with `FEATURE_PERMISSIONS`, `ROLE_ROUTE_ACCESS`, `ROLE_CONFIG`
- Admin page for role management at `/admin`
- **✅ Already well-aligned with PAL's role assignment**

### Venues (`venues` table)

```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  capacity INT NOT NULL,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
```

- **❌ No sub-locations/floors/areas**
- **❌ No venue type** (Venue, Lager, Office)
- API: `/api/venues`, `/api/venues/[id]`
- Page: `/venues` (CRUD with name, address, capacity)

### Inventory (`items` table)

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('sound', 'lighting', 'dj', 'furniture', 'bar', 'misc')),
  serial_number TEXT UNIQUE,
  brand TEXT, model TEXT,
  condition_enum TEXT CHECK (...),
  condition_notes TEXT,
  current_location TEXT,    -- ❌ Free text, not linked to venue sub-locations
  notes TEXT, photo_url TEXT,
  ...
);
```

- **❌ Categories don't match PAL**: PAL uses `DJ & Audio Equipment`, `Lighting Equipment`, `PA & SOUND`, `Infrastructure & Signal`, `Venue & Misc` — current uses `sound, lighting, dj, furniture, bar, misc`
- **❌ `current_location` is free text** — should optionally reference a venue sub-location
- Related tables: `item_location_history`, `rentals`, `task_items`

## Files to Modify

### New Migration

- `supabase/migrations/20260429000000_venue_sublocations_and_inventory_align.sql`

### Modified API routes

- `src/app/api/venues/route.ts` — add venue_type support
- `src/app/api/venues/[id]/route.ts` — include sub-locations in response
- `src/app/api/venues/[id]/sublocations/route.ts` (new) — CRUD for sub-locations
- `src/app/api/items/route.ts` — update categories, add sub_location_id
- `src/app/api/items/[id]/route.ts` — same
- `src/app/api/items/[id]/location-history/route.ts` — accept sub_location_id

### Modified Pages / Components

- `src/app/venues/page.tsx` — add venue type, sub-location management UI per venue card
- `src/components/inventory-form.tsx` — PAL categories, venue+sub-location cascade select
- `src/components/inventory-list.tsx` — display sub-location path
- `src/components/inventory-detail.tsx` — show sub-location detail + venue context
- `src/components/checkin-checkout-modal.tsx` — replace free-text with venue+sub-location select

### Configuration

- `src/lib/permissions.ts` — optionally add inventory write, sub-location management permissions

## Reuse

- **`permissions.ts`**: Role config/consts — extend FEATURE_PERMISSIONS for new features
- **Existing Supabase client pattern**: All API routes use `createClient(supabaseConfig.url, supabaseConfig.serviceKey)` — follow same pattern
- **Dialog/Form patterns**: Use same Dialog, Select, Form components from `@/components/ui/`
- **PAL roles mapping**: Already in `permissions.ts` as `ALL_ROLES` / `ROLE_CONFIG`

## Steps

- [x] **Step 1: Create migration**
  - ✅ Created `venue_sub_locations` table
  - ✅ Added `venue_type` column to `venues`
  - ✅ Added `sub_location_id FK` on `items`
  - ✅ Updated `items.category` CHECK constraint to PAL categories
  - ✅ RLS policies for new table
  - ✅ Seeded all PAL venues (7) with sub-locations and all ~50 inventory items

- [x] **Step 2: Update Venue API**
  - ✅ `GET /api/venues` now includes sub-locations per venue
  - ✅ `POST /api/venues` accepts `venue_type`
  - ✅ `PUT /api/venues/[id]` accepts `venue_type`
  - ✅ New `GET/POST /api/venues/[id]/sublocations` route
  - ✅ New `PUT/DELETE /api/venues/[id]/sublocations/[subId]` route

- [x] **Step 3: Update Items API**
  - ✅ `POST /api/items` accepts `sub_location_id`
  - ✅ `PUT /api/items/[id]` accepts `sub_location_id`
  - ✅ GET returns `sub_location` with venue info
  - ✅ Location-history route computes display string from sub-location

- [x] **Step 4: Update Venues Page**
  - ✅ Venue type select in create/edit form (Venue, Lager, Office, Mixed)
  - ✅ Sub-location list per venue card
  - ✅ Add sub-location dialog (name + description)
  - ✅ Delete sub-location button per item

- [x] **Step 5: Update Inventory Form**
  - ✅ Categories changed to PAL: DJ & Audio, Lighting, PA & Sound, Infrastructure, Venue & Misc
  - ✅ Venue → Sub-location cascade select added
  - ✅ Free-text location kept as fallback

- [x] **Step 6: Update Inventory List & Detail**
  - ✅ Category filter tabs updated to PAL categories
  - ✅ Detail shows sub-location path (Venue > Area)
  - ✅ venue_id filter support in API

- [x] **Step 7: Update Checkin/Checkout Modal**
  - ✅ Removed hardcoded LOCATION_PRESETS
  - ✅ Added Venue → Sub-location cascade select
  - ✅ Kept manual location input as fallback
  - ✅ Sends `sub_location_id` to API when selected

- [x] **Step 8: Update Permissions**
  - ✅ Added INVENTORY_READ / INVENTORY_WRITE / INVENTORY_CHECKIN feature permissions
  - ✅ Added VENUE_SUBLOCATIONS_READ / VENUE_SUBLOCATIONS_WRITE feature permissions
  - ✅ Added INVENTORY and RENTALS route groups and role access

## Verification

1. Run migration: `npx supabase migration up`
2. Navigate to `/venues` — verify venue type + sub-location CRUD works
3. Create sub-locations for PAL Club: "KERN", "ORB", "ORBIT"
4. Go to `/inventory` → Add Item — verify categories are PAL's, location shows "Select Venue → Select Sub-location"
5. Edit item — verify sub-location persists
6. Check-in/out modal — verify venue+sub-location cascade select
7. `/admin` role management — verify still works (not affected)
8. Run tests: `npx vitest run`
