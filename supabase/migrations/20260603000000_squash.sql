-- PAL Nightclub Booking System — Squashed Schema
-- Generated 2026-06-03 from 13 migrations + 3 archived
-- Single file representing the current state of all tables, enums, RLS, and indexes.
--
-- NOTE: This is for fresh installations only. Existing databases should
-- apply individual migrations to avoid data loss.

-- ============================
-- EXTENSIONS
-- ============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- ENUMS
-- ============================

CREATE TYPE guest_category AS ENUM ('presale', 'guestlist', 'walkin');

CREATE TYPE contract_type AS ENUM ('permanent', 'freelance', 'minor');

CREATE TYPE app_role AS ENUM (
	'admin',
	'manager',
	'booking',
	'social-media',
	'night-management',
	'label',
	'staff',
	'tech',
	'tech-lead',
	'gastro',
	'backoffice',
	'awareness',
	'azubi'
);

-- ============================
-- FUNCTIONS & TRIGGERS
-- ============================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- PROFILES & AUTH
-- ============================

CREATE TABLE IF NOT EXISTS profiles (
	id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	email TEXT UNIQUE NOT NULL,
	full_name TEXT,
	phone TEXT,
	avatar_url TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
	role app_role NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- ============================
-- VENUES
-- ============================

CREATE TABLE IF NOT EXISTS venues (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	address TEXT,
	capacity INT NOT NULL,
	venue_type TEXT CHECK (venue_type IN ('venue', 'storage', 'office', 'mixed')),
	notes TEXT,
	contact_name TEXT,
	contact_phone TEXT,
	contact_email TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venue_sub_locations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	description TEXT,
	capacity INT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_venue_sub_locations_venue_id ON venue_sub_locations(venue_id);

-- ============================
-- EVENTS
-- ============================

CREATE TABLE IF NOT EXISTS events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id UUID REFERENCES venues(id),
	name TEXT NOT NULL,
	date DATE NOT NULL,
	door_time TIME,
	end_time TIME,
	status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
	max_capacity INT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- ============================
-- ARTISTS & PERFORMANCES
-- ============================

CREATE TABLE IF NOT EXISTS artists (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	city TEXT,
	fee DECIMAL(10,2),
	genre TEXT,
	bio TEXT,
	contact_email TEXT,
	contact_phone TEXT,
	promo_pack_url TEXT,
	documents JSONB DEFAULT '{}',
	tech_rider JSONB DEFAULT '{}',
	hospitality_rider JSONB DEFAULT '{}',
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artists_tech_rider ON artists USING gin(tech_rider);
CREATE INDEX IF NOT EXISTS idx_artists_hospitality_rider ON artists USING gin(hospitality_rider);

CREATE TABLE IF NOT EXISTS performances (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id UUID REFERENCES events(id) ON DELETE CASCADE,
	artist_id UUID REFERENCES artists(id),
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	stage TEXT DEFAULT 'main',
	order_index INT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performances_event_id ON performances(event_id);
CREATE INDEX IF NOT EXISTS idx_performances_artist_id ON performances(artist_id);

-- ============================
-- TIME SLOTS (separated from artists for customizable running order)
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

-- Add time_slot_id to performances
ALTER TABLE performances ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_performances_time_slot_id ON performances(time_slot_id);

-- ============================
-- GUEST LIST
-- ============================

CREATE TABLE IF NOT EXISTS guest_lists (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id UUID REFERENCES events(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	created_by UUID REFERENCES profiles(id),
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_lists_event_id ON guest_lists(event_id);

CREATE TABLE IF NOT EXISTS guest_entries (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	guest_list_id UUID REFERENCES guest_lists(id) ON DELETE CASCADE,
	guest_name TEXT NOT NULL,
	guest_email TEXT,
	guest_phone TEXT,
	category guest_category NOT NULL,
	plus_ones INT DEFAULT 0,
	qr_token UUID DEFAULT gen_random_uuid(),
	qr_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
	status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'checked_out', 'cancelled')),
	checked_in_at TIMESTAMPTZ,
	checked_out_at TIMESTAMPTZ,
	checked_in_by UUID REFERENCES profiles(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(qr_token)
);

CREATE INDEX IF NOT EXISTS idx_guest_entries_list_id ON guest_entries(guest_list_id);
CREATE INDEX IF NOT EXISTS idx_guest_entries_qr_token ON guest_entries(qr_token);
CREATE INDEX IF NOT EXISTS idx_guest_entries_status ON guest_entries(status);

-- ============================
-- STAFF & SHIFTS
-- ============================

CREATE TABLE IF NOT EXISTS staff (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	profile_id UUID REFERENCES profiles(id),
	role TEXT NOT NULL,
	contract_type contract_type NOT NULL,
	is_minor BOOLEAN DEFAULT FALSE,
	hourly_rate DECIMAL(10,2),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON staff(profile_id);

CREATE TABLE IF NOT EXISTS shifts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id UUID REFERENCES events(id) ON DELETE CASCADE,
	staff_id UUID REFERENCES staff(id),
	role TEXT NOT NULL,
	start_time TIMESTAMPTZ NOT NULL,
	end_time TIMESTAMPTZ NOT NULL,
	break_minutes INT DEFAULT 0,
	status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_event_id ON shifts(event_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);

CREATE TABLE IF NOT EXISTS availability (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
	date DATE NOT NULL,
	available BOOLEAN NOT NULL,
	reason TEXT,
	set_by UUID REFERENCES staff(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_availability_staff_id ON availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);

-- ============================
-- TASKS & WORKFLOW
-- ============================

CREATE TABLE IF NOT EXISTS tasks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title TEXT NOT NULL,
	description TEXT,
	status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'pending_approval', 'done', 'cancelled')),
	priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
	assignee_id UUID REFERENCES profiles(id),
	event_id UUID REFERENCES events(id) ON DELETE CASCADE,
	venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
	created_by UUID REFERENCES profiles(id),
	due_date DATE,
	scheduled_date DATE,
	needs_approval BOOLEAN DEFAULT FALSE,
	blocked BOOLEAN DEFAULT FALSE,
	blocked_reason TEXT,
	parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
	task_type TEXT CHECK (task_type IN (
		'setup', 'teardown', 'repair', 'maintenance', 'logistics',
		'procurement', 'tech_check', 'crew', 'booking', 'cleanup',
		'safety', 'inventory', 'catering', 'transportation', 'documentation'
	)),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_venue_id ON tasks(venue_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

CREATE TABLE IF NOT EXISTS task_comments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
	author_id UUID REFERENCES profiles(id),
	content TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS task_history (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	changed_by UUID NOT NULL REFERENCES profiles(id),
	from_status TEXT,
	to_status TEXT,
	change_type TEXT NOT NULL CHECK (change_type IN (
		'created', 'status_change', 'blocked', 'unblocked',
		'approved', 'rejected', 'edited'
	)),
	reason TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_change_type ON task_history(change_type);

-- ============================
-- INVENTORY & ITEMS
-- ============================

CREATE TABLE IF NOT EXISTS items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	category TEXT NOT NULL CHECK (category IN ('dj_audio', 'lighting', 'pa_sound', 'infrastructure', 'venue_misc')),
	serial_number TEXT UNIQUE,
	brand TEXT,
	model TEXT,
	condition_enum TEXT CHECK (condition_enum IN ('new', 'good', 'fair', 'poor', 'broken')),
	condition_notes TEXT,
	current_location TEXT,
	sub_location_id UUID REFERENCES venue_sub_locations(id) ON DELETE SET NULL,
	notes TEXT,
	photo_url TEXT,
	qr_token TEXT UNIQUE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_serial ON items(serial_number);
CREATE INDEX IF NOT EXISTS idx_items_qr_token ON items(qr_token);
CREATE INDEX IF NOT EXISTS idx_items_sub_location_id ON items(sub_location_id);

CREATE TABLE IF NOT EXISTS item_location_history (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
	location TEXT NOT NULL,
	action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out', 'transfer', 'rental_out', 'rental_return')),
	moved_by UUID NOT NULL REFERENCES profiles(id),
	timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_loc_history_item ON item_location_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_loc_history_moved_by ON item_location_history(moved_by);

CREATE TABLE IF NOT EXISTS rentals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
	rented_to TEXT NOT NULL,
	contact_person TEXT,
	contact_phone TEXT,
	contact_email TEXT,
	rental_date DATE NOT NULL,
	expected_return DATE NOT NULL,
	actual_return DATE,
	notes TEXT,
	status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
	created_by UUID REFERENCES profiles(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rentals_item ON rentals(item_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_rented_to ON rentals(rented_to);

CREATE TABLE IF NOT EXISTS task_items (
	task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	item_id UUID NOT NULL REFERENCES items(id),
	goal_sub_location_id UUID REFERENCES venue_sub_locations(id) ON DELETE SET NULL,
	delivered_at TIMESTAMPTZ,
	PRIMARY KEY (task_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_task_items_goal_sub_location ON task_items(goal_sub_location_id);

-- ============================
-- UPDATED AT TRIGGERS
-- ============================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================
-- TIME SLOT HELPER FUNCTIONS
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
	SELECT door_time, end_time INTO v_door_time, v_end_time
	FROM events WHERE id = p_event_id;

	IF v_door_time IS NULL OR v_end_time IS NULL THEN
		RAISE EXCEPTION 'Event must have door_time and end_time set';
	END IF;

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
		SELECT ts.id INTO v_nearest_slot
		FROM time_slots ts
		WHERE ts.event_id = p_event_id
		ORDER BY ABS(
			EXTRACT(EPOCH FROM (ts.start_time - v_perf.start_time))
		) ASC
		LIMIT 1;

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
-- ROW LEVEL SECURITY
-- ============================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sub_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- ============================
-- RLS POLICIES
-- ============================

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
	FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
	FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access on profiles" ON profiles
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
	);

-- User Roles
CREATE POLICY "Users can view own roles" ON user_roles
	FOR SELECT USING (user_id = auth.uid());

-- Venues
CREATE POLICY "Anyone can view venues" ON venues
	FOR SELECT USING (true);

-- Venue Sub-Locations
CREATE POLICY "Anyone can view venue sub-locations" ON venue_sub_locations
	FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage sub-locations" ON venue_sub_locations
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
	);

-- Events
CREATE POLICY "Anyone can view published events" ON events
	FOR SELECT USING (status = 'published' OR status = 'draft');
CREATE POLICY "Event managers can manage events" ON events
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
			AND role IN ('admin', 'manager', 'backoffice', 'booking', 'social-media', 'night-management'))
	);
CREATE POLICY "Staff can view events" ON events
	FOR SELECT USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
	);

-- Artists
CREATE POLICY "Anyone can view artists" ON artists
	FOR SELECT USING (true);

-- Performances
CREATE POLICY "Anyone can view performances" ON performances
	FOR SELECT USING (true);

-- Time Slots
CREATE POLICY "Anyone can view time slots" ON time_slots
	FOR SELECT USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
	);
CREATE POLICY "Booking can manage time slots" ON time_slots
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	);

-- Guest Entries
CREATE POLICY "Door staff can manage guest entries" ON guest_entries
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
			AND role IN ('admin', 'manager', 'night-management', 'awareness', 'staff'))
	);

-- Staff
CREATE POLICY "Users can view staff" ON staff
	FOR SELECT USING (true);

-- Shifts
CREATE POLICY "Users can view shifts" ON shifts
	FOR SELECT USING (true);

-- Availability
CREATE POLICY "Staff can manage own availability" ON availability
	FOR ALL
	USING (
		staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
		OR EXISTS (SELECT 1 FROM staff WHERE profile_id = auth.uid() AND role IN ('manager', 'backoffice'))
	)
	WITH CHECK (
		staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
		OR EXISTS (SELECT 1 FROM staff WHERE profile_id = auth.uid() AND role IN ('manager', 'backoffice'))
	);

-- Tasks
CREATE POLICY "Anyone can view tasks" ON tasks
	FOR SELECT USING (true);
CREATE POLICY "Anyone can create tasks" ON tasks
	FOR INSERT WITH CHECK (true);
CREATE POLICY "Assignee can update tasks" ON tasks
	FOR UPDATE USING (
		assignee_id = auth.uid()
		OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	);

-- Task Comments
CREATE POLICY "Anyone can view task comments" ON task_comments
	FOR SELECT USING (true);
CREATE POLICY "Anyone can add task comments" ON task_comments
	FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Task History
CREATE POLICY "Anyone can view task history" ON task_history
	FOR SELECT USING (true);
CREATE POLICY "System can insert task history" ON task_history
	FOR INSERT WITH CHECK (true);

-- Items
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update items" ON items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete items" ON items FOR DELETE USING (true);

-- Item Location History
CREATE POLICY "Anyone can view location history" ON item_location_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert location history" ON item_location_history FOR INSERT WITH CHECK (true);

-- Rentals
CREATE POLICY "Anyone can view rentals" ON rentals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rentals" ON rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rentals" ON rentals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rentals" ON rentals FOR DELETE USING (true);

-- Task Items
CREATE POLICY "Anyone can view task items" ON task_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task items" ON task_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete task items" ON task_items FOR DELETE USING (true);
