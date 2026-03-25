// Staff CRUD API
// Phase 3 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/staff - List all staff with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const contractType = searchParams.get('contract_type');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('staff')
      .select(`
        *,
        profiles:profile_id (
          id,
          full_name,
          email,
          phone
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (name) {
      query = query.ilike('profiles.full_name', `%${name}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (contractType) {
      query = query.eq('contract_type', contractType);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      staff: data,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      profile_id,
      role,
      contract_type,
      is_minor,
      hourly_rate
    } = body;

    // Validate required fields
    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    if (!contract_type) {
      return NextResponse.json(
        { error: 'Contract type is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('staff')
      .insert({
        profile_id,
        role,
        contract_type,
        is_minor: is_minor || false,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null
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
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
