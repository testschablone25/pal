# Zeiterfassung — PIN-Based Kiosk (Production)

## Solution

Replace the current name-grid kiosk with a PIN-based clock in/out system. Staff searches their name, enters a 4-digit PIN, and clocks in/out. A dedicated iPad kiosk account with minimal permissions keeps the system always-on at the club entrance.

## Route Change
- New kiosk: `/zeiterfassung` (German, intuitive for the team)
- Existing `/time-bookings` and `/time-bookings/dashboard` remain unchanged

---

## Steps

### Step 1: Database Migration — Add PIN columns to staff table

**File:** `supabase/migrations/20260607000000_staff_pins.sql`

- Add `pin_encrypted TEXT` column to `staff` table (reversible encryption, not hash)
- Add `pin_is_default BOOLEAN DEFAULT true` (tracks if still on 1111)
- Add `pin_must_change BOOLEAN DEFAULT false` (forced change flag)
- Set default encrypted value of `1111` for all existing staff

**Verification:** Apply migration, verify columns exist.

---

### Step 2: PIN Utility Functions

**File:** `src/lib/pin.ts`

- `encryptPin(pin: string): string` — reversible encryption (AES-GCM with env-based key)
- `decryptPin(encrypted: string): string` — decrypt for comparison
- `isDefaultPin(pin: string): boolean` — check if pin === "1111"
- `validatePinFormat(pin: string): boolean` — exactly 4 digits

**Verification:** Unit tests for encrypt/decrypt round-trip, format validation.

---

### Step 3: Dedicated Kiosk Account Setup

**Manual step / documentation:**
- Create a Supabase auth user: `kiosk@pal.club` (or similar)
- Assign role: `staff` only (no manager/admin)
- Create a staff record linked to this user
- Configure RLS so this account can only access clock in/out endpoints
- Store credentials in iPad browser (persistent login)

**File:** `docs/kiosk-account.md` — setup instructions

---

### Step 4: API Endpoints

**New routes:**
- `POST /api/zeiterfassung/verify-pin` — verify PIN, return staff info + clock status
- `POST /api/zeiterfassung/clock-in` — clock in for selected staff (body: `{ staff_id, pin }`)
- `POST /api/zeiterfassung/clock-out` — clock out for selected staff (body: `{ staff_id, pin }`)
- `POST /api/zeiterfassung/change-pin` — change PIN (body: `{ staff_id, old_pin, new_pin }`)
- `POST /api/zeiterfassung/reset-pin` — manager reset to 1111 (body: `{ staff_id }`, requires TIME_BOOKINGS_MANAGE)

**Existing routes updated:**
- `GET /api/time-bookings` — add `?all=true` support (already done)

**Logic:**
- `verify-pin`: Decrypt stored PIN, compare → returns staff info, whether they're clocked in, and if PIN must be changed
- `clock-in/out`: Verify PIN first, then create/update time booking
- `change-pin`: Validate old PIN, encrypt new one, set `pin_is_default = false`, `pin_must_change = false`
- `reset-pin`: Manager-only, sets encrypted PIN back to 1111, `pin_is_default = true`

**Verification:** Unit tests for PIN verification, clock-in with valid/invalid PIN.

---

### Step 5: Kiosk Page — `/zeiterfassung`

**Files:**
- `src/app/zeiterfassung/page.tsx` — server component
- `src/components/zeiterfassung/kiosk-page.tsx` — client component

**UX Flow:**
1. **State 1 — Name Search:** Large search input, type to filter staff list (name + role), tap your name
2. **State 2 — PIN Entry:** Shows selected name, 4-digit PIN pad (big buttons), numeric keypad layout
3. **State 3 — Confirmation:** Big green/red flash with name + "Eingestempelt"/"Ausgestempelt" + time, auto-returns to State 1 after 3s
4. **State 4 — First-Time PIN Change:** If `pin_must_change` or `pin_is_default`, show "Set Your PIN" screen with two fields (new PIN + confirm) before clocking in

**Design:**
- Full-screen, iPad-optimized
- Large tap targets (min 56px)
- Dark theme, high contrast
- Currently clocked-in staff shown as a small strip at the bottom
- No navigation elements visible — kiosk mode

**Verification:** Visual review on iPad/iPad simulator.

---

### Step 6: Dashboard — PIN Management Section

**File:** Update `src/components/time-bookings/dashboard-view.tsx`

Add a "PIN Management" tab/section to the existing dashboard:
- Table showing all staff: Name, Role, PIN Status (✅ Custom / ⚠️ Default 1111), Last PIN Change Date
- "Reset to 1111" button per staff member (confirms dialog)
- Filter: show only staff on default PIN

**Verification:** Build, lint, visual review.

---

### Step 7: Add /zeiterfassung to Permissions & Nav

**Files:**
- `src/lib/permissions.ts` — add `/zeiterfassung` to `ROLE_ROUTE_ACCESS` (all roles)
- `src/proxy.ts` — add `/zeiterfassung` to `PROTECTED_ROUTES`
- `src/components/nav-bar.tsx` — optional: add link for managers

**Verification:** Route is accessible, protected by auth.

---

### Step 8: Environment Variable

**File:** `.env.local` (and production env)

```
KIOSK_PIN_SECRET=aes-256-gcm-32-byte-key-here
```

**Verification:** App reads env var, encrypt/decrypt works.

---

### Step 9: Tests & Quality Gates

- Unit tests for PIN utilities
- API tests for verify/clock-in/change-pin
- `npm run build`, `npm run lint`, `npm run knip`, `npm run jscpd`

---

## Risks / Open Questions

- **Encryption key management:** The `KIOSK_PIN_SECRET` must be in production env. If lost, all PINs are unrecoverable (but manager can reset everyone to 1111).
- **Brute-force protection:** 4-digit PINs = 10,000 combinations. Should add rate-limiting on the verify endpoint (e.g. max 5 failed attempts per minute per IP). Can be a follow-up.
- **Multi-language:** Currently German labels only. Can add i18n later if needed.
