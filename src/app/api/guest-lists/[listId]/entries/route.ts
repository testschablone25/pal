import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Promoter limits configuration
const PROMOTER_LIMITS = {
  presale: 50,
  guestlist: 100,
};

// GET /api/guest-lists/[listId]/entries - Get entries for a guest list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('guest_entries')
      .select('*')
      .eq('guest_list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching guest entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/guest-lists/[listId]/entries - Add guest to list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const supabase = await createClient();

    // Get current user for checking promoter limits
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guest_name, guest_email, guest_phone, category, plus_ones = 0, promoter_id } = body;

    if (!guest_name || !category) {
      return NextResponse.json(
        { error: 'guest_name and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!['presale', 'guestlist', 'walkin'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be presale, guestlist, or walkin' },
        { status: 400 }
      );
    }

    // Check promoter limits for presale and guestlist categories
    if (promoter_id && ['presale', 'guestlist'].includes(category)) {
      const limit = PROMOTER_LIMITS[category as 'presale' | 'guestlist'];
      
      const { count, error: countError } = await supabase
        .from('guest_entries')
        .select('*', { count: 'exact', head: true })
        .eq('guest_list_id', listId)
        .eq('category', category);

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }

      if (count !== null && count >= limit) {
        return NextResponse.json(
          { error: `Promoter limit reached for ${category}. Maximum ${limit} entries allowed.` },
          { status: 400 }
        );
      }
    }

    // Generate unique QR token
    const qr_token = uuidv4();
    const qr_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('guest_entries')
      .insert({
        guest_list_id: listId,
        guest_name,
        guest_email,
        guest_phone,
        category,
        plus_ones,
        qr_token,
        qr_token_expires_at,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error adding guest entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/guest-lists/[listId]/entries - Remove guest from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entry_id');

    if (!entryId) {
      return NextResponse.json(
        { error: 'entry_id is required' },
        { status: 400 }
      );
    }

    // Verify the entry belongs to this list
    const { data: entry, error: fetchError } = await supabase
      .from('guest_entries')
      .select('guest_list_id, status')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.guest_list_id !== listId) {
      return NextResponse.json({ error: 'Entry does not belong to this list' }, { status: 403 });
    }

    if (entry.status === 'checked_in') {
      return NextResponse.json(
        { error: 'Cannot delete already checked-in guest' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('guest_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting guest entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
