import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  getSessionMock,
  getBabiesMock,
  transferBabyOwnerScopeMock,
  addBabyMock,
  addFeedLogMock,
  deleteSleepLogMock,
  updateBabyMock,
  supabaseFromMock,
  upsertMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getSessionMock: vi.fn(),
  getBabiesMock: vi.fn(),
  transferBabyOwnerScopeMock: vi.fn(),
  addBabyMock: vi.fn(),
  addFeedLogMock: vi.fn(),
  deleteSleepLogMock: vi.fn(),
  updateBabyMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getCurrentUser: getCurrentUserMock,
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    from: supabaseFromMock,
  },
}));

vi.mock('./storage', () => ({
  addBaby: addBabyMock,
  addFeedLog: addFeedLogMock,
  deleteSleepLog: deleteSleepLogMock,
  getBabies: getBabiesMock,
  updateBaby: updateBabyMock,
  transferBabyOwnerScope: transferBabyOwnerScopeMock,
}));

import {
  addBaby,
  addFeedLog,
  deleteSleepLog,
  getBabies,
  migrateGuestBabiesToCurrentUser,
  updateBaby,
} from './supabase-storage';

const createInviteQuery = () => ({
  eq: vi.fn().mockReturnValue({
    not: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  ilike: vi.fn().mockReturnValue({
    not: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
});

const createBabySelectQuery = (rows: any[]) => ({
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }),
});

const createDoctorAssignmentsQuery = (rows: any[] = []) => ({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }),
});

