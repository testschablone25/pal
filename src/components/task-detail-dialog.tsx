'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TaskForm } from './task-form';
import {
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  User,
  Loader2,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
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
}

interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const priorityConfig = {
  low: {
    label: 'Low',
    className: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-600/20 text-blue-400 border-blue-600/50',
  },
  high: {
    label: 'High',
    className: 'bg-orange-600/20 text-orange-400 border-orange-600/50',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-600/20 text-red-400 border-red-600/50',
  },
};

const statusConfig = {
  todo: { label: 'To Do', className: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50' },
  in_progress: { label: 'In Progress', className: 'bg-blue-600/20 text-blue-400 border-blue-600/50' },
  review: { label: 'Review', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50' },
  done: { label: 'Done', className: 'bg-green-600/20 text-green-400 border-green-600/50' },
  cancelled: { label: 'Cancelled', className: 'bg-red-600/20 text-red-400 border-red-600/50' },
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    if (!task) return;

    setLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateTask = async (values: {
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    event_id?: string;
  }) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      onTaskUpdated(updatedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      onTaskDeleted(task.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Edit Task' : 'Task Details'}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <TaskForm
            task={task}
            mode="edit"
            onSubmit={handleUpdateTask}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="space-y-6">
            {/* Task Header */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{task.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className={priority.className}>
                  {priority.label}
                </Badge>
                {task.event && (
                  <Badge variant="outline" className="bg-violet-600/20 text-violet-400 border-violet-600/50">
                    {task.event.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Description</h4>
                <p className="text-zinc-300 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Assignee:</span>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.avatar_url || undefined} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                        {getInitials(task.assignee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-300">
                      {task.assignee.full_name || 'Unknown'}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">Unassigned</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Created:</span>
                <span className="text-sm text-zinc-300">{formatDate(task.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-zinc-800"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTask}
                disabled={deleting}
                className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Comments Section */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h4>

              {/* Comment List */}
              <div className="space-y-4 mb-4">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author?.avatar_url || undefined} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                          {getInitials(comment.author?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-zinc-300">
                            {comment.author?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="bg-zinc-950 border-zinc-800 min-h-[80px]"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
