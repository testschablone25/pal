import { NextRequest, NextResponse } from 'next/server';

import { generateRiderTasksForArtist } from '@/lib/riders/task-generation';
import { requireAuth, getAuthenticatedClient } from '@/lib/api-auth';


// POST /api/artists/generate-tasks
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'ARTISTS_WRITE');
    if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

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
