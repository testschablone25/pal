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
import { TaskHistoryTimeline } from './task-history-timeline';
import { createClient } from '@/lib/supabase/browser';
import {
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  User,
  Loader2,
  Send,
  History,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Unlock,
  Package,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'needs_refining' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
  blocked: boolean;
  blocked_reason: string | null;
  needs_approval: boolean;
  due_date: string | null;
  scheduled_date: string | null;
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
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  items?: InventoryItem[];
  comment_count?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  serial_number: string | null;
  status: string;
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
  needs_refining: { label: 'Needs Refining', className: 'bg-orange-600/20 text-orange-400 border-orange-600/50' },
  todo: { label: 'To Do', className: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50' },
  in_progress: { label: 'In Progress', className: 'bg-blue-600/20 text-blue-400 border-blue-600/50' },
  review: { label: 'Review', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50' },
  done: { label: 'Done', className: 'bg-green-600/20 text-green-400 border-green-600/50' },
  cancelled: { label: 'Cancelled', className: 'bg-red-600/20 text-red-400 border-red-600/50' },
  pending_approval: { label: 'Pending Approval', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50' },
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchComments();
      getCurrentUser();
    }
  }, [open, task]);

  const getCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

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
    status: 'needs_refining' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
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

  const handleApprove = async () => {
    if (!task || !currentUserId) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve task');
      }

      const updatedTask = await response.json();
      onTaskUpdated({ ...updatedTask, items: task.items });
    } catch (error) {
      console.error('Error approving task:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!task || !currentUserId || !rejectReason.trim()) return;

    setRejecting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejected_by: currentUserId, reason: rejectReason.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject task');
      }

      const updatedTask = await response.json();
      onTaskUpdated({ ...updatedTask, items: task.items });
      setShowRejectInput(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting task:', error);
    } finally {
      setRejecting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!task || !currentUserId) return;

    const shouldBlock = !task.blocked;

    if (shouldBlock && !blockReason.trim()) return;

    setBlocking(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked: shouldBlock,
          blocked_reason: shouldBlock ? blockReason.trim() : null,
          changed_by: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update block status');
      }

      const updatedTask = await response.json();
      onTaskUpdated({ ...updatedTask, items: task.items });
      setShowBlockInput(false);
      setBlockReason('');
    } catch (error) {
      console.error('Error toggling block:', error);
    } finally {
      setBlocking(false);
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
                {task.blocked && (
                  <Badge variant="outline" className="bg-red-600/20 text-red-400 border-red-600/50">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Blocked
                  </Badge>
                )}
                {task.needs_approval && task.status !== 'pending_approval' && (
                  <Badge variant="outline" className="bg-yellow-600/20 text-yellow-400 border-yellow-600/50">
                    Needs Approval
                  </Badge>
                )}
              </div>
            </div>

            {/* Approval Section */}
            {task.status === 'pending_approval' && (
              <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Awaiting Approval</span>
                </div>
                <p className="text-sm text-zinc-400 mb-3">
                  This task has been submitted for approval. Review the details below and approve or reject.
                </p>
                {showRejectInput ? (
                  <div className="space-y-2">
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="bg-zinc-950 border-zinc-800 min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || rejecting}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {rejecting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ShieldX className="h-4 w-4 mr-2" />
                        )}
                        Confirm Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                        className="border-zinc-800"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectInput(true)}
                      className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                    >
                      <ShieldX className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {task.blocked && task.blocked_reason && (
              <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Blocked</span>
                </div>
                <p className="text-sm text-zinc-400">{task.blocked_reason}</p>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Description</h4>
                <p className="text-zinc-300 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Linked Items */}
            {task.items && task.items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Linked Items ({task.items.length})
                </h4>
                <div className="space-y-2">
                  {task.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                        {item.serial_number && (
                          <p className="text-xs text-zinc-500">S/N: {item.serial_number}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-zinc-700/50 text-zinc-300 border-zinc-600 shrink-0"
                      >
                        {item.category}
                      </Badge>
                    </div>
                  ))}
                </div>
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

              {task.creator && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Created by:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                        {getInitials(task.creator.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-300">
                      {task.creator.full_name || 'Unknown'}
                    </span>
                  </div>
                </div>
              )}

              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Due:</span>
                  <span className="text-sm text-zinc-300">{formatDate(task.due_date)}</span>
                </div>
              )}

              {task.scheduled_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Scheduled:</span>
                  <span className="text-sm text-zinc-300">{formatDate(task.scheduled_date)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
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

              {task.status === 'in_progress' && !task.blocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBlockInput(true)}
                  className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Block Task
                </Button>
              )}

              {task.blocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleBlock}
                  disabled={blocking}
                  className="border-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
                >
                  {blocking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-2" />
                  )}
                  Unblock
                </Button>
              )}
            </div>

            {/* Block Input */}
            {showBlockInput && (
              <div className="space-y-2">
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason for blocking..."
                  className="bg-zinc-950 border-zinc-800 min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleToggleBlock}
                    disabled={!blockReason.trim() || blocking}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {blocking ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Confirm Block
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowBlockInput(false); setBlockReason(''); }}
                    className="border-zinc-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

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

            {/* History Section */}
            <Separator className="bg-zinc-800" />
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </h4>
              <TaskHistoryTimeline taskId={task.id} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
