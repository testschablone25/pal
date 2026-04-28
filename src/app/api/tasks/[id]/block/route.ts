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
    const { blocked, blocked_reason, changed_by } = body;

    if (!changed_by) {
      return NextResponse.json({ error: 'changed_by is required' }, { status: 400 });
    }

    if (blocked === true && (!blocked_reason || !blocked_reason.trim())) {
      return NextResponse.json({ error: 'blocked_reason is required when blocking a task' }, { status: 400 });
    }

    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      blocked,
      blocked_reason: blocked ? blocked_reason.trim() : null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('task_history').insert({
      task_id: id,
      changed_by,
      from_status: task.status,
      to_status: task.status,
      change_type: blocked ? 'blocked' : 'unblocked',
      reason: blocked ? blocked_reason.trim() : null,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating task block status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
