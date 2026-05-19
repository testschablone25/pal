-- RLS Policies for Tables Missing Write Access
-- After switching API routes from service-role to anon-key user-authenticated clients,
-- these policies ensure admin/manager and relevant roles can still write data.

-- ============================================================
-- VENUES
-- ============================================================
CREATE POLICY "Venue managers can manage venues" ON venues
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
	);

-- ============================================================
-- ARTISTS
-- ============================================================
CREATE POLICY "Booking can manage artists" ON artists
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	);

-- ============================================================
-- PERFORMANCES
-- ============================================================
CREATE POLICY "Booking can manage performances" ON performances
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'booking'))
	);

-- ============================================================
-- GUEST LISTS
-- ============================================================
CREATE POLICY "Guest list managers can manage guest lists" ON guest_lists
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
			AND role IN ('admin', 'manager', 'booking', 'social-media'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
			AND role IN ('admin', 'manager', 'booking', 'social-media'))
	);

-- ============================================================
-- STAFF
-- ============================================================
CREATE POLICY "Staff managers can manage staff" ON staff
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE POLICY "Shift managers can manage shifts" ON shifts
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	);

-- ============================================================
-- All staff can clock in/out their own shifts
-- ============================================================
CREATE POLICY "Staff can update own shifts" ON shifts
	FOR UPDATE USING (
		staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
	)
	WITH CHECK (
		staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
	);

-- ============================================================
-- TASK COMMENTS — allow update/delete by author or admin
-- ============================================================
CREATE POLICY "Users can update own comments" ON task_comments
	FOR UPDATE USING (author_id = auth.uid())
	WITH CHECK (author_id = auth.uid());
CREATE POLICY "Admins can manage comments" ON task_comments
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
	);

-- ============================================================
-- CONTACTS (table created in separate migration, add write policy)
-- SELECT policy already exists in the original migration
-- ============================================================
CREATE POLICY "Contacts managers can manage contacts" ON contacts
	FOR ALL USING (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	)
	WITH CHECK (
		EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'backoffice'))
	);
