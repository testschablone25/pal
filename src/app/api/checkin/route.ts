import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/checkin - Check in a guest via QR token
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (staff checking in guests)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { qr_token } = body;

    if (!qr_token) {
      return NextResponse.json(
        { error: 'qr_token is required' },
        { status: 400 }
      );
    }

    // Find the guest entry by QR token
    const { data: entry, error: fetchError } = await supabase
      .from('guest_entries')
      .select(`
        *,
        guest_list:guest_lists(
          id,
          name,
          event:events(id, name, date, max_capacity)
        )
      `)
      .eq('qr_token', qr_token)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Invalid QR code. Guest not found.' },
        { status: 401 }
      );
    }

    // Check if QR token has expired
    if (new Date(entry.qr_token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'QR code has expired. Please contact staff.' },
        { status: 401 }
      );
    }

    // Handle already checked-in guest (duplicate scan)
    if (entry.status === 'checked_in') {
      return NextResponse.json(
        {
          error: 'Guest already checked in',
          entry: {
            id: entry.id,
            guest_name: entry.guest_name,
            category: entry.category,
            checked_in_at: entry.checked_in_at,
          }
        },
        { status: 409 }
      );
    }

    // Handle checked-out guest (re-entry)
    if (entry.status === 'checked_out') {
      // Allow re-entry - update status back to checked_in
      const { data, error } = await supabase
        .from('guest_entries')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString(),
          checked_out_at: null,
          checked_in_by: user.id,
        })
        .eq('id', entry.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        message: 'Guest re-entered successfully',
        data: {
          ...data,
          guest_list: entry.guest_list,
        }
      });
    }

    // Normal check-in
    const { data, error } = await supabase
      .from('guest_entries')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', entry.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Check-in successful',
      data: {
        ...data,
        guest_list: entry.guest_list,
      }
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
