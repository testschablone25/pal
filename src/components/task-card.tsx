'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MessageSquare, ShieldAlert } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'needs_refining' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  event?: {
    id: string;
    name: string;
    date: string;
  } | null;
  comment_count?: number;
  blocked: boolean;
  needs_approval: boolean;
  due_date: string | null;
  scheduled_date: string | null;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityConfig = {
  low: {
    label: 'Niedrig',
    dotClass: 'bg-zinc-500',
  },
  medium: {
    label: 'Mittel',
    dotClass: 'bg-blue-500',
  },
  high: {
    label: 'Hoch',
    dotClass: 'bg-orange-500',
  },
  urgent: {
    label: 'Dringend',
    dotClass: 'bg-red-500',
  },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];

  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const dueDateLabel = dueDate
    ? isToday(dueDate)
      ? 'Heute'
      : format(dueDate, 'dd.MM.')
    : null;
  const dueDateClass = dueDate
    ? isPast(dueDate) && !isToday(dueDate)
      ? 'text-red-400 border-red-500/40'
      : isToday(dueDate)
        ? 'text-amber-400 border-amber-500/40'
        : 'text-zinc-400 border-zinc-600'
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors rounded-none',
        isDragging && 'opacity-50 shadow-lg shadow-violet-500/20',
        task.blocked && 'border-l-2 border-l-red-500'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="text-sm font-medium text-white truncate mb-2">
              {task.title}
            </h4>

            {/* Blocked indicator */}
            {task.blocked && (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-xs font-semibold text-red-400">⛔ Blockiert</span>
              </div>
            )}

            {/* Priority, Event, and Badges */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <div className={cn("h-2 w-2 rounded-full", priority.dotClass)} />
                {priority.label}
              </div>
              {task.event && (
                <div className="text-sm font-semibold text-violet-400">
                  • {task.event.name}
                </div>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                {task.needs_approval && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
                    <ShieldAlert className="h-3 w-3" />
                    Approval
                  </div>
                )}
                {dueDate && (
                  <div className={cn("text-xs border px-1.5 py-0.5", dueDateClass)}>
                    {dueDateLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Assignee + Comment Count */}
            <div className="flex items-center justify-between">
              {/* Assignee Avatar */}
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 rounded-none">
                    <AvatarImage src={task.assignee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.full_name}`} className="rounded-none object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-zinc-300 rounded-none">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-400 truncate max-w-[100px]">
                    {task.assignee.full_name || 'Unknown'}
                  </span>
                </div>
              ) : (
                <div className="h-6" />
              )}

              {/* Comment Count */}
              {task.comment_count !== undefined && task.comment_count > 0 && (
                <div className="flex items-center gap-1 text-zinc-500">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs">{task.comment_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
