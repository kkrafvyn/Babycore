export const PASSWORD_RECOVERY_REQUIRED_KEY = 'cradlyn_password_recovery_required';
export const PASSWORD_RECOVERY_EVENT = 'cradlyn:password-recovery-required';

export const markPasswordRecoveryRequired = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PASSWORD_RECOVERY_REQUIRED_KEY, '1');
  window.dispatchEvent(new CustomEvent(PASSWORD_RECOVERY_EVENT));
};

export const isPasswordRecoveryRequired = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(PASSWORD_RECOVERY_REQUIRED_KEY) === '1';
};

export const clearPasswordRecoveryRequired = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PASSWORD_RECOVERY_REQUIRED_KEY);
  window.dispatchEvent(new CustomEvent(PASSWORD_RECOVERY_EVENT));
};

export const detectPasswordRecoveryFromUrl = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const searchParams = url.searchParams;

  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
};

export const scrubAuthTokensFromUrl = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const hasAuthFragment =
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('code') ||
    hashParams.get('type') === 'recovery';

  if (!hasAuthFragment) {
    return;
  }

  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
};
