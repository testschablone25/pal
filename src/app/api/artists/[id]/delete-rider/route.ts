/**
 * API endpoint to delete/archive artist rider data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// DELETE /api/artists/[id]/delete-rider - Clear rider data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current rider data to archive
    const { data: artist } = await supabase
      .from('artists')
      .select('tech_rider, hospitality_rider, documents')
      .eq('id', id)
      .single();

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // Archive current rider data in documents
    const documents = Array.isArray(artist.documents) ? artist.documents : [];
    const archiveDate = new Date().toISOString().split('T')[0];
    
    // Only archive if there's actual rider data
    if (artist.tech_rider || artist.hospitality_rider) {
      documents.push({
        name: `Rider Archive - ${archiveDate}`,
        type: 'archived_rider',
        archived_at: new Date().toISOString(),
        tech_rider: artist.tech_rider,
        hospitality_rider: artist.hospitality_rider,
      });
    }

    // Clear rider fields
    const { error } = await supabase
      .from('artists')
      .update({
        tech_rider: {},
        hospitality_rider: {},
        documents,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete rider' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rider deleted and archived',
    });
  } catch (error) {
    console.error('Delete rider error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
