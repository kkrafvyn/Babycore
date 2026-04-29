import { supabase } from './supabase';
import { syncNativeWearableSamples, type NativeWearableSample } from './native-wearables';

export type WearableDeviceType = 'apple_health' | 'health_connect' | 'fitbit' | 'oura_ring' | 'garmin';
export type WearableDataType = 'heart_rate' | 'temperature' | 'activity' | 'sleep' | 'steps';

export interface WearableIntegration {
  id: string;
  user_id: string;
  device_type: WearableDeviceType;
  access_token?: string | null;
  refresh_token?: string | null;
  last_synced?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WearableData {
  id: string;
  baby_id: string;
  data_type: WearableDataType;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
}

export interface WearableDataInput {
  dataType: WearableDataType;
  value: number;
  unit: string;
  recordedAt: string;
  source?: string;
}

const mapNativeSampleToInput = (sample: NativeWearableSample): WearableDataInput => ({
  dataType: sample.dataType,
  value: sample.value,
  unit: sample.unit,
  recordedAt: sample.recordedAt,
  source: sample.source,
});

const normalizeTimestamp = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export async function connectWearableSource(
  userId: string,
  deviceType: WearableDeviceType,
): Promise<WearableIntegration | null> {
  try {
    const { data, error } = await supabase
      .from('wearable_integrations')
      .upsert(
        {
          user_id: userId,
          device_type: deviceType,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_type' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error connecting wearable source (${deviceType}):`, err);
    return null;
  }
}

export async function connectAppleHealth(userId: string): Promise<WearableIntegration | null> {
  return connectWearableSource(userId, 'apple_health');
}

export async function connectFitbit(userId: string, _accessToken?: string): Promise<WearableIntegration | null> {
  return connectWearableSource(userId, 'fitbit');
}

export async function connectHealthConnect(userId: string): Promise<WearableIntegration | null> {
  return connectWearableSource(userId, 'health_connect');
}

export async function syncWearableData(userId: string, deviceType: WearableDeviceType): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wearable_integrations')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_type', deviceType);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error syncing wearable source timestamp:', err);
    return false;
  }
}

export async function getWearableData(
  babyId: string,
  dataType?: WearableDataType,
  days: number = 7,
): Promise<WearableData[]> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    let query = supabase
      .from('wearable_data')
      .select('*')
      .eq('baby_id', babyId)
      .gte('recorded_at', fromDate.toISOString())
      .order('recorded_at', { ascending: false });

    if (dataType) {
      query = query.eq('data_type', dataType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as WearableData[];
  } catch (err) {
    console.error('Error fetching wearable data:', err);
    return [];
  }
}

export async function addWearableDataManually(
  babyId: string,
  dataType: WearableDataType,
  value: number,
  unit: string,
  recordedAt: string,
  source = 'manual',
): Promise<WearableData | null> {
  try {
    const { data, error } = await supabase
      .from('wearable_data')
      .insert({
        baby_id: babyId,
        data_type: dataType,
        value,
        unit,
        recorded_at: normalizeTimestamp(recordedAt),
        source,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WearableData;
  } catch (err) {
    console.error('Error adding wearable data:', err);
    return null;
  }
}

export async function importWearableDataEntries(
  babyId: string,
  entries: WearableDataInput[],
): Promise<WearableData[]> {
  try {
    if (!entries.length) {
      return [];
    }

    const payload = entries.map((entry) => ({
      baby_id: babyId,
      data_type: entry.dataType,
      value: entry.value,
      unit: entry.unit,
      recorded_at: normalizeTimestamp(entry.recordedAt),
      source: entry.source || 'import',
    }));

    const { data, error } = await supabase
      .from('wearable_data')
      .insert(payload)
      .select('*');

    if (error) throw error;
    return (data || []) as WearableData[];
  } catch (err) {
    console.error('Error importing wearable data:', err);
    return [];
  }
}

export async function importNativeWearableData(
  babyId: string,
  since?: string | null,
): Promise<{ source: WearableDeviceType | null; imported: WearableData[] }> {
  try {
    const result = await syncNativeWearableSamples(since);
    if (!result?.samples?.length) {
      return { source: (result?.source as WearableDeviceType | null) || null, imported: [] };
    }

    const imported = await importWearableDataEntries(
      babyId,
      result.samples.map(mapNativeSampleToInput),
    );

    return {
      source: result.source as WearableDeviceType,
      imported,
    };
  } catch (err) {
    console.error('Error importing native wearable data:', err);
    return { source: null, imported: [] };
  }
}

export async function disconnectWearable(
  userId: string,
  deviceType: WearableDeviceType,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wearable_integrations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_type', deviceType);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error disconnecting wearable:', err);
    return false;
  }
}

export async function getConnectedWearables(userId: string): Promise<WearableIntegration[]> {
  try {
    const { data, error } = await supabase
      .from('wearable_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WearableIntegration[];
  } catch (err) {
    console.error('Error fetching wearables:', err);
    return [];
  }
}
