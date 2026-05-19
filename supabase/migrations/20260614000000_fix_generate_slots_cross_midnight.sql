-- Fix generate_event_time_slots to handle cross-midnight events
-- Using minute arithmetic with modulo 24h wrap instead of TIME comparison

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

	DELETE FROM time_slots WHERE event_id = p_event_id;

	v_current_min := v_door_min;

	WHILE v_current_min < v_end_min LOOP
		v_slot_end_min := v_current_min + p_duration_minutes;

		IF v_slot_end_min > v_end_min THEN
			v_slot_end_min := v_end_min;
		END IF;

		IF v_slot_end_min > v_current_min THEN
			RETURN QUERY INSERT INTO time_slots (event_id, label, start_time, end_time, slot_index, duration_minutes)
			VALUES (
				p_event_id,
				NULL,
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
