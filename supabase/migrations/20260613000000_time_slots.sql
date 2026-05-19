-- Time Slots for Running Order
-- Separates the time grid (timeslots) from artists (performances).
-- Each event can have customizable timeslots derived from door_time → end_time.
-- Performances then fill these slots instead of carrying their own start/end times.

-- ============================
-- TIME SLOTS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS time_slots (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	label TEXT,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	slot_index INT NOT NULL DEFAULT 0,
	duration_minutes INT NOT NULL DEFAULT 60,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_slots_event_id ON time_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_index ON time_slots(event_id, slot_index);

-- ============================
-- LINK PERFORMANCES TO SLOTS
-- ============================
ALTER TABLE performances ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_performances_time_slot_id ON performances(time_slot_id);

-- ============================
-- FUNCTION: AUTO-GENERATE SLOTS
-- ============================
CREATE OR REPLACE FUNCTION generate_event_time_slots(
	p_event_id UUID,
	p_duration_minutes INT DEFAULT 60
)
RETURNS SETOF time_slots
LANGUAGE plpgsql
AS $$
DECLARE
	v_door_time TIME;
	v_end_time TIME;
	v_door_min INT;
	v_end_min INT;
	v_current_min INT;
	v_slot_end_min INT;
	v_slot_index INT := 0;
BEGIN
	-- Get event times
	SELECT door_time, end_time INTO v_door_time, v_end_time
	FROM events WHERE id = p_event_id;

	IF v_door_time IS NULL OR v_end_time IS NULL THEN
		RAISE EXCEPTION 'Event must have door_time and end_time set';
	END IF;

	-- Convert to minutes since midnight
	v_door_min := EXTRACT(HOUR FROM v_door_time) * 60 + EXTRACT(MINUTE FROM v_door_time);
	v_end_min := EXTRACT(HOUR FROM v_end_time) * 60 + EXTRACT(MINUTE FROM v_end_time);

	-- Handle cross-midnight: if end_time <= door_time, treat end as next day
	IF v_end_min <= v_door_min THEN
		v_end_min := v_end_min + 1440;
	END IF;

	-- Delete existing slots (cascading preserves performances with SET NULL)
	DELETE FROM time_slots WHERE event_id = p_event_id;

	v_current_min := v_door_min;

	WHILE v_current_min < v_end_min LOOP
		v_slot_end_min := v_current_min + p_duration_minutes;

		-- Cap at event end time
		IF v_slot_end_min > v_end_min THEN
			v_slot_end_min := v_end_min;
		END IF;

		-- Skip zero-duration slots
		IF v_slot_end_min > v_current_min THEN
			RETURN QUERY INSERT INTO time_slots (event_id, label, start_time, end_time, slot_index, duration_minutes)
			VALUES (
				p_event_id,
				NULL,
				-- Use modulo 24h to produce valid TIME values (
				MAKE_TIME(
					(v_current_min / 60) % 24,
					v_current_min % 60,
					0
				),
				MAKE_TIME(
					(v_slot_end_min / 60) % 24,
					v_slot_end_min % 60,
					0
				),
				v_slot_index,
				v_slot_end_min - v_current_min
			)
			RETURNING *;
		END IF;

		v_current_min := v_slot_end_min;
		v_slot_index := v_slot_index + 1;
	END LOOP;

	RETURN;
END;
$$;

-- ============================
-- FUNCTION: MERGE EXISTING PERFORMANCES INTO NEAREST SLOTS
-- ============================
CREATE OR REPLACE FUNCTION merge_performances_into_slots(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
	v_perf RECORD;
	v_nearest_slot UUID;
BEGIN
	FOR v_perf IN
		SELECT p.id, p.start_time
		FROM performances p
		WHERE p.event_id = p_event_id AND p.time_slot_id IS NULL
		ORDER BY p.start_time ASC
	LOOP
		-- Find the nearest slot by start_time proximity
		SELECT ts.id INTO v_nearest_slot
		FROM time_slots ts
		WHERE ts.event_id = p_event_id
		ORDER BY ABS(
			EXTRACT(EPOCH FROM (ts.start_time - v_perf.start_time))
		) ASC
		LIMIT 1;

		-- Only assign if the slot isn't already taken
		IF v_nearest_slot IS NOT NULL AND NOT EXISTS (
			SELECT 1 FROM performances
			WHERE time_slot_id = v_nearest_slot AND id != v_perf.id
		) THEN
			UPDATE performances
			SET time_slot_id = v_nearest_slot,
				start_time = (SELECT start_time FROM time_slots WHERE id = v_nearest_slot),
				end_time = (SELECT end_time FROM time_slots WHERE id = v_nearest_slot)
			WHERE id = v_perf.id;
		END IF;
	END LOOP;
END;
$$;

-- ============================
-- RLS
-- ============================
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view time slots
CREATE POLICY "Anyone can view time slots" ON time_slots
	FOR SELECT USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
	);

-- Admin, manager, booking can manage time slots
CREATE POLICY "Booking can manage time slots" ON time_slots
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	);
