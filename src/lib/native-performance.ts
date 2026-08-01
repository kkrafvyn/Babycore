import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean =>
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const isAndroidApp = (): boolean => isNativeApp() && Capacitor.getPlatform() === 'android';

export const getNativeDrawerTransition = () =>
  isNativeApp()
    ? { type: 'tween' as const, duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
    : { type: 'spring' as const, damping: 25 };

export const initNativePerformance = (): void => {
  if (!isNativeApp()) {
    return;
  }

  document.documentElement.classList.add('capacitor-native');
  document.body.classList.add('capacitor-native');

  if (Capacitor.getPlatform() === 'android') {
    document.documentElement.classList.add('capacitor-android');
    document.body.classList.add('capacitor-android');
  }
};
