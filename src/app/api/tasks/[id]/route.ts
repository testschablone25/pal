// Tasks CRUD API - Single Task
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

const taskSelect = `
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
  comments:task_comments(count),
  task_items (
    item_id,
    items (*)
  )
`;

// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('tasks')
      .select(taskSelect)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...data,
      comment_count: data.comments?.[0]?.count || 0,
      comments: undefined,
      items: data.task_items?.map((ti: { items: unknown }) => ti.items) || [],
      task_items: undefined
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      status,
      priority,
      assignee_id,
      event_id,
      due_date,
      scheduled_date,
      needs_approval,
      blocked,
      blocked_reason,
      changed_by,
      item_ids
    } = body;

    // Fetch existing task for comparison
    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // Build update payload, only including provided fields
    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (status !== undefined) updatePayload.status = status;
    if (priority !== undefined) updatePayload.priority = priority;
    if (assignee_id !== undefined) updatePayload.assignee_id = assignee_id;
    if (event_id !== undefined) updatePayload.event_id = event_id;
    if (due_date !== undefined) updatePayload.due_date = due_date;
    if (scheduled_date !== undefined) updatePayload.scheduled_date = scheduled_date;
    if (needs_approval !== undefined) updatePayload.needs_approval = needs_approval;
    if (blocked !== undefined) updatePayload.blocked = blocked;
    if (blocked_reason !== undefined) updatePayload.blocked_reason = blocked_reason;

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select(taskSelect)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Compare fields and log edit history
    const changedFields: string[] = [];
    const trackedFields: [string, keyof typeof existing, unknown][] = [
      ['title', 'title', title],
      ['description', 'description', description],
      ['priority', 'priority', priority],
      ['assignee_id', 'assignee_id', assignee_id],
      ['event_id', 'event_id', event_id],
      ['due_date', 'due_date', due_date],
      ['scheduled_date', 'scheduled_date', scheduled_date],
      ['needs_approval', 'needs_approval', needs_approval],
      ['blocked', 'blocked', blocked],
      ['blocked_reason', 'blocked_reason', blocked_reason],
    ];

    for (const [label, field, newValue] of trackedFields) {
      if (newValue !== undefined && String(existing[field]) !== String(newValue)) {
        changedFields.push(label);
      }
    }

    if (changedFields.length > 0 && changed_by) {
      const { error: historyError } = await supabase.from('task_history').insert({
        task_id: id,
        changed_by,
        from_status: existing.status,
        to_status: status ?? existing.status,
        change_type: 'edited',
        reason: `Changed: ${changedFields.join(', ')}`,
      });

      if (historyError) {
        console.error('Failed to log task history:', historyError);
      }
    }

    // Handle item_ids: delete old links and insert new ones
    if (item_ids !== undefined) {
      const { error: deleteError } = await supabase
        .from('task_items')
        .delete()
        .eq('task_id', id);

      if (deleteError) {
        console.error('Failed to delete old task items:', deleteError);
        return NextResponse.json({ error: 'Failed to update task items' }, { status: 500 });
      }

      if (item_ids.length > 0) {
        const { error: insertError } = await supabase.from('task_items').insert(
          item_ids.map((item_id: string) => ({
            task_id: id,
            item_id,
          }))
        );

        if (insertError) {
          console.error('Failed to insert new task items:', insertError);
          return NextResponse.json({ error: 'Failed to update task items' }, { status: 500 });
        }
      }
    }

    // Re-fetch task with fresh items to ensure response has correct item data
    const { data: freshData } = await supabase
      .from('tasks')
      .select(taskSelect)
      .eq('id', id)
      .single();

    const responseData = freshData || data;

    return NextResponse.json({
      ...responseData,
      comment_count: responseData.comments?.[0]?.count || 0,
      comments: undefined,
      items: responseData.task_items?.map((ti: { items: unknown }) => ti.items) || [],
      task_items: undefined
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
