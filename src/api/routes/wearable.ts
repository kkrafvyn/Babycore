/**
 * Wearable Device Integration API Routes
 * Endpoints for syncing data from Apple Health, Health Connect, Fitbit, and other wearables
 */

import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import type { AuthRequest } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

type WearableDeviceType = 'apple_health' | 'health_connect' | 'fitbit' | 'oura_ring' | 'garmin';
type WearableDataType = 'heart_rate' | 'sleep' | 'steps' | 'temperature' | 'activity';
type NativeWearableDeviceType = 'apple_health' | 'health_connect';

interface WearableIntegrationRow {
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

interface WearableDataRow {
  id: string;
  baby_id: string;
  data_type: WearableDataType;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
  created_at?: string;
}

interface WearableSample {
  type: WearableDataType;
  value: number;
  unit?: string;
  timestamp?: string;
}

const WEARABLE_DEVICE_TYPES: WearableDeviceType[] = [
  'apple_health',
  'health_connect',
  'fitbit',
  'oura_ring',
  'garmin',
];

const DEFAULT_UNITS: Record<WearableDataType, string> = {
  heart_rate: 'bpm',
  sleep: 'hours',
  steps: 'steps',
  temperature: 'C',
  activity: 'minutes',
};

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const isWearableDeviceType = (value: unknown): value is WearableDeviceType =>
  typeof value === 'string' && WEARABLE_DEVICE_TYPES.includes(value as WearableDeviceType);

const isNativeWearableDeviceType = (value: WearableDeviceType): value is NativeWearableDeviceType =>
  value === 'apple_health' || value === 'health_connect';

async function userCanAccessBaby(req: AuthRequest, babyId: string): Promise<boolean> {
  const userId = req.user?.id;
  if (!userId) {
    return false;
  }

  const { data: baby, error: babyError } = await supabase
    .from('babies')
    .select('user_id')
    .eq('id', babyId)
    .single();

  if (babyError || !baby) {
    return false;
  }

  if (baby.user_id === userId) {
    return true;
  }

  const userEmail = normalizeEmail(req.user?.email);
  const inviteFilters = [
    `accepted_by.eq.${userId}`,
    userEmail ? `invited_email.ilike.${userEmail}` : null,
  ]
    .filter(Boolean)
    .join(',');

  if (inviteFilters) {
    const { data: sharedAccess } = await supabase
      .from('family_sharing_invites')
      .select('id')
      .eq('baby_id', babyId)
      .not('accepted_at', 'is', null)
      .or(inviteFilters)
      .maybeSingle();

    if (sharedAccess) {
      return true;
    }
  }

  const { data: doctorAccess } = await supabase
    .from('doctor_baby_assignments')
    .select('id')
    .eq('baby_id', babyId)
    .eq('doctor_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return Boolean(doctorAccess);
}

async function assertBabyAccess(req: AuthRequest, res: Response, babyId?: string): Promise<boolean> {
  if (!babyId) {
    res.status(400).json({ error: 'babyId is required' });
    return false;
  }

  const hasAccess = await userCanAccessBaby(req, babyId);
  if (!hasAccess) {
    res.status(403).json({ error: 'You do not have access to this baby' });
    return false;
  }

  return true;
}

async function upsertWearableIntegration(
  userId: string,
  deviceType: WearableDeviceType,
  options: {
    accessToken?: string;
    refreshToken?: string;
    lastSynced?: string;
  } = {},
): Promise<WearableIntegrationRow> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    device_type: deviceType,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (options.accessToken) {
    payload.access_token = options.accessToken;
  }

  if (options.refreshToken) {
    payload.refresh_token = options.refreshToken;
  }

  if (options.lastSynced) {
    payload.last_synced = options.lastSynced;
  }

  const { data, error } = await supabase
    .from('wearable_integrations')
    .upsert(payload, { onConflict: 'user_id,device_type' })
    .select('*')
    .single();

  if (error || !data) {
    throw error || new Error('Unable to save wearable integration');
  }

  return data as WearableIntegrationRow;
}

async function markWearableSynced(userId: string, deviceType: WearableDeviceType): Promise<void> {
  const { error } = await supabase
    .from('wearable_integrations')
    .update({
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('device_type', deviceType);

  if (error) {
    throw error;
  }
}

async function syncNativeWearableData(
  babyId: string,
  deviceType: NativeWearableDeviceType,
  samples: WearableSample[] = [],
): Promise<number> {
  const rows = samples
    .filter((sample) => sample && typeof sample.value === 'number' && sample.type)
    .map((sample) => ({
      baby_id: babyId,
      data_type: sample.type,
      value: sample.value,
      unit: sample.unit || DEFAULT_UNITS[sample.type],
      recorded_at: sample.timestamp || new Date().toISOString(),
      source: deviceType,
    }));

  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase.from('wearable_data').insert(rows);
  if (error) {
    throw error;
  }

  return rows.length;
}

async function connectNativeWearable(
  req: AuthRequest,
  res: Response,
  options: {
    deviceType: NativeWearableDeviceType;
    label: string;
    tokenField?: string;
  },
) {
  try {
    const userId = req.user?.id;
    const { babyId, samples } = req.body as {
      babyId?: string;
      samples?: WearableSample[];
    };

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    if (babyId && !(await assertBabyAccess(req, res, babyId))) {
      return;
    }

    const accessToken =
      options.tokenField && typeof req.body?.[options.tokenField] === 'string'
        ? String(req.body[options.tokenField]).trim()
        : '';

    const integration = await upsertWearableIntegration(userId, options.deviceType, {
      accessToken: accessToken || undefined,
    });

    let imported = 0;
    if (babyId && Array.isArray(samples) && samples.length) {
      imported = await syncNativeWearableData(babyId, options.deviceType, samples);
      await markWearableSynced(userId, options.deviceType);
    }

    return res.json({
      success: true,
      integration,
      imported,
      message:
        imported > 0
          ? `${options.label} connected and synced successfully`
          : `${options.label} connected successfully`,
    });
  } catch (error: any) {
    console.error(`${options.label} connection error:`, error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/wearable/connect-apple-health
 * Connect Apple Health and optionally persist client-provided samples
 */
export async function connectAppleHealth(req: AuthRequest, res: Response) {
  return connectNativeWearable(req, res, {
    deviceType: 'apple_health',
    label: 'Apple Health',
    tokenField: 'healthKitToken',
  });
}

/**
 * POST /api/wearable/connect-health-connect
 * Connect Health Connect and optionally persist client-provided samples
 */
export async function connectHealthConnect(req: AuthRequest, res: Response) {
  return connectNativeWearable(req, res, {
    deviceType: 'health_connect',
    label: 'Health Connect',
    tokenField: 'healthConnectToken',
  });
}

/**
 * POST /api/wearable/connect-fitbit
 * Connect Fitbit and optionally perform an initial import for a baby
 */
export async function connectFitbit(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { fitbitAccessToken, fitbitRefreshToken, babyId } = req.body as {
      fitbitAccessToken?: string;
      fitbitRefreshToken?: string;
      babyId?: string;
    };

    if (!userId || !fitbitAccessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (babyId && !(await assertBabyAccess(req, res, babyId))) {
      return;
    }

    const integration = await upsertWearableIntegration(userId, 'fitbit', {
      accessToken: fitbitAccessToken,
      refreshToken: fitbitRefreshToken,
    });

    let imported = 0;
    if (babyId) {
      imported = await syncFitbitData(babyId, fitbitAccessToken);
      await markWearableSynced(userId, 'fitbit');
    }

    return res.json({
      success: true,
      integration,
      imported,
      message:
        imported > 0
          ? 'Fitbit connected and synced successfully'
          : 'Fitbit connected successfully',
    });
  } catch (error: any) {
    console.error('Fitbit connection error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/wearable/sync
 * Manually trigger wearable data sync
 */
export async function triggerWearableSync(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { deviceType, babyId, samples } = req.body as {
      deviceType?: WearableDeviceType;
      babyId?: string;
      samples?: WearableSample[];
    };

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    if (deviceType && !isWearableDeviceType(deviceType)) {
      return res.status(400).json({ error: 'Unsupported wearable device type' });
    }

    if (babyId && !(await assertBabyAccess(req, res, babyId))) {
      return;
    }

    let integrationsQuery = supabase
      .from('wearable_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deviceType) {
      integrationsQuery = integrationsQuery.eq('device_type', deviceType);
    }

    const { data: integrations, error: integError } = await integrationsQuery;

    if (integError) throw integError;

    const syncResults: Array<{
      device: WearableDeviceType;
      status: 'success' | 'failed';
      imported?: number;
      error?: string;
    }> = [];

    for (const integration of (integrations || []) as WearableIntegrationRow[]) {
      const integrationDeviceType = integration.device_type;

      try {
        let imported = 0;

        if (isNativeWearableDeviceType(integrationDeviceType)) {
          if (!babyId) {
            throw new Error('babyId is required to sync native wearable data.');
          }

          if (deviceType !== integrationDeviceType) {
            throw new Error(`Specify deviceType=${integrationDeviceType} when sending native samples.`);
          }

          if (!Array.isArray(samples) || samples.length === 0) {
            throw new Error('samples are required to sync native wearable data through this API.');
          }

          imported = await syncNativeWearableData(babyId, integrationDeviceType, samples);
        } else if (integrationDeviceType === 'fitbit') {
          if (!babyId) {
            throw new Error('babyId is required to sync Fitbit data.');
          }

          if (!integration.access_token) {
            throw new Error('Fitbit access token is missing for this integration.');
          }

          imported = await syncFitbitData(babyId, integration.access_token);
        } else {
          throw new Error(`${integrationDeviceType} sync is not supported by this API route yet.`);
        }

        await markWearableSynced(userId, integrationDeviceType);

        syncResults.push({
          device: integrationDeviceType,
          status: 'success',
          imported,
        });
      } catch (err: any) {
        syncResults.push({
          device: integrationDeviceType,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      syncResults,
      message: `Synced ${syncResults.filter(r => r.status === 'success').length} devices`,
    });
  } catch (error: any) {
    console.error('Wearable sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/wearable/data
 * Get synced wearable data
 */
export async function getWearableData(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, deviceType, dataType, startDate, endDate } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await assertBabyAccess(req, res, String(babyId)))) {
      return;
    }

    let query = supabase
      .from('wearable_data')
      .select('*')
      .eq('baby_id', babyId);

    if (deviceType) {
      query = query.eq('source', deviceType);
    }

    if (dataType) {
      query = query.eq('data_type', dataType);
    }

    if (startDate) {
      query = query.gte('recorded_at', startDate);
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate);
    }

    const { data: wearableData, error } = await query.order('recorded_at', {
      ascending: false,
    });

    if (error) throw error;

    const grouped = groupWearableDataByType((wearableData || []) as WearableDataRow[]);

    return res.json({
      success: true,
      data: grouped,
      count: wearableData?.length || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/wearable/disconnect
 * Disconnect wearable device
 */
export async function disconnectWearable(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { integrationId, deviceType } = req.body as {
      integrationId?: string;
      deviceType?: WearableDeviceType;
    };

    if (!userId || (!integrationId && !deviceType)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (deviceType && !isWearableDeviceType(deviceType)) {
      return res.status(400).json({ error: 'Unsupported wearable device type' });
    }

    let query = supabase
      .from('wearable_integrations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (integrationId) {
      query = query.eq('id', integrationId);
    } else if (deviceType) {
      query = query.eq('device_type', deviceType);
    }

    const { error } = await query;

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Wearable device disconnected',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/wearable/integrations
 * Get list of connected wearable devices
 */
export async function getConnectedDevices(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { data: integrations, error } = await supabase
      .from('wearable_integrations')
      .select('id, device_type, is_active, last_synced, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      devices: integrations || [],
      count: integrations?.length || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

router.post('/connect-apple-health', connectAppleHealth);
router.post('/connect-health-connect', connectHealthConnect);
router.post('/connect-fitbit', connectFitbit);
router.post('/sync', triggerWearableSync);
router.get('/data', getWearableData);
router.post('/disconnect', disconnectWearable);
router.get('/integrations', getConnectedDevices);

export default router;

async function syncFitbitData(babyId: string, accessToken: string): Promise<number> {
  try {
    const response = await axios.get('https://api.fitbit.com/1/user/-/activities/date/today.json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const fitbitData = (response.data || {}) as Record<string, any>;
    const recordedAt = new Date().toISOString();
    const rows: Array<{
      baby_id: string;
      data_type: WearableDataType;
      value: number;
      unit: string;
      recorded_at: string;
      source: string;
    }> = [];

    const steps = Number(fitbitData.summary?.steps ?? fitbitData.activities?.[0]?.steps);
    if (Number.isFinite(steps)) {
      rows.push({
        baby_id: babyId,
        data_type: 'steps',
        value: steps,
        unit: 'steps',
        recorded_at: recordedAt,
        source: 'fitbit',
      });
    }

    const totalMinutesAsleep = Number(fitbitData.summary?.totalMinutesAsleep);
    const sleepHours =
      Number.isFinite(totalMinutesAsleep) && totalMinutesAsleep > 0
        ? totalMinutesAsleep / 60
        : Array.isArray(fitbitData.sleep)
          ? fitbitData.sleep.reduce((sum: number, item: Record<string, any>) => {
              const duration = Number(item?.duration);
              return sum + (Number.isFinite(duration) ? duration : 0);
            }, 0) / (1000 * 60 * 60)
          : 0;

    if (sleepHours > 0) {
      rows.push({
        baby_id: babyId,
        data_type: 'sleep',
        value: sleepHours,
        unit: 'hours',
        recorded_at: recordedAt,
        source: 'fitbit',
      });
    }

    const restingHeartRate = Number(
      fitbitData['activities-heart']?.[0]?.value?.restingHeartRate ??
      fitbitData.activities?.[0]?.heart,
    );

    if (Number.isFinite(restingHeartRate)) {
      rows.push({
        baby_id: babyId,
        data_type: 'heart_rate',
        value: restingHeartRate,
        unit: 'bpm',
        recorded_at: recordedAt,
        source: 'fitbit',
      });
    }

    if (!rows.length) {
      return 0;
    }

    const { error } = await supabase.from('wearable_data').insert(rows);
    if (error) {
      throw error;
    }

    return rows.length;
  } catch (error) {
    console.error('Error syncing Fitbit data:', error);
    throw error;
  }
}

function groupWearableDataByType(
  data: WearableDataRow[]
): Record<string, WearableDataRow[]> {
  const grouped: Record<string, WearableDataRow[]> = {};

  for (const item of data) {
    if (!grouped[item.data_type]) {
      grouped[item.data_type] = [];
    }
    grouped[item.data_type].push(item);
  }

  return grouped;
}
