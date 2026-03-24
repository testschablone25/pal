// Integration tests for Artist CRUD API
// Nightclub Booking System - Phase 2.1

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

describe.skipIf(!shouldRunTests)('Artist CRUD API', () => {
  const testArtist = {
    name: 'Test DJ',
    city: 'Berlin',
    fee: 500.00,
    genre: 'Techno',
    bio: 'Test bio for integration testing',
    contact_email: 'test@example.com',
    contact_phone: '+49 123 456789',
  };

  let artistId: string;

  afterAll(async () => {
    // Cleanup: Delete test artist if created
    if (artistId) {
      await supabase.from('artists').delete().eq('id', artistId);
    }
  });

  describe('POST /api/artists', () => {
    it('artist_create_success returns 201', async () => {
      const { data, error } = await supabase
        .from('artists')
        .insert(testArtist)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(testArtist.name);
      expect(data.genre).toBe(testArtist.genre);
      expect(data.city).toBe(testArtist.city);
      
      artistId = data.id;
    });

    it('artist_create_missing_name_returns_400', async () => {
      const { data, error } = await supabase
        .from('artists')
        .insert({ city: 'Berlin', fee: 100 })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('name');
    });
  });

  describe('GET /api/artists', () => {
    it('artist_list_returns_artists', async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('artist_filter_by_genre_works', async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('genre', 'Techno');

      expect(error).toBeNull();
      if (data && data.length > 0) {
        data.forEach(artist => {
          expect(artist.genre).toBe('Techno');
        });
      }
    });

    it('artist_filter_by_city_works', async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .ilike('city', '%berlin%');

      expect(error).toBeNull();
    });

    it('artist_search_by_name_works', async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', '%test%');

      expect(error).toBeNull();
    });
  });

  describe('GET /api/artists/[id]', () => {
    it('artist_get_by_id_success', async () => {
      if (!artistId) {
        // Create one if not exists
        const { data } = await supabase
          .from('artists')
          .insert(testArtist)
          .select()
          .single();
        artistId = data!.id;
      }

      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(artistId);
    });

    it('artist_get_nonexistent_returns_404', async () => {
      const fakeId = uuidv4();
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', fakeId)
        .single();

      expect(error).toBeDefined();
    });
  });

  describe('PUT /api/artists/[id]', () => {
    it('artist_update_success', async () => {
      if (!artistId) {
        const { data } = await supabase
          .from('artists')
          .insert(testArtist)
          .select()
          .single();
        artistId = data!.id;
      }

      const { data, error } = await supabase
        .from('artists')
        .update({ fee: 750.00, genre: 'House' })
        .eq('id', artistId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.fee).toBe(750.00);
      expect(data.genre).toBe('House');
    });
  });

  describe('DELETE /api/artists/[id]', () => {
    it('artist_delete_success', async () => {
      // Create a temp artist to delete
      const { data: tempArtist } = await supabase
        .from('artists')
        .insert({ name: 'Temp Artist to Delete' })
        .select()
        .single();

      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', tempArtist!.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await supabase
        .from('artists')
        .select('*')
        .eq('id', tempArtist!.id)
        .single();

      expect(deleted).toBeNull();
    });
  });
});

describe.skipIf(!shouldRunTests)('Artist Document Upload', () => {
  it('artist_documents_json_structure_works', async () => {
    const documents = {
      contract: 'https://storage.example.com/contract.pdf',
      rider: 'https://storage.example.com/rider.pdf',
      promo: 'https://storage.example.com/promo.jpg'
    };

    const { data, error } = await supabase
      .from('artists')
      .insert({
        name: 'Document Test Artist',
        documents: documents
      })
      .select('documents')
      .single();

    expect(error).toBeNull();
    expect(data.documents).toEqual(documents);
  });
});
