// Artist CRUD API
// Phase 2.1 - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/artists - List all artists with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const genre = searchParams.get('genre');
    const city = searchParams.get('city');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('artists')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (genre) {
      query = query.eq('genre', genre);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      artists: data,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/artists - Create a new artist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      city,
      fee,
      genre,
      bio,
      contact_email,
      contact_phone,
      promo_pack_url,
      documents
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('artists')
      .insert({
        name,
        city,
        fee,
        genre,
        bio,
        contact_email,
        contact_phone,
        promo_pack_url,
        documents: documents || {}
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
    console.error('Error creating artist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
