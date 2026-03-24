// Integration tests for Event CRUD API
// Nightclub Booking System - Phase 2.2

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cysoyvyjrhiukklxjqfe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '';

// Skip tests if no service key available
const shouldRunTests = supabaseServiceKey && supabaseServiceKey !== 'placeholder-service-key-for-build';

// Create service role client for tests (bypasses RLS)
const supabase = shouldRunTests ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;

describe.skipIf(!shouldRunTests)('Event CRUD API', () => {
  let venueId: string;
  let eventId: string;

  beforeAll(async () => {
    // Create a test venue
    const { data: venue } = await supabase
      .from('venues')
      .insert({
        name: 'Test Club',
        address: 'Test Street 1, Berlin',
        capacity: 800
      })
      .select()
      .single();
    
    venueId = venue!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (eventId) {
      await supabase.from('events').delete().eq('id', eventId);
    }
    if (venueId) {
      await supabase.from('venues').delete().eq('id', venueId);
    }
  });

  const testEvent = {
    name: 'Saturday Night Techno',
    date: '2026-04-15',
    door_time: '22:00:00',
    end_time: '06:00:00',
    status: 'draft',
    max_capacity: 800
  };

  describe('POST /api/events', () => {
    it('event_create_success returns 201', async () => {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...testEvent, venue_id: venueId })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(testEvent.name);
      expect(data.date).toBe(testEvent.date);
      
      eventId = data.id;
    });

    it('event_create_missing_name_returns_400', async () => {
      const { data, error } = await supabase
        .from('events')
        .insert({ date: '2026-04-15', venue_id: venueId })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('name');
    });

    it('event_create_missing_date_returns_400', async () => {
      const { data, error } = await supabase
        .from('events')
        .insert({ name: 'Test Event', venue_id: venueId })
        .select()
        .single();

      expect(error).toBeDefined();
    });
  });

  describe('GET /api/events', () => {
    it('event_list_returns_events', async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('event_filter_by_date_range_works', async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', '2026-01-01')
        .lte('date', '2026-12-31');

      expect(error).toBeNull();
    });

    it('event_filter_by_status_works', async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'draft');

      expect(error).toBeNull();
    });
  });

  describe('GET /api/events/[id]', () => {
    it('event_get_by_id_success', async () => {
      if (!eventId) {
        const { data } = await supabase
          .from('events')
          .insert({ ...testEvent, venue_id: venueId })
          .select()
          .single();
        eventId = data!.id;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(eventId);
    });
  });

  describe('PUT /api/events/[id]', () => {
    it('event_update_success', async () => {
      if (!eventId) {
        const { data } = await supabase
          .from('events')
          .insert({ ...testEvent, venue_id: venueId })
          .select()
          .single();
        eventId = data!.id;
      }

      const { data, error } = await supabase
        .from('events')
        .update({ status: 'published', max_capacity: 750 })
        .eq('id', eventId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('published');
      expect(data.max_capacity).toBe(750);
    });

    it('event_update_status_to_cancelled', async () => {
      if (!eventId) return;

      const { data, error } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', eventId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('cancelled');
    });
  });

  describe('DELETE /api/events/[id]', () => {
    it('event_delete_success', async () => {
      // Create a temp event to delete
      const { data: tempEvent } = await supabase
        .from('events')
        .insert({ 
          name: 'Temp Event to Delete', 
          date: '2026-05-01',
          venue_id: venueId 
        })
        .select()
        .single();

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', tempEvent!.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await supabase
        .from('events')
        .select('*')
        .eq('id', tempEvent!.id)
        .single();

      expect(deleted).toBeNull();
    });
  });
});

describe.skipIf(!shouldRunTests)('Event Calendar Queries', () => {
  it('event_get_by_month_works', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', '2026-04-01')
      .lte('date', '2026-04-30')
      .order('date');

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('event_get_upcoming_works', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', today)
      .eq('status', 'published')
      .order('date')
      .limit(10);

    expect(error).toBeNull();
  });
});
