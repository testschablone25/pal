import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const returnLocation = body.return_location || 'Main Storage';
    const { returned_by } = body;

    if (!returned_by) {
      return NextResponse.json(
        { error: 'Returned by is required' },
        { status: 400 }
      );
    }

    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*, items (*)')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Rental not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: updatedRental, error: updateError } = await supabase
      .from('rentals')
      .update({
        status: 'returned',
        actual_return: today,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    const { error: historyError } = await supabase
      .from('item_location_history')
      .insert({
        item_id: rental.item_id,
        location: returnLocation,
        action: 'rental_return',
        moved_by: returned_by,
      });

    if (historyError) {
      console.error('Error logging return location history:', historyError);
    }

    const { error: itemUpdateError } = await supabase
      .from('items')
      .update({ current_location: returnLocation })
      .eq('id', rental.item_id);

    if (itemUpdateError) {
      console.error('Error updating item location on return:', itemUpdateError);
    }

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error processing rental return:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
