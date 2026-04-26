import { supabase } from './supabase';

export interface WearableIntegration {
  id: string;
  user_id: string;
  device_type: 'apple_health' | 'fitbit' | 'oura_ring' | 'garmin';
  access_token?: string;
  refresh_token?: string;
  last_synced?: string;
  is_active: boolean;
}

export interface WearableData {
  id: string;
  baby_id: string;
  data_type: 'heart_rate' | 'temperature' | 'activity' | 'sleep' | 'steps';
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
}

/**
 * Connect to Apple Health
 */
export async function connectAppleHealth(userId: string): Promise<WearableIntegration | null> {
  try {
    // Apple Health authorization is initiated on-device.
    // This call stores the connected state after client permission succeeds.

    const { data, error } = await supabase
      .from('wearable_integrations')
      .upsert(
        {
          user_id: userId,
          device_type: 'apple_health',
          is_active: true,
        },
        { onConflict: 'user_id,device_type' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error connecting Apple Health:', err);
    return null;
  }
}

/**
 * Connect to Fitbit
 */
export async function connectFitbit(userId: string, accessToken: string): Promise<WearableIntegration | null> {
  try {
    const { data, error } = await supabase
      .from('wearable_integrations')
      .upsert(
        {
          user_id: userId,
          device_type: 'fitbit',
          access_token: accessToken,
          is_active: true,
        },
        { onConflict: 'user_id,device_type' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error connecting Fitbit:', err);
    return null;
  }
}

/**
 * Sync wearable data (backend would call this periodically)
 */
export async function syncWearableData(userId: string, deviceType: string): Promise<boolean> {
  try {
    // Get integration
    const { data: integration } = await supabase
      .from('wearable_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('device_type', deviceType)
      .single();

    if (!integration || !integration.is_active) return false;

    const auth = supabase.auth as any;
    const {
      data: { session },
    } = await auth.getSession();
    const accessToken: string | undefined = session?.access_token;

    // Fetch data from device API
    const response = await fetch('/api/wearable/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        deviceType,
      }),
    });

    if (!response.ok) throw new Error('Sync failed');

    // Update last_synced timestamp
    await supabase
      .from('wearable_integrations')
      .update({ last_synced: new Date().toISOString() })
      .eq('id', integration.id);

    return true;
  } catch (err) {
    console.error('Error syncing wearable data:', err);
    return false;
  }
}

/**
 * Get wearable data for a baby
 */
export async function getWearableData(
  babyId: string,
  dataType?: 'heart_rate' | 'temperature' | 'activity' | 'sleep' | 'steps',
  days: number = 7
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
    return data || [];
  } catch (err) {
    console.error('Error fetching wearable data:', err);
    return [];
  }
}

/**
 * Add manual wearable data entry
 */
export async function addWearableDataManually(
  babyId: string,
  dataType: string,
  value: number,
  unit: string,
  recordedAt: string
): Promise<WearableData | null> {
  try {
    const { data, error } = await supabase
      .from('wearable_data')
      .insert({
        baby_id: babyId,
        data_type: dataType,
        value,
        unit,
        recorded_at: recordedAt,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error adding wearable data:', err);
    return null;
  }
}

/**
 * Disconnect wearable device
 */
export async function disconnectWearable(
  userId: string,
  deviceType: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wearable_integrations')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_type', deviceType);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error disconnecting wearable:', err);
    return false;
  }
}

/**
 * Get user's connected wearables
 */
export async function getConnectedWearables(userId: string): Promise<WearableIntegration[]> {
  try {
    const { data, error } = await supabase
      .from('wearable_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching wearables:', err);
    return [];
  }
}
