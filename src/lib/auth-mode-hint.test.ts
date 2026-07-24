import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_MODE_HINT_KEY,
  consumeAuthModeHint,
  markAuthModeHint,
  peekAuthModeHint,
} from './auth-mode-hint';

const createSessionStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe('auth-mode-hint', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      sessionStorage: createSessionStorageMock(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and consumes auth mode hints', () => {
    markAuthModeHint('signup');
    expect(peekAuthModeHint()).toBe('signup');
    expect(consumeAuthModeHint()).toBe('signup');
    expect(peekAuthModeHint()).toBeNull();
  });
});
