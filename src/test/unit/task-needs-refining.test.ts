import { describe, it, expect } from 'vitest';
import type { TechRider } from '@/lib/riders/task-generation';

interface TaskDraft {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignment_target: 'booker' | 'manager' | 'sound' | 'light' | 'logistics_sound';
  category: string;
  needs_refining?: boolean;
  duration_min?: number | null;
  specific_time?: string | null;
}

function buildStaffTasks(
  artistName: string,
  eventName: string,
  eventDate: string,
  perfReqs?: TechRider['performance_requirements']
): TaskDraft[] {
  const tasks: TaskDraft[] = [];
  
  if (perfReqs?.staff?.sound_tech) {
    const soundNotes = perfReqs.staff.sound_tech_notes || '';
    const hasSpecificTime = Boolean(perfReqs.staff.specific_time);
    const hasParty = Boolean(perfReqs.staff.party_mentioned);
    const hasGranularStaffInfo = perfReqs.staff.soundcheck_required || perfReqs.staff.set_required;

    if (!hasGranularStaffInfo) {
      tasks.push({
        title: `👨‍🔧 Arrange sound technician: ${artistName}`,
        description: `Artist ${artistName} requires a sound technician for ${eventName} (${eventDate}).`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'equipment',
        needs_refining: true,
      });
    }

    if (perfReqs.staff.soundcheck_required) {
      const needsRefining = !hasSpecificTime || !hasParty;
      tasks.push({
        title: `🎛️ Sound Engineer - Soundcheck: ${artistName}`,
        description: `Sound engineer required for soundcheck.`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'staff_soundcheck',
        needs_refining: needsRefining,
        duration_min: perfReqs.staff.soundcheck_duration_min || null,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }

    if (perfReqs.staff.set_required) {
      const needsRefining = !hasSpecificTime || !hasParty;
      tasks.push({
        title: `🎛️ Sound Engineer - Set: ${artistName}`,
        description: `Sound engineer required for full set.`,
        priority: 'high',
        assignment_target: 'sound',
        category: 'staff_set',
        needs_refining: needsRefining,
        specific_time: perfReqs.staff.specific_time || null,
      });
    }
  }

  return tasks;
}

describe('Task generation - needs_refining', () => {
  it('creates fallback task with needs_refining when no granular staff info', () => {
    const tasks = buildStaffTasks('Test Artist', 'Test Event', '2026-04-01', {
      staff: {
        sound_tech: true,
        sound_tech_notes: 'Sound tech needed',
      }
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toContain('Arrange sound technician');
    expect(tasks[0].needs_refining).toBe(true);
  });

  it('creates soundcheck task with needs_refining when no time/party', () => {
    const tasks = buildStaffTasks('Test Artist', 'Test Event', '2026-04-01', {
      staff: {
        sound_tech: true,
        soundcheck_required: true,
        soundcheck_duration_min: 30,
        specific_time: null,
        party_mentioned: null,
      }
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toContain('Soundcheck');
    expect(tasks[0].needs_refining).toBe(true);
  });

  it('creates set task with needs_refining when no time/party', () => {
    const tasks = buildStaffTasks('Test Artist', 'Test Event', '2026-04-01', {
      staff: {
        sound_tech: true,
        set_required: true,
        specific_time: null,
        party_mentioned: null,
      }
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toContain('Set');
    expect(tasks[0].needs_refining).toBe(true);
  });

  it('creates soundcheck task WITHOUT needs_refining when time and party provided', () => {
    const tasks = buildStaffTasks('Test Artist', 'Test Event', '2026-04-01', {
      staff: {
        sound_tech: true,
        soundcheck_required: true,
        soundcheck_duration_min: 30,
        specific_time: '22:00',
        party_mentioned: 'John',
      }
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toContain('Soundcheck');
    expect(tasks[0].needs_refining).toBe(false);
  });
});
