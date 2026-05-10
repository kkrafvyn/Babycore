import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationsManager } from './notifications';

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('NotificationsManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for browser globals
    delete globalThis.window;
    // @ts-expect-error test cleanup for browser globals
    delete globalThis.navigator;
    // @ts-expect-error test cleanup for browser globals
    delete globalThis.Notification;
  });

  it('allows in-app reminders when the browser notification API is unavailable', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });

    const granted = await NotificationsManager.requestPermission();

    expect(granted).toBe(true);
  });

  it('reports remote push as unavailable when browser push is not configured', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });

    const status = await NotificationsManager.getRemotePushStatus();

    expect(status.available).toBe(false);
    expect(status.subscribed).toBe(false);
    expect(['vapid-missing', 'service-worker-unavailable', 'push-manager-unavailable']).toContain(
      status.reason,
    );
  });
});
