// Availability CRUD API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/availability - List availability with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staff_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const available = searchParams.get('available');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('availability')
      .select(`
        *,
        staff:staff_id (
          id,
          role,
          profiles:profile_id (
            id,
            full_name
          )
        )
      `, { count: 'exact' })
      .order('date', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }
    if (available !== null && available !== undefined && available !== '') {
      query = query.eq('available', available === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      availability: data,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/availability - Create or update availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      staff_id,
      date,
      available,
      reason
    } = body;

    // Validate required fields
    if (!staff_id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    if (available === undefined || available === null) {
      return NextResponse.json(
        { error: 'Available status is required' },
        { status: 400 }
      );
    }

    // Upsert: insert or update if exists
    const { data, error } = await supabase
      .from('availability')
      .upsert({
        staff_id,
        date,
        available,
        reason: available ? null : reason
      }, {
        onConflict: 'staff_id,date'
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
    console.error('Error creating/updating availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
