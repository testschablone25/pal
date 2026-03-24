// Performances CRUD API
// Phase 2.3 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/performances - List performances with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('event_id');
    const artistId = searchParams.get('artist_id');

    let query = supabase
      .from('performances')
      .select(`
        *,
        artists:artist_id (
          id,
          name,
          city,
          genre,
          fee,
          contact_email
        )
      `)
      .order('order_index', { ascending: true })
      .order('start_time', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (artistId) {
      query = query.eq('artist_id', artistId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ performances: data });
  } catch (error) {
    console.error('Error fetching performances:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/performances - Create a new performance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      event_id,
      artist_id,
      start_time,
      end_time,
      stage,
      order_index
    } = body;

    // Validate required fields
    if (!event_id || !artist_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'event_id, artist_id, start_time, and end_time are required' },
        { status: 400 }
      );
    }

    // Check for time overlap with existing performances for this event
    const { data: existingPerformances } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', event_id);

    if (existingPerformances && existingPerformances.length > 0) {
      const hasOverlap = existingPerformances.some((p: any) => {
        const existingStart = p.start_time;
        const existingEnd = p.end_time;
        // Simple overlap check (assumes times are in HH:MM:SS format)
        return start_time < existingEnd && end_time > existingStart;
      });

      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Time overlap detected with existing performance' },
          { status: 409 }
        );
      }
    }

    // Get max order_index for this event
    let nextOrderIndex = 0;
    if (existingPerformances && existingPerformances.length > 0) {
      const maxOrder = Math.max(...existingPerformances.map((p: any) => p.order_index || 0));
      nextOrderIndex = maxOrder + 1;
    }

    const { data, error } = await supabase
      .from('performances')
      .insert({
        event_id,
        artist_id,
        start_time,
        end_time,
        stage: stage || 'main',
        order_index: order_index ?? nextOrderIndex
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
