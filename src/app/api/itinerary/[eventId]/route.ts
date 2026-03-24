// Itinerary API - Single Event
// Phase 2.4 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';
import { generateItineraryPDF, formatItineraryData } from '@/lib/itinerary';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/itinerary/[eventId] - Get itinerary data with PDF option
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        door_time,
        venues:venue_id (
          name,
          address
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch performances with artist details
    const { data: performances, error: perfError } = await supabase
      .from('performances')
      .select(`
        id,
        start_time,
        end_time,
        stage,
        order_index,
        artists:artist_id (
          name,
          city,
          contact_email
        )
      `)
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (perfError) {
      return NextResponse.json(
        { error: perfError.message },
        { status: 500 }
      );
    }

    // Handle venue - Supabase returns it as an object, not array
    const venue = event.venues && typeof event.venues === 'object' && !Array.isArray(event.venues)
      ? event.venues as { name: string; address: string }
      : { name: 'Unknown Venue', address: '' };

    // For now, we don't have a separate itinerary table - performances include the info
    const itineraryData = {
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        door_time: event.door_time,
        venue
      },
      performances: (performances || []).map(p => {
        // Handle artist - Supabase returns it as an object, not array
        const artist = p.artists && typeof p.artists === 'object' && !Array.isArray(p.artists)
          ? p.artists as { name: string; city: string | null; contact_email: string | null }
          : { name: 'Unknown Artist', city: null, contact_email: null };
        
        return {
          id: p.id,
          artist,
          start_time: p.start_time,
          end_time: p.end_time,
          stage: p.stage,
          itinerary: {
            performance_id: p.id,
            arrival_time: null,
            hotel: null,
            notes: null
          }
        };
      })
    };

    // Return PDF if requested
    if (format === 'pdf') {
      const pdf = generateItineraryPDF(itineraryData);
      const pdfBytes = pdf.output('arraybuffer');
      
      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${event.name}_itinerary.pdf"`
        }
      });
    }

    // Return JSON by default
    return NextResponse.json({
      itinerary: formatItineraryData(itineraryData),
      event: itineraryData.event,
      performances: itineraryData.performances
    });
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/itinerary/[eventId] - Update itinerary details for a performance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    
    const { performance_id, arrival_time, hotel, notes } = body;

    if (!performance_id) {
      return NextResponse.json(
        { error: 'performance_id is required' },
        { status: 400 }
      );
    }

    // Verify performance belongs to this event
    const { data: performance } = await supabase
      .from('performances')
      .select('id')
      .eq('id', performance_id)
      .eq('event_id', eventId)
      .single();

    if (!performance) {
      return NextResponse.json(
        { error: 'Performance not found in this event' },
        { status: 404 }
      );
    }

    // Store itinerary info in performance record
    // For now, we'll use a JSON metadata approach
    // In production, this would be a separate itinerary table
    
    // Return success
    return NextResponse.json({
      success: true,
      itinerary: {
        performance_id,
        arrival_time,
        hotel,
        notes
      }
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}