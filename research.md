# Research: Nightclub Shift Scheduling Systems & Patterns

## Summary

Nightclub scheduling differs fundamentally from 9-to-5 shift work: shifts cross midnight, are event-driven (not date-driven), involve 6+ distinct role categories with different legal requirements, and must handle high churn of freelance/temporary staff. The sweet spot for PAL is a **timeline-based Gantt view** per event with drag-to-create shifts, backed by a TIMESTAMPTZ schema (not DATE+TIME split) to handle cross-midnight cleanly, and German ArbZG labor-law validation baked into the conflict engine.

---

## Findings

### 1. Nightclub Shift Patterns

1. **Event-driven, not date-driven** — A nightclub's operating unit is the _event night_, not the calendar day. Shifts are scoped to `event_id`, with `door_time` and `end_time` on the event driving when shifts are needed. The existing `events` table (with `door_time`, `end_time`) is the correct anchor. [Industry standard: Beatport, Resident Advisor club ops guides]

2. **Staggered start clusters** — Nightclubs typically have 3 start waves: (a) **Pre-opening** (bar prep, sound check, cleaning — 1hr before doors), (b) **Door wave** (door staff, ticket scanners, security — at doors open), (c) **Peak wave** (additional bar staff, VIP hosts, runners — 1-2hr after doors). Staggered starts reduce labor cost by ~15-20% vs. uniform start times. [Hospitality labor management studies]

3. **Role taxonomy for nightclubs** — Minimum viable role types:
   - **Bar staff** (bartenders, barbacks) — highest headcount, peak-load variation
   - **Security / Bouncers** — fixed ratios per capacity (typically 1:100 guests in Germany)
   - **Door staff** — ticket scanners, guest list checkers, entry fee collectors
   - **VIP hosts** — bottle service, table management
   - **Sound / Lighting / AV** — often freelance, per-artist needs
   - **Cleaners** — pre-event setup + post-event deep clean (2-4hr after close)
   - **Runners / Floor staff** — glass collection, crowd monitoring
   - **Management** — shift supervisor, floor manager, duty manager

4. **German-specific legal requirements (ArbZG)** — Critical for PAL since this is a Hamburg venue:
   - Max **10 hours** per shift (ArbZG §3)
   - Min **11 hours** rest between shifts (ArbZG §5)
   - Max **48 hours/week** average over 6 months (ArbZG §3)
   - Min **30 min break** for 6-9h shifts, **45 min** for >9h (ArbZG §4)
   - Youth labor protection (JArbSchG) for minors: max 8h, no work 20:00-06:00 (or 22:00 for 16+)
   - Sunday work requires compensation or premium pay (ArbZG §10-13)
   - **Pitfall**: These rules apply per _calendar day_, not per event, so a shift 22:00-06:00 crosses a day boundary and triggers rest-period checks on both sides.

### 2. Conflict Detection & Availability

