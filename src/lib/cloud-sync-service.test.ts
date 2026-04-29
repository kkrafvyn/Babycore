import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getUserMock,
  fromMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

vi.mock('./cloud-sync-mappers', () => ({
  fromHealthLogCloudRow: (value: any) => value,
  fromUserSettingsCloudRow: (value: any) => value,
  toHealthLogCloudRow: (value: any) => value,
  toUserSettingsCloudRow: (userId: string, value: any) => ({
    ...value,
    user_id: userId,
  }),
}));

import { getSyncStatus, performFullSync } from './cloud-sync-service';

const createInviteQuery = () => ({
  eq: vi.fn().mockReturnValue({
    not: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  ilike: vi.fn().mockReturnValue({
    not: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
});

const createDoctorAssignmentsQuery = () => ({
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
});

describe('cloud-sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
        },
      },
    });
  });

  it('syncs babies before dependent records', async () => {
    const callOrder: string[] = [];

    fromMock.mockImplementation((table: string) => {
      if (table === 'babies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          upsert: vi.fn(async () => {
            callOrder.push('babies');
            return { error: null };
          }),
        };
      }

      if (table === 'family_sharing_invites') {
        return {
          select: vi.fn().mockReturnValue(createInviteQuery()),
        };
      }

      if (table === 'doctor_baby_assignments') {
        return {
          select: vi.fn().mockReturnValue(createDoctorAssignmentsQuery()),
        };
      }

      return {
        upsert: vi.fn(async () => {
          callOrder.push(table);
          return { error: null };
        }),
      };
    });

    const synced = await performFullSync({
      babies: [
        {
          id: 'baby-1',
          name: 'Unako',
          dateOfBirth: '2024-09-01',
          gender: 'girl',
          country: 'US',
          createdAt: '2026-04-29T00:00:00.000Z',
        },
      ],
      sleepLogs: [
        {
          id: 'sleep-1',
          babyId: 'baby-1',
          startTime: '2026-04-29T00:00:00.000Z',
          endTime: '2026-04-29T01:00:00.000Z',
          duration: 60,
          createdAt: '2026-04-29T01:00:00.000Z',
        },
      ],
      feedLogs: [],
      diaperLogs: [],
      healthLogs: [],
      growthMeasurements: [],
      vaccinationRecords: [],
      milestones: [],
      memories: [],
      journalEntries: [],
      userSettings: null,
    });

    expect(synced).toBe(true);
    expect(callOrder.indexOf('babies')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('sleep_logs')).toBeGreaterThan(callOrder.indexOf('babies'));
  });

  it('skips dependent record sync when baby sync fails', async () => {
    const callOrder: string[] = [];

    fromMock.mockImplementation((table: string) => {
      if (table === 'babies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          upsert: vi.fn(async () => {
            callOrder.push('babies');
            return { error: new Error('row-level security policy failure') };
          }),
        };
      }

      if (table === 'family_sharing_invites') {
        return {
          select: vi.fn().mockReturnValue(createInviteQuery()),
        };
      }

      if (table === 'doctor_baby_assignments') {
        return {
          select: vi.fn().mockReturnValue(createDoctorAssignmentsQuery()),
        };
      }

      return {
        upsert: vi.fn(async () => {
          callOrder.push(table);
          return { error: null };
        }),
      };
    });

    const synced = await performFullSync({
      babies: [
        {
          id: 'baby-1',
          name: 'Unako',
          dateOfBirth: '2024-09-01',
          gender: 'girl',
          country: 'US',
          createdAt: '2026-04-29T00:00:00.000Z',
        },
      ],
      sleepLogs: [
        {
          id: 'sleep-1',
          babyId: 'baby-1',
          startTime: '2026-04-29T00:00:00.000Z',
          endTime: '2026-04-29T01:00:00.000Z',
          duration: 60,
          createdAt: '2026-04-29T01:00:00.000Z',
        },
      ],
      feedLogs: [],
      diaperLogs: [],
      healthLogs: [],
      growthMeasurements: [],
      vaccinationRecords: [],
      milestones: [],
      memories: [],
      journalEntries: [],
      userSettings: null,
    });

    expect(synced).toBe(false);
    expect(callOrder).toEqual(['babies']);
    expect(getSyncStatus().syncError).toContain('babies: row-level security policy failure');
  });
});
