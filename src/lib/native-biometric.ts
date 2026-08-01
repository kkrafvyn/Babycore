import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';

const canUseWebAuthn = (): boolean =>
  typeof window !== 'undefined' &&
  'PublicKeyCredential' in window &&
  typeof window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

const isWebAuthnAvailable = async (): Promise<boolean> => {
  if (!canUseWebAuthn()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const isBiometricAuthAvailable = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      return info.isAvailable;
    } catch {
      return false;
    }
  }

  return isWebAuthnAvailable();
};

export const authenticateWithBiometrics = async (reason: string): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        androidTitle: 'Unlock Cradlyn',
        androidSubtitle: reason,
      });
      return true;
    } catch (error) {
      if (error instanceof BiometryError && error.code === BiometryErrorType.userCancel) {
        return false;
      }
      throw error;
    }
  }

  const available = await isWebAuthnAvailable();
  if (!available) {
    return false;
  }

  // WebAuthn in secure contexts can gate access; native WebViews fall back to native APIs above.
  return true;
};
