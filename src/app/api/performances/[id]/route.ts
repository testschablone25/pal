// Performances CRUD API - Single Performance
// Phase 2.3 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/performances/[id] - Get single performance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('performances')
      .select(`
        *,
        artists:artist_id (
          id,
          name,
          city,
          genre,
          contact_email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Performance not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/performances/[id] - Update performance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      event_id,
      artist_id,
      start_time,
      end_time,
      stage,
      order_index
    } = body;

    // If updating times, check for overlap
    if (start_time || end_time) {
      // Get current performance to get event_id
      const { data: current } = await supabase
        .from('performances')
        .select('event_id')
        .eq('id', id)
        .single();

      if (current?.event_id) {
        const { data: existing } = await supabase
          .from('performances')
          .select('*')
          .eq('event_id', current.event_id)
          .neq('id', id);

        if (existing && existing.length > 0) {
          const newStart = start_time || '00:00:00';
          const newEnd = end_time || '23:59:59';
          
          const hasOverlap = existing.some((p: any) => {
            return newStart < p.end_time && newEnd > p.start_time;
          });

          if (hasOverlap) {
            return NextResponse.json(
              { error: 'Time overlap detected with existing performance' },
              { status: 409 }
            );
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('performances')
      .update({
        event_id,
        artist_id,
        start_time,
        end_time,
        stage,
        order_index
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/performances/[id] - Delete performance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('performances')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}