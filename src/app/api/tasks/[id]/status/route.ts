import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status } = body;

    const validStatuses = ['todo', 'in_progress', 'pending_approval', 'done', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: oldTask } = await supabase
      .from('tasks')
      .select('status, needs_approval')
      .eq('id', id)
      .single();

    // Prevent bypassing approval: tasks needing approval can't be dragged directly to 'done' from 'in_progress'
    if (oldTask && oldTask.needs_approval && oldTask.status === 'in_progress' && status === 'done') {
      return NextResponse.json(
        { error: 'This task needs approval. Move it to "Pending Approval" first.' },
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

    if (oldTask && oldTask.status !== status && body.changed_by) {
      await supabase.from('task_history').insert({
        task_id: id,
        changed_by: body.changed_by,
        from_status: oldTask.status,
        to_status: status,
        change_type: 'status_change',
      });
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
