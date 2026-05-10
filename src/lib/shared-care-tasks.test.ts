import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSharedCareTasksForTests,
  createSharedCareTask,
  deleteSharedCareTask,
  getSharedCareTasks,
  getSharedCareTasksForBabies,
  updateSharedCareTask,
} from './shared-care-tasks';

describe('shared-care-tasks', () => {
  beforeEach(() => {
    clearSharedCareTasksForTests();
  });

  it('creates and loads tasks for one baby', () => {
    const task = createSharedCareTask({
      babyId: 'baby-1',
      title: 'Confirm post-visit temperature checks',
      assignedRole: 'caregiver',
      priority: 'soon',
    });

    expect(task.status).toBe('open');
    expect(getSharedCareTasks('baby-1')).toHaveLength(1);
    expect(getSharedCareTasks('baby-1')[0]?.title).toContain('temperature');
  });

  it('updates and completes a task', () => {
    const task = createSharedCareTask({
      babyId: 'baby-2',
      title: 'Review antibiotic plan',
      assignedRole: 'doctor',
    });

    const updated = updateSharedCareTask(task.id, {
      status: 'completed',
      details: 'Doctor confirmed the 7-day course.',
    });

    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeTruthy();
    expect(getSharedCareTasks('baby-2')[0]?.details).toContain('7-day');
  });

  it('filters multiple babies and deletes tasks', () => {
    const first = createSharedCareTask({
      babyId: 'baby-a',
      title: 'Pack records for appointment',
    });
    createSharedCareTask({
      babyId: 'baby-b',
      title: 'Check refill inventory',
    });

    expect(getSharedCareTasksForBabies(['baby-a', 'baby-b'])).toHaveLength(2);
    expect(deleteSharedCareTask(first.id)).toBe(true);
    expect(getSharedCareTasks('baby-a')).toHaveLength(0);
  });
});
