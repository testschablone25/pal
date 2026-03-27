import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { generateRiderTasksForArtist } from '@/lib/riders/task-generation';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// POST /api/artists/generate-tasks
export async function POST(request: NextRequest) {
  try {
    const { artist_id, event_id } = await request.json();

    if (!artist_id) {
      return NextResponse.json(
        { error: 'Missing artist_id' },
        { status: 400 }
      );
    }

    const result = await generateRiderTasksForArtist(
      supabase,
      artist_id as string,
      typeof event_id === 'string' ? event_id : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Artist not found' ? 404 : 500;
    console.error('Task generation error:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
