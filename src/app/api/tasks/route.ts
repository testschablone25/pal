// Tasks CRUD API
// Workflow/Kanban Module - Nightclub Booking System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/tasks - List all tasks with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assignee_id');
    const eventId = searchParams.get('event_id');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const myTasks = searchParams.get('my_tasks'); // Filter by current user
    const userId = searchParams.get('user_id'); // Current user ID
    const blocked = searchParams.get('blocked');
    const needsApproval = searchParams.get('needs_approval');
    const search = searchParams.get('search');
    const myCreated = searchParams.get('my_created');

    let query = supabase
      .from('tasks')
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
        creator:created_by (
          id, full_name, email, avatar_url
        ),
        comments:task_comments(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    // If my_tasks=true, filter by user_id; otherwise use assignee_id if provided
    if (myTasks === 'true' && userId) {
      query = query.eq('assignee_id', userId);
    } else if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (blocked === 'true') {
      query = query.eq('blocked', true);
    }
    if (needsApproval === 'true') {
      query = query.eq('needs_approval', true);
    }
    if (search) {
      const sanitized = search.replace(/%/g, '\\%');
      query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
    if (myCreated === 'true' && userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform data to include comment count
    const tasksWithCommentCount = data?.map(task => ({
      ...task,
      comment_count: task.comments?.[0]?.count || 0,
      comments: undefined
    })) || [];

    return NextResponse.json({
      tasks: tasksWithCommentCount,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
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
      created_by,
      item_ids,
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        status: status || 'todo',
        priority: priority || 'medium',
        assignee_id,
        event_id: event_id || null,
        due_date: due_date || null,
        scheduled_date: scheduled_date || null,
        needs_approval: needs_approval || false,
        created_by,
      })
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
        creator:created_by (
          id, full_name, email, avatar_url
        )
      `)
      .single();

    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 400 }
      );
    }

    if (item_ids && item_ids.length > 0 && taskData) {
      const { error: itemsError } = await supabase.from('task_items').insert(
        item_ids.map((item_id: string) => ({
          task_id: taskData.id,
          item_id,
        }))
      );
      if (itemsError) {
        console.error('Failed to link items:', itemsError);
      }
    }

    const { error: historyError } = await supabase.from('task_history').insert({
      task_id: taskData.id,
      changed_by: created_by,
      from_status: null,
      to_status: taskData.status,
      change_type: 'created',
    });

    if (historyError) {
      console.error('Failed to log task history:', historyError);
    }

    return NextResponse.json({ ...taskData, comment_count: 0, item_ids: item_ids || [] }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
