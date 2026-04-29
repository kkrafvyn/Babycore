export type NativeWearableSource = 'apple_health' | 'health_connect';
export type NativeWearableMetric = 'heart_rate' | 'temperature' | 'activity' | 'sleep' | 'steps';

export interface NativeWearableSample {
  dataType: NativeWearableMetric;
  value: number;
  unit: string;
  recordedAt: string;
  source: NativeWearableSource;
}

export interface NativeWearablesAvailability {
  available: boolean;
  source: NativeWearableSource | null;
  reason?: string | null;
}

export interface NativeWearablesPermissionResult {
  granted: boolean;
  source: NativeWearableSource | null;
  reason?: string | null;
}

export interface NativeWearablesSyncResult {
  source: NativeWearableSource;
  samples: NativeWearableSample[];
}

type NativeWearablesPlugin = {
  isAvailable: () => Promise<NativeWearablesAvailability>;
  requestPermissions: () => Promise<NativeWearablesPermissionResult>;
  syncSince: (options?: { since?: string | null }) => Promise<NativeWearablesSyncResult>;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
  Plugins?: Record<string, unknown>;
};

type CapacitorCoreModule = {
  Capacitor?: CapacitorBridge;
  default?: {
    Capacitor?: CapacitorBridge;
  };
};

const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
  modulePath: string,
) => Promise<any>;

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

let pluginPromise: Promise<NativeWearablesPlugin | null> | null = null;

const getCapacitorBridge = async (): Promise<CapacitorBridge | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const coreModule = (await dynamicImport('@capacitor/core')) as CapacitorCoreModule;
    return coreModule?.Capacitor || coreModule?.default?.Capacitor || window.Capacitor || null;
  } catch {
    return window.Capacitor || null;
  }
};

const getPlugin = async (): Promise<NativeWearablesPlugin | null> => {
  if (typeof window === 'undefined') return null;

  if (!pluginPromise) {
    pluginPromise = (async () => {
      const capacitor = await getCapacitorBridge();
      if (!capacitor?.isNativePlatform || !capacitor.isNativePlatform()) {
        return null;
      }

      if (capacitor.registerPlugin) {
        return capacitor.registerPlugin<NativeWearablesPlugin>('NativeWearables');
      }

      const fromWindow = capacitor.Plugins?.NativeWearables;
      return (fromWindow as NativeWearablesPlugin | undefined) || null;
    })();
  }

  return pluginPromise;
};

export const isNativeWearablesSupported = async (): Promise<NativeWearablesAvailability> => {
  const plugin = await getPlugin();
  if (!plugin) {
    return {
      available: false,
      source: null,
      reason: 'Native wearable bridge unavailable on this platform.',
    };
  }

  try {
    return await plugin.isAvailable();
  } catch (error) {
    return {
      available: false,
      source: null,
      reason: error instanceof Error ? error.message : 'Unable to inspect native wearable support.',
    };
  }
};

export const requestNativeWearablePermissions = async (): Promise<NativeWearablesPermissionResult> => {
  const plugin = await getPlugin();
  if (!plugin) {
    return {
      granted: false,
      source: null,
      reason: 'Native wearable bridge unavailable on this platform.',
    };
  }

  return plugin.requestPermissions();
};

export const syncNativeWearableSamples = async (
  since?: string | null,
): Promise<NativeWearablesSyncResult | null> => {
  const plugin = await getPlugin();
  if (!plugin) {
    return null;
  }

  return plugin.syncSince({ since: since || null });
};
