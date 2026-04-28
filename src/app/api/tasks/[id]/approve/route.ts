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
    const { approved_by } = body;

    if (!approved_by) {
      return NextResponse.json({ error: 'approved_by is required' }, { status: 400 });
    }

    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Task is not in pending_approval status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('task_history').insert({
      task_id: id,
      changed_by: approved_by,
      from_status: 'pending_approval',
      to_status: 'done',
      change_type: 'approved',
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error approving task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
