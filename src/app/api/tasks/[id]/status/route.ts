// Task Status Update API
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// PUT /api/tasks/[id]/status - Update task status (for drag-drop)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status } = body;

    // Validate status
    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        assignee:assignee_id (
          id,
          full_name,
          email,
          avatar_url
        ),
        event:event_id (
          id,
          name,
          date
        ),
        comments:task_comments(count)
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...data,
      comment_count: data.comments?.[0]?.count || 0,
      comments: undefined
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
