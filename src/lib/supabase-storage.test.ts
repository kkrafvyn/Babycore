import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  getBabiesMock,
  transferBabyOwnerScopeMock,
  addBabyMock,
  updateBabyMock,
  supabaseFromMock,
  upsertMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getBabiesMock: vi.fn(),
  transferBabyOwnerScopeMock: vi.fn(),
  addBabyMock: vi.fn(),
  updateBabyMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getCurrentUser: getCurrentUserMock,
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('./storage', () => ({
  addBaby: addBabyMock,
  getBabies: getBabiesMock,
  updateBaby: updateBabyMock,
  transferBabyOwnerScope: transferBabyOwnerScopeMock,
}));

import { addBaby, getBabies, migrateGuestBabiesToCurrentUser, updateBaby } from './supabase-storage';

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

describe('supabase-storage guest migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ error: null });
    addBabyMock.mockResolvedValue(undefined);
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
});
