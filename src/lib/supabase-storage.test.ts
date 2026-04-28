import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  getBabiesMock,
  transferBabyOwnerScopeMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getBabiesMock: vi.fn(),
  transferBabyOwnerScopeMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getCurrentUser: getCurrentUserMock,
  supabase: {},
}));

vi.mock('./storage', () => ({
  getBabies: getBabiesMock,
  transferBabyOwnerScope: transferBabyOwnerScopeMock,
}));

import { migrateGuestBabiesToCurrentUser } from './supabase-storage';

describe('supabase-storage guest migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
