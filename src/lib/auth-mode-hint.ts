export type AuthModeHint = 'signin' | 'signup';

export const AUTH_MODE_HINT_KEY = 'babylog_auth_mode';

export const markAuthModeHint = (mode: AuthModeHint): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_MODE_HINT_KEY, mode);
};

export const consumeAuthModeHint = (): AuthModeHint | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hintedMode = window.sessionStorage.getItem(AUTH_MODE_HINT_KEY);
  window.sessionStorage.removeItem(AUTH_MODE_HINT_KEY);

  return hintedMode === 'signup' || hintedMode === 'signin' ? hintedMode : null;
};

export const peekAuthModeHint = (): AuthModeHint | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hintedMode = window.sessionStorage.getItem(AUTH_MODE_HINT_KEY);
  return hintedMode === 'signup' || hintedMode === 'signin' ? hintedMode : null;
};
