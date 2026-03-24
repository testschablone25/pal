import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/occupancy/[eventId] - Get current occupancy for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, date, max_capacity, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all guest lists for this event
    const { data: guestLists, error: listsError } = await supabase
      .from('guest_lists')
      .select('id')
      .eq('event_id', eventId);

    if (listsError) {
      return NextResponse.json({ error: listsError.message }, { status: 400 });
    }

    const listIds = guestLists.map(l => l.id);

    if (listIds.length === 0) {
      return NextResponse.json({
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          max_capacity: event.max_capacity,
        },
        current: 0,
        max: event.max_capacity || 0,
        percentage: 0,
        by_category: {
          presale: 0,
          guestlist: 0,
          walkin: 0,
        },
        total_entries: 0,
      });
    }

    // Get checked-in count by category
    const { data: entries, error: entriesError } = await supabase
      .from('guest_entries')
      .select('category, plus_ones, status')
      .in('guest_list_id', listIds);

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 400 });
    }

    // Calculate counts
    const byCategory: Record<string, number> = {
      presale: 0,
      guestlist: 0,
      walkin: 0,
    };

    let totalEntries = 0;

    entries.forEach(entry => {
      if (entry.status === 'checked_in') {
        const count = (entry.plus_ones || 0) + 1;
        byCategory[entry.category] = (byCategory[entry.category] || 0) + count;
        totalEntries += count;
      }
    });

    const current = totalEntries;
    const max = event.max_capacity || 800; // Default to 800 for Techno Nightclub
    const percentage = Math.round((current / max) * 100);

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        max_capacity: max,
        status: event.status,
      },
      current,
      max,
      percentage: Math.min(percentage, 100),
      by_category: byCategory,
      total_entries: totalEntries,
      // Door stats for tonight
      door_stats: {
        entries_tonight: current,
        by_category: byCategory,
        average_per_hour: current, // Can be calculated with time-based queries
      }
    });
  } catch (error) {
    console.error('Error fetching occupancy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