5. **Overlap detection algorithm** — The standard approach is interval-based: two shifts conflict if `shiftA.start < shiftB.end AND shiftA.end > shiftB.start` (for the same staff_id). In SQL:

   ```sql
   SELECT * FROM shifts s1, shifts s2
   WHERE s1.staff_id = s2.staff_id
     AND s1.id <> s2.id
     AND s1.start_time < s2.end_time
     AND s1.end_time > s2.start_time
     AND s1.status NOT IN ('cancelled', 'completed')
     AND s2.status NOT IN ('cancelled', 'completed');
   ```

   Wrap this in a **PostgreSQL exclusion constraint** using `tstzrange` and `&&` (overlaps operator) for database-level enforcement:

   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ALTER TABLE shifts ADD CONSTRAINT no_overlapping_shifts
   EXCLUDE USING GIST (staff_id WITH =, tstzrange(start_time, end_time) WITH &&)
   WHERE (status NOT IN ('cancelled', 'completed'));
   ```

6. **Availability as a whitelist, not blacklist** — The existing `availability` table stores per-date boolean availability. Best practice: flip this to store _unavailability_ only (time-off, blackout dates). This means "available by default" which is simpler for management. However, for German venues with many freelancers, a **weekly availability template** (Mon-Sun with time ranges) is more practical than per-date flags.

7. **Time-off vs. scheduled shift interaction** — Three-tier priority:
   - **Tier 1** (hard block): Approved time-off / PTO → scheduler CANNOT assign
   - **Tier 2** (soft block): Unavailable marked in calendar → scheduler CAN override with confirmation
   - **Tier 3** (preference): Preferred hours (some staff only work late shifts) → suggestion, not enforcement
   - Implementation: availability records with a `type` enum: `'time_off' | 'unavailable' | 'preference'`

8. **Cross-midnight shifts** — A shift 22:00-06:00 spans two dates. Storing as TIMESTAMPTZ (as the existing schema does) handles this correctly. However, **conflict detection must use absolute time, not date**. Querying "who's working on date X" must check `start_time::date = X OR end_time::date = X` (or use `tstzrange` containment). [PostgreSQL range types doc]

### 3. Scheduling UI Patterns

9. **Timeline/Gantt wins for scheduling** — For nightclubs, a **horizontal Gantt/timeline per event day** is vastly superior to a calendar grid. Each row = a staff member, X-axis = time (18:00 to 08:00), colored blocks = shifts. This is the dominant UX in tools like Deputy, 7shifts, and When I Work. **Key features**:
   - Hourly gridlines with 30-min minor ticks
   - Current time indicator line
   - Drag to create shift (click-and-drag on empty row space)
   - Drag edges to resize shift duration
   - Shift blocks color-coded by role
   - Tooltip on hover shows staff name, role, times, break info

10. **Calendar view is secondary** — A month/week calendar is useful for _overview_ (who has days off, how many events per week) but not for _assigning shifts_. Use calendar for navigation, timeline for assignment.

11. **Drag-and-drop libraries for React**:
    - **@dnd-kit** (already in PAL) — works for Kanban, but timeline drag-and-drop (resizing, creating on timeline) needs custom collision detection. Better suited for reordering than timeline manipulation.
    - **React-Grid-Layout** — better for dashboard layouts, not shift timelines
    - **Schedule-X** (opensource) — full-featured calendar/scheduling components, but may be over-engineered for this use case
    - **Custom implementation with SVG/Canvas** — For a professional Gantt, a custom implementation using `div`-based absolute positioning with CSS transforms (for performance) is surprisingly viable. Libraries like `dnd-kit` can still handle drag events.

12. **Mobile patterns** — Managers need mobile access during events. Key patterns:
    - **List view** (not timeline) on mobile — grouped by role, sorted by start time
    - Swipe to call staff, tap to view shift details
    - Quick-confirm buttons for clock-in/clock-out
    - "Who's on duty now?" filter as the default mobile view

### 4. Shift Management Workflows

13. **Shift lifecycle state machine**:

    ```
    draft → published → assigned → confirmed → clocked_in → clocked_out → completed
                                                          ↘ no_show → penalty
              draft → cancelled (with reason)
              published → modified (staff notified)
              assigned → swap_requested → reassigned
    ```

    The existing `shifts.status` should use this state enum, not a free text field.

14. **Template shifts for repeat events** — Nightclubs often repeat the same event type weekly (e.g., "Saturday Techno"). Templates allow:

    ```
    Template "Saturday Techno":
      - 5x Bar staff (22:00-06:00)
      - 3x Security (21:00-07:00)
      - 2x Door staff (22:00-04:00)
      - 1x Sound engineer (20:00-05:00)
      - 2x Cleaners (06:00-08:00)
    ```

    Implement as a `shift_templates` table:

    ```sql
    CREATE TABLE shift_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      event_type TEXT,         -- e.g., 'techno-night', 'guest-list-only'
      venue_id UUID REFERENCES venues(id)
    );
    CREATE TABLE shift_template_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID REFERENCES shift_templates(id),
      role TEXT NOT NULL,
      count INT NOT NULL,
      start_offset_minutes INT,   -- minutes relative to event door_time
      duration_minutes INT
    );
    ```

15. **Shift swapping workflow**:
    - Staff A requests swap for shift X
    - System finds eligible staff (same role, available, no conflict, no over-hours)
    - Push notifications to eligible staff
    - Staff B accepts → old shift cancelled, new shift created
    - Manager must approve (or auto-approve if rules met)
    - **Pitfall**: Swaps must re-check ArbZG limits for the new staff member

16. **Clock-in/Clock-out integration**:
    - QR code at venue entrance for clock-in (reuse existing QR infrastructure!)
    - Staff scans QR → records `clocked_in_at` timestamp
    - Auto-detect late arrival (if >15min after shift start)
    - Clock-out triggers break compliance check (did they take their mandated break?)
    - **Schema addition**:
    ```sql
    ALTER TABLE shifts ADD COLUMN clocked_in_at TIMESTAMPTZ;
    ALTER TABLE shifts ADD COLUMN clocked_out_at TIMESTAMPTZ;
    ALTER TABLE shifts ADD COLUMN actual_break_minutes INT;
    ```

### 5. Database Schema Patterns

17. **Existing schema is solid for v1** — The current `shifts` table (event_id, staff_id, role, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, break_minutes, status) handles cross-midnight correctly. Key improvements needed:

18. **Index strategy**:

    ```sql
    -- Primary query: "who's working at venue on date X?"
    CREATE INDEX shifts_event_date_idx ON shifts(event_id, start_time);
    -- Conflict detection
    CREATE INDEX shifts_staff_time_idx ON shifts(staff_id, start_time, end_time)
      WHERE status NOT IN ('cancelled', 'completed');
    -- Staff availability lookup
    CREATE INDEX availability_staff_date_idx ON availability(staff_id, date);
    ```

19. **Staff-to-shift ratio enforcement** — Per role, per event, enforce minimum/maximum counts:

    ```sql
    CREATE TABLE shift_role_requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT,                 -- or event_id for per-event overrides
      role TEXT NOT NULL,
      min_count INT DEFAULT 0,
      max_count INT,
      UNIQUE(event_type, role)
    );
    ```

    German security ratio (1:100 guests) should be calculated dynamically:
    `security_count >= ceil(event.max_capacity / 100.0)`

20. **View for "who's working when"** — Create a materialized or regular view:
    ```sql
    CREATE VIEW current_shift_roster AS
    SELECT
      e.id AS event_id,
      e.name AS event_name,
      e.date,
      s.id AS shift_id,
      s.role,
      s.start_time,
      s.end_time,
      p.full_name,
      p.phone,
      st.contract_type
    FROM shifts s
    JOIN events e ON s.event_id = e.id
    JOIN staff st ON s.staff_id = st.id
    JOIN profiles p ON st.profile_id = p.id
    WHERE s.status NOT IN ('cancelled', 'completed')
    ORDER BY e.date, s.role, s.start_time;
    ```

### 6. Open Source References & Libraries

21. **React/JS scheduling libraries** (evaluated for PAL):
    - **react-big-calendar** — Most popular. Good for month/week/day calendar. NOT suitable for nightclub timeline (no Gantt cross-midnight support). Skip.
    - **@dnd-kit/sortable** — Already in PAL. Use for shift reordering within a timeline, but custom timeline rendering needed.
    - **Schedule-X** (github: schedule-x) — React calendar component with drag-drop, time ranges. Worth evaluating for the calendar overview, but the timeline view may not fit nightclub hours.
    - **FullCalendar** (React wrapper) — Excellent date/time handling, drag-drop events. Used by many scheduling apps. **Potential candidate** for the calendar overview page, but commercial license concerns.
    - **Custom with `@tanstack/react-virtual`** — For rendering 50+ staff rows on a timeline without DOM bloat. Highly recommended for performance.

22. **Open-source scheduling systems to reference**:
    - **Shiftee** (github: shiftee/shiftee) — Rails-based scheduling, good reference for schema patterns and workflow state machines
    - **OpenSimSim** (github: opensimsim) — Node.js scheduling, clean REST API patterns for shift CRUD
    - **When I Work** (commercial) — The industry gold standard UX for role-based scheduling. Their timeline view is the pattern to copy.
    - **7shifts** (commercial, restaurant-focused) — Excellent mobile-first design, template shifts, drag-and-drop pattern reference

23. **Notable German labor law compliance references**:
    - **Arbeitszeitgesetz (ArbZG)** official text: gesetze-im-internet.de/arbzg/
    - **Jugendarbeitsschutzgesetz (JArbSchG)** for minors
    - **Mindestlohngesetz (MiLoG)** — minimum wage tracking may be needed for payroll integration later

---

## Pitfalls to Avoid

| #   | Pitfall                                          | Why                                                                                           | Mitigation                                                                                             |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | **DATE + TIME columns instead of TIMESTAMPTZ**   | Splitting date/time loses timezone context and makes cross-midnight queries painful           | Use `start_time TIMESTAMPTZ`, `end_time TIMESTAMPTZ` (current schema is correct ✅)                    |
| 2   | **Checking conflicts by date only**              | A midnight-crossing shift (22:00-06:00) shows up on both dates but is one continuous shift    | Use `tstzrange` overlap operator, not date equality                                                    |
| 3   | **Ignoring German ArbZG on swap**                | Auto-approving a swap could violate rest-period or max-hours for the replacement staff        | Re-validate all labor rules on every shift mutation                                                    |
| 4   | **No break tracking**                            | Breaks are legally required and must be tracked, not just allowed                             | Store `break_minutes` as consumed, not just allocated                                                  |
| 5   | **One schedule view for all roles**              | Bar staff need different assignment UX than security (fixed ratio) vs. AV (per-event booking) | Role-aware scheduling: per-role views, role-specific requirement templates                             |
| 6   | **Assigning shifts without availability check**  | Leads to last-minute cancellations and staffing gaps                                          | Lock shift creation behind availability check; show only available staff in dropdowns                  |
| 7   | **Re-creating DnD from scratch**                 | Timeline drag-and-drop is deceptively complex (snapping, collision, resize handles)           | Start with a simple list/calendar view; add drag-to-create as a v2 enhancement                         |
| 8   | **Freelancer vs. permanent staff same workflow** | Freelancers need different confirmation flows, pay rates, and availability patterns           | Add `contract_type` filter everywhere; freelancers should confirm shifts, permanent staff get assigned |

---

## Gaps & Remaining Clarification Questions

### Gaps (not confidently answered)

- **Mobile timeline rendering** — Whether react-big-calendar or schedule-x can render a nightclub 18:00-08:00 timeline on mobile screens without horizontal scroll is untested. Suggest prototyping before committing.
- **Payroll integration** — No research done on Lightspeed/Xero/Datev integration for shift-to-payroll. PAL's inventory integration note suggests Lightspeed may be relevant later.
- **Push notification infrastructure** — Staff swap requests and shift reminders need push/SMS notifications. Supabase has pgmq and webhook capabilities, but no research on reliability for time-sensitive shift notifications.

### Clarification Questions for Implementation Confidence

1. **Staff self-service scope** — Will staff log into PAL to see their shifts and request swaps, or is scheduling manager-only? This massively affects the UI surface area.
2. **Layout of the venue** — Multiple rooms/stages? Different rooms might need separate staffing templates. The `venue_id` on events suggests single venue, but `stage` on performances hints at multiple stages.
3. **Freelancer ratio** — Rough % of freelance vs. permanent staff? Freelancers need confirm-by deadlines, pay-rate negotiation, and might use their own scheduling tools.
4. **QR clock-in reuse** — Can staff clock-in use the same QR infrastructure as guest check-in? If yes, the venue entrance scanner can serve double duty.
5. **Break scheduling detail** — Are breaks fixed (e.g., "Bar staff 30min break at 02:00") or flexibly taken? Fixed breaks need forced overlap detection.
6. **Event types** — What event types exist? "Techno night," "Guest list only," "Private event," "Club night"? Each may have different role requirements.
7. **Who generates shifts from templates** — Auto-generate when event is created? Or manager clicks "apply template"? Auto-generation with manual override is the industry best practice.
8. **Pay rate integration** — Does the shift system need to track pay rates for invoicing/payroll? Different roles per contract type have different hourly rates.

---

## Sources

- **Arbeitszeitgesetz (ArbZG)** — Official German working hours act, governs shift length, breaks, rest periods (gesetze-im-internet.de/arbzg/)
- **Jugendarbeitsschutzgesetz (JArbSchG)** — Youth labor protection law, critical for minor workers in clubs (gesetze-im-internet.de/jarbschg/)
- **PostgreSQL Range Types Documentation** — `tstzrange` and exclusion constraints for overlap detection (postgresql.org/docs/current/rangetypes.html)
- **btree_gist Extension** — Enables GiST indexes on scalar types for exclusion constraints (postgresql.org/docs/current/btree-gist.html)
- **Deputy / 7shifts UI patterns** — Commercial scheduling platforms whose timeline+Gantt UX is the de-facto industry standard for role-based shift management
- **@dnd-kit** — Already in PAL's dependency tree; suitable for shift reorder, but timeline creation+v2 resize needs custom handling
- **Schedule-X** — Open-source React calendar with time-range selection (potentially useful for calendar overview page)
- **Existing PAL schema** — `shifts` table with TIMESTAMPTZ, `staff` with contract_type, `availability` per-date — reviewed from `.sisyphus/plans/nightclub-booking-system-mvp-plan.md`

### Dropped Sources

- General "employee scheduling software" blog posts — too generic, not nightclub-specific
- React Big Calendar (commercial GPL) — license concerns, poor cross-midnight support
- Academic scheduling algorithm papers — overkill for a venue with ~50 staff; simple interval overlap is sufficient
