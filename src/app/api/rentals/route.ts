import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const itemId = searchParams.get('item_id');

    let query = supabase
      .from('rentals')
      .select(`
        *,
        items (*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rentals: data || [],
    });
  } catch (error) {
    console.error('Error fetching rentals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      item_id,
      rented_to,
      contact_person,
      contact_phone,
      contact_email,
      rental_date,
      expected_return,
      notes,
      created_by,
    } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    if (!rented_to) {
      return NextResponse.json(
        { error: 'Rented to is required' },
        { status: 400 }
      );
    }

    if (!rental_date) {
      return NextResponse.json(
        { error: 'Rental date is required' },
        { status: 400 }
      );
    }

    if (!expected_return) {
      return NextResponse.json(
        { error: 'Expected return is required' },
        { status: 400 }
      );
    }

    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        item_id,
        rented_to,
        contact_person,
        contact_phone,
        contact_email,
        rental_date,
        expected_return,
        notes,
        created_by,
      })
      .select()
      .single();

    if (rentalError) {
      return NextResponse.json(
        { error: rentalError.message },
        { status: 400 }
      );
    }

    const locationLabel = `Rented to: ${rented_to}`;

    const { error: historyError } = await supabase
      .from('item_location_history')
      .insert({
        item_id,
        location: locationLabel,
        action: 'rental_out',
        moved_by: created_by,
      });

    if (historyError) {
      console.error('Error logging rental location history:', historyError);
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({ current_location: locationLabel })
      .eq('id', item_id);

    if (updateError) {
      console.error('Error updating item location:', updateError);
    }

    return NextResponse.json(rental, { status: 201 });
  } catch (error) {
    console.error('Error creating rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
