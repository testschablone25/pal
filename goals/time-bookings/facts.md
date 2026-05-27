# Time Bookings — Facts

- A new `time_bookings` database table exists with: id (UUID), staff_id (FK → staff), clocked_in_at (TIMESTAMPTZ), clocked_out_at (TIMESTAMPTZ, nullable), notes (TEXT, nullable), corrected_by (UUID FK → profiles, nullable), created_at, updated_at
- POST /api/time-bookings/clock-in authenticates the user, looks up their staff_id, creates a new time_booking row with clocked_in_at = NOW(). If the user already has an open booking, it is auto-closed with clocked_out_at = NOW() and the new one starts.
- POST /api/time-bookings/clock-out authenticates the user, finds their latest open time_booking (where clocked_out_at IS NULL), and sets clocked_out_at = NOW(). Returns 400 if no open booking exists.
- GET /api/time-bookings returns all time bookings with optional filters: date range (date_from, date_to) and staff_id. Staff can only see their own. Managers/admins can see all.
- PUT /api/time-bookings/[id] allows managers/admins to edit clocked_in_at, clocked_out_at, and notes on any time booking. Staff cannot edit. All edits set corrected_by = auth.uid().
- RLS policies on the time_bookings table: authenticated users can INSERT (clock in), authenticated users can UPDATE only their own open booking (clock out), managers/admins can SELECT and UPDATE all time bookings.
- A dedicated /time-bookings page exists as the iPad kiosk view. It shows a full-screen list/grid of all staff members (name + role). Each staff member has a large tap-friendly button showing their current status: 'Clock In' (green) if not clocked in, or 'Clock Out' (red) with a live elapsed-time counter if clocked in.
- The kiosk page includes a staff search/filter input at the top so staff can quickly find their name. The page auto-refreshes every 30 seconds to show live status changes from other iPads/sessions.
- A /time-bookings/dashboard page exists for managers. It shows: (1) a 'Currently Clocked In' section listing all staff currently on the clock with elapsed time, (2) a date-filtered table of all time bookings with staff name, clock-in time, clock-out time, duration, and notes, (3) a total-hours summary per staff member for the selected date range, and (4) a CSV export button.
- The dashboard table has inline edit capability — managers can click a booking row to edit clocked_in_at, clocked_out_at, and add/edit notes via a dialog.
- CSV export downloads a file with columns: Staff Name, Role, Clock In, Clock Out, Duration (hours), Notes. Filename: time-bookings-YYYY-MM-DD.csv.
- The kiosk page is optimized for iPad: large tap targets (min 48px), high contrast text, no small links or navigation elements that could be accidentally triggered. Designed as a single-screen, full-viewport view.
