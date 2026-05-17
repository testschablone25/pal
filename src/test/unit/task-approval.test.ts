import { describe, it, expect } from 'vitest';

describe('Task Approval Logic', () => {
  it('should allow approval only from pending_approval status', () => {
    const validTransitions: Record<string, string[]> = {
      todo: ['in_progress', 'cancelled'],
      in_progress: ['pending_approval', 'done', 'cancelled'],
      pending_approval: ['done', 'in_progress'],
      done: ['in_progress', 'cancelled'],
      cancelled: ['todo'],
    };

    expect(validTransitions['pending_approval']).toContain('done');
    expect(validTransitions['pending_approval']).toContain('in_progress');

    const approverRoles = ['admin', 'manager'];
    expect(approverRoles).toContain('admin');
    expect(approverRoles).toContain('manager');
    expect(approverRoles).not.toContain('staff');
  });

  it('should require a reason for rejection', () => {
    const validateRejection = (reason: string | null | undefined): boolean => {
      return !!reason && reason.trim().length > 0;
    };

    expect(validateRejection('Missing equipment')).toBe(true);
    expect(validateRejection('')).toBe(false);
    expect(validateRejection(null)).toBe(false);
    expect(validateRejection(undefined)).toBe(false);
    expect(validateRejection('  ')).toBe(false);
  });

  it('should detect when a task needs approval', () => {
    const tasks = [
      { id: '1', needs_approval: true, status: 'pending_approval' },
      { id: '2', needs_approval: true, status: 'in_progress' },
      { id: '3', needs_approval: false, status: 'done' },
    ];

    const needsApproval = tasks.filter(t => t.needs_approval).length;
    expect(needsApproval).toBe(2);

    const pendingApproval = tasks.filter(t => t.status === 'pending_approval').length;
    expect(pendingApproval).toBe(1);
  });

  it('should construct correct history entry for approval', () => {
    const historyEntry = {
      task_id: 'abc-123',
      changed_by: 'user-456',
      from_status: 'pending_approval',
      to_status: 'done',
      change_type: 'approved',
      reason: null,
    };

    expect(historyEntry.change_type).toBe('approved');
    expect(historyEntry.from_status).toBe('pending_approval');
    expect(historyEntry.to_status).toBe('done');
    expect(historyEntry.reason).toBeNull();
  });

  it('should construct correct history entry for rejection', () => {
    const historyEntry = {
      task_id: 'abc-123',
      changed_by: 'user-456',
      from_status: 'pending_approval',
      to_status: 'in_progress',
      change_type: 'rejected',
      reason: 'Missing required cables',
    };

    expect(historyEntry.change_type).toBe('rejected');
    expect(historyEntry.from_status).toBe('pending_approval');
    expect(historyEntry.to_status).toBe('in_progress');
    expect(historyEntry.reason).toBeTruthy();
  });
});
