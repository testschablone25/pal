# Time Bookings — Clock In / Clock Out

## Goal

Build an iPad kiosk time booking system for PAL nightclub where staff can tap to clock in and clock out, and managers have a dashboard to view, correct, and export time booking data.

## Shared Understanding

See [facts.md](./facts.md) for the complete list of verifiable outcomes.

## Execution Plan

See [plan.md](./plan.md) for the step-by-step implementation approach.

## Done When

- ✅ `time_bookings` table exists in Supabase with RLS policies
- ✅ Clock in/out API routes work (POST clock-in, clock-out)
- ✅ `/time-bookings` kiosk page is iPad-optimized with large tap targets, staff search, and auto-refresh
- ✅ `/time-bookings/dashboard` shows live clocked-in staff, booking table with date filters, total hours, CSV export, and inline editing
- ✅ Managers can correct time bookings retroactively
- ✅ All quality gates pass: build, lint, knip, jscpd, tests
- ✅ No dead code or duplicate code introduced