describe('supabase-storage guest migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    upsertMock.mockResolvedValue({ error: null });
    addBabyMock.mockResolvedValue(undefined);
    addFeedLogMock.mockResolvedValue(undefined);
    deleteSleepLogMock.mockResolvedValue(undefined);
    updateBabyMock.mockResolvedValue(undefined);
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'family_sharing_invites') {
        return {
          select: vi.fn().mockReturnValue(createInviteQuery()),
        };
      }

      if (table === 'babies') {
        return {
          upsert: upsertMock,
          select: vi.fn().mockReturnValue(createBabySelectQuery([])),
        };
      }

      if (table === 'doctor_baby_assignments') {
        return {
          select: vi.fn().mockReturnValue(createDoctorAssignmentsQuery()),
        };
      }

      return {
        select: vi.fn().mockReturnValue(createInviteQuery()),
      };
    });
  });

  it('does nothing when no authenticated user is present', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(migrateGuestBabiesToCurrentUser()).resolves.toBe(0);
    expect(getBabiesMock).not.toHaveBeenCalled();
    expect(transferBabyOwnerScopeMock).not.toHaveBeenCalled();
  });

  it('moves guest babies into the signed-in user scope', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    getBabiesMock.mockResolvedValue([
      { id: 'baby-1', name: 'Ava' },
      { id: 'baby-2', name: 'Noah' },
    ]);
    transferBabyOwnerScopeMock.mockResolvedValue(true);

    await expect(migrateGuestBabiesToCurrentUser()).resolves.toBe(2);

    expect(getBabiesMock).toHaveBeenCalledWith('guest');
    expect(transferBabyOwnerScopeMock).toHaveBeenCalledTimes(2);
    expect(transferBabyOwnerScopeMock).toHaveBeenNthCalledWith(
      1,
      'baby-1',
      'guest',
      'user:user-123',
    );
    expect(transferBabyOwnerScopeMock).toHaveBeenNthCalledWith(
      2,
      'baby-2',
      'guest',
      'user:user-123',
    );
  });

  it('syncs a newly added baby directly to cloud for authenticated users', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    addBabyMock.mockResolvedValue(undefined);

    await addBaby({
      id: 'baby-1',
      name: 'Ava',
      dateOfBirth: '2024-01-01',
      gender: 'girl',
      country: 'US',
      createdAt: '2026-04-29T00:00:00.000Z',
    });

    expect(addBabyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'baby-1',
        name: 'Ava',
      }),
      'user:user-123',
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'baby-1',
        user_id: 'user-123',
        name: 'Ava',
        date_of_birth: '2024-01-01',
      }),
      { onConflict: 'id' },
    );
  });

  it('suppresses invite-policy permission errors during direct baby sync', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    addBabyMock.mockResolvedValue(undefined);
    upsertMock.mockResolvedValue({
      error: {
        code: '42501',
        details: null,
        hint: null,
        message: 'permission denied for table family_sharing_invites',
      },
    });

    await expect(
      addBaby({
        id: 'baby-1',
        name: 'Ava',
        dateOfBirth: '2024-01-01',
        gender: 'girl',
        country: 'US',
        createdAt: '2026-04-29T00:00:00.000Z',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('hydrates baby updates locally without re-syncing to cloud when requested', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    updateBabyMock.mockResolvedValue(undefined);

    await expect(
      updateBaby(
        {
          id: 'baby-1',
          name: 'Ava',
          dateOfBirth: '2024-01-01',
          gender: 'girl',
          country: 'US',
          createdAt: '2026-04-29T00:00:00.000Z',
        },
        { skipCloudSync: true },
      ),
    ).resolves.toBeUndefined();

    expect(updateBabyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'baby-1',
        name: 'Ava',
      }),
      'user:user-123',
    );
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('merges owned babies from cloud into local storage on load', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 'user-123' });
    getBabiesMock.mockResolvedValue([
      {
        id: 'local-baby',
        name: 'Local Baby',
        dateOfBirth: '2024-02-02',
        gender: 'boy',
        country: 'US',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
    ]);

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'family_sharing_invites') {
        return {
          select: vi.fn().mockReturnValue(createInviteQuery()),
        };
      }

      if (table === 'babies') {
        return {
          select: vi.fn().mockReturnValue(
            createBabySelectQuery([
              {
                id: 'cloud-baby',
                name: 'Cloud Baby',
                date_of_birth: '2024-03-03',
                gender: 'girl',
                photo_url: null,
                country: 'US',
                created_at: '2026-04-29T00:00:00.000Z',
              },
            ]),
          ),
          upsert: upsertMock,
        };
      }

      if (table === 'doctor_baby_assignments') {
        return {
          select: vi.fn().mockReturnValue(createDoctorAssignmentsQuery()),
        };
      }

      return {
        select: vi.fn().mockReturnValue(createInviteQuery()),
      };
    });

    const babies = await getBabies();

    expect(updateBabyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cloud-baby',
        name: 'Cloud Baby',
      }),
      'user:user-123',
    );
    expect(babies.map((baby) => baby.id).sort()).toEqual(['cloud-baby', 'local-baby']);
  });

  it('repairs signed-in local babies that are missing from cloud', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    getBabiesMock.mockResolvedValue([
      {
        id: 'phone-only-baby',
        name: 'Unako',
        dateOfBirth: '2024-09-01',
        gender: 'girl',
        country: 'US',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
    ]);

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'family_sharing_invites') {
        return {
          select: vi.fn().mockReturnValue(createInviteQuery()),
        };
      }

      if (table === 'babies') {
        return {
          select: vi.fn().mockReturnValue(createBabySelectQuery([])),
          upsert: upsertMock,
        };
      }

      if (table === 'doctor_baby_assignments') {
        return {
          select: vi.fn().mockReturnValue(createDoctorAssignmentsQuery()),
        };
      }

      return {
        select: vi.fn().mockReturnValue(createInviteQuery()),
      };
    });

    const babies = await getBabies();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'phone-only-baby',
        user_id: 'user-123',
        name: 'Unako',
        date_of_birth: '2024-09-01',
      }),
      { onConflict: 'id' },
    );
    expect(babies.map((baby) => baby.id)).toEqual(['phone-only-baby']);
  });

  it('avoids direct browser upserts on production hosts when backend sync is unavailable', async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockRejectedValue(new Error('network offline'));

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          hostname: 'app.babycore.example',
          origin: 'https://app.babycore.example',
        },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
    });

    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
      error: null,
    });
    addBabyMock.mockResolvedValue(undefined);

    await expect(
      addBaby({
        id: 'baby-1',
        name: 'Ava',
        dateOfBirth: '2024-01-01',
        gender: 'girl',
        country: 'US',
        createdAt: '2026-04-29T00:00:00.000Z',
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sync/full',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(upsertMock).not.toHaveBeenCalled();

    if (typeof originalWindow === 'undefined') {
      delete (globalThis as any).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      });
    }

    if (typeof originalFetch === 'undefined') {
      delete (globalThis as any).fetch;
    } else {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true,
      });
    }
  });

  it('syncs feed logs directly to cloud and normalizes breast milk values', async () => {
    const feedUpsertMock = vi.fn().mockResolvedValue({ error: null });

    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    addFeedLogMock.mockResolvedValue(undefined);
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'feed_logs') {
        return {
          upsert: feedUpsertMock,
        };
      }

      return {
        select: vi.fn().mockReturnValue(createInviteQuery()),
      };
    });

    await addFeedLog({
      id: 'feed-1',
      babyId: 'baby-1',
      timestamp: '2026-05-14T08:00:00.000Z',
      type: 'bottle',
      bottleAmount: 120,
      bottleType: 'breast_milk',
      createdAt: '2026-05-14T08:01:00.000Z',
    });

    expect(addFeedLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'feed-1',
        bottleType: 'breast_milk',
      }),
    );
    expect(feedUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'feed-1',
        baby_id: 'baby-1',
        amount: 120,
        milk_type: 'breast',
      }),
      { onConflict: 'id' },
    );
  });

  it('deletes sleep logs from local storage and cloud', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

    getCurrentUserMock.mockResolvedValue({ id: 'user-123', email: 'donfrass0551@gmail.com' });
    deleteSleepLogMock.mockResolvedValue(undefined);
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'sleep_logs') {
        return {
          delete: deleteMock,
        };
      }

      return {
        select: vi.fn().mockReturnValue(createInviteQuery()),
      };
    });

    await deleteSleepLog('sleep-1');

    expect(deleteSleepLogMock).toHaveBeenCalledWith('sleep-1');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', 'sleep-1');
  });
});
