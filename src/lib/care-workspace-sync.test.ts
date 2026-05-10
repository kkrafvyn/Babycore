import { afterEach, describe, expect, it } from 'vitest';

import {
  applyCareWorkspaceSyncData,
  buildCareWorkspaceSyncData,
  parseCareWorkspaceSyncData,
} from './care-workspace-sync';
import {
  clearOfflineEmergencyCardSnapshotsForTests,
  getAllOfflineEmergencyCardSnapshots,
} from './offline-emergency-card';
import {
  clearParentWellnessEntriesForTests,
  createParentWellnessEntry,
  getAllParentWellnessEntries,
} from './parent-wellness';
import {
  clearSharedCareTasksForTests,
  createSharedCareTask,
  getAllSharedCareTasks,
} from './shared-care-tasks';

afterEach(() => {
  clearSharedCareTasksForTests();
  clearParentWellnessEntriesForTests();
  clearOfflineEmergencyCardSnapshotsForTests();
});

describe('care-workspace-sync', () => {
  it('builds a filtered workspace payload for selected babies', () => {
    createSharedCareTask({ babyId: 'baby-1', title: 'Give medicine' });
    createSharedCareTask({ babyId: 'baby-2', title: 'Pack travel kit' });
    createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Mom',
      mood: 'steady',
      stressLevel: 5,
      sleepHours: 6,
    });

    const payload = buildCareWorkspaceSyncData(['baby-1']);

    expect(payload.sharedCareTasks).toHaveLength(1);
    expect(payload.sharedCareTasks[0].babyId).toBe('baby-1');
    expect(payload.parentWellnessEntries).toHaveLength(1);
  });

  it('parses unknown input safely', () => {
    expect(parseCareWorkspaceSyncData(null)).toBeNull();
    expect(parseCareWorkspaceSyncData({})).toMatchObject({
      sharedCareTasks: [],
      parentWellnessEntries: [],
      offlineEmergencySnapshots: [],
    });
  });

  it('applies remote workspace data into local stores', () => {
    const task = createSharedCareTask({ babyId: 'baby-1', title: 'Old task' });
    const wellness = createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Dad',
      mood: 'rested',
      stressLevel: 3,
      sleepHours: 7,
    });

    applyCareWorkspaceSyncData({
      sharedCareTasks: [{ ...task, title: 'Updated task title' }],
      parentWellnessEntries: [{ ...wellness, caregiverName: 'Updated caregiver' }],
      offlineEmergencySnapshots: [
        {
          babyId: 'baby-1',
          babyName: 'Ava',
          savedAt: '2026-05-10T12:00:00.000Z',
          source: 'fallback',
          text: 'Emergency snapshot',
          apiCard: null,
          fallbackCard: {
            babyId: 'baby-1',
            babyName: 'Ava',
            generatedAt: '2026-05-10T11:55:00.000Z',
            knownAllergies: [],
            activeMedications: [],
            overdueVaccines: [],
            emergencyNotes: [],
          },
        },
      ],
      syncedAt: '2026-05-10T12:00:00.000Z',
    });

    expect(getAllSharedCareTasks()[0].title).toBe('Updated task title');
    expect(getAllParentWellnessEntries()[0].caregiverName).toBe('Updated caregiver');
    expect(getAllOfflineEmergencyCardSnapshots()).toHaveLength(1);
  });
});
