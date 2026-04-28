/**
 * Wearable Device Integration API Routes
 * Endpoints for syncing data from Apple Health, Fitbit, and other wearables
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/wearable/connect-apple-health
 * Initiate Apple Health data sync
 */
export async function connectAppleHealth(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { healthKitToken, samples } = req.body;

    if (!userId || !healthKitToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store integration
    const { data: integration, error } = await supabase
      .from('wearable_integrations')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'apple_health',
        auth_token: healthKitToken,
        is_active: true,
        last_sync: new Date().toISOString(),
        connected_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Perform initial sync with optional client-provided samples.
    // Apple Health data is collected on-device and forwarded by the client.
    await syncAppleHealthData(userId, healthKitToken, samples);

    return res.json({
      success: true,
      integration,
      message: 'Apple Health connected successfully',
    });
  } catch (error: any) {
    console.error('Apple Health connection error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/wearable/connect-fitbit
 * Initiate Fitbit data sync
 */
export async function connectFitbit(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { fitbitAccessToken, fitbitRefreshToken } = req.body;

    if (!userId || !fitbitAccessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store integration
    const { data: integration, error } = await supabase
      .from('wearable_integrations')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'fitbit',
        auth_token: fitbitAccessToken,
        refresh_token: fitbitRefreshToken,
        is_active: true,
        last_sync: new Date().toISOString(),
        connected_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Perform initial sync
    await syncFitbitData(userId, fitbitAccessToken);

    return res.json({
      success: true,
      integration,
      message: 'Fitbit connected successfully',
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
export async function triggerWearableSync(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { deviceType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    // Get active integrations
    const { data: integrations, error: integError } = await supabase
      .from('wearable_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (integError) throw integError;

    let syncResults: Array<{ device: string; status: 'success' | 'failed'; error?: string }> = [];

    for (const integration of integrations || []) {
      if (deviceType && integration.device_type !== deviceType) continue;

      try {
        if (integration.device_type === 'apple_health') {
          await syncAppleHealthData(userId, integration.auth_token);
        } else if (integration.device_type === 'fitbit') {
          await syncFitbitData(userId, integration.auth_token);
        }

        syncResults.push({
          device: integration.device_type,
          status: 'success',
        });

        // Update last sync time
        await supabase
          .from('wearable_integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', integration.id);
      } catch (err: any) {
        syncResults.push({
          device: integration.device_type,
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
export async function getWearableData(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, deviceType, dataType, startDate, endDate } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let query = supabase
      .from('wearable_data')
      .select('*')
      .eq('user_id', userId)
      .eq('baby_id', babyId);

    if (deviceType) {
      query = query.eq('device_type', deviceType);
    }

    if (dataType) {
      query = query.eq('data_type', dataType); // 'heart_rate', 'steps', 'sleep', 'temperature'
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

    // Group by type for easier consumption
    const grouped = groupWearableDataByType(wearableData || []);

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
export async function disconnectWearable(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { integrationId } = req.body;

    if (!userId || !integrationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('wearable_integrations')
      .update({ is_active: false })
      .eq('id', integrationId)
      .eq('user_id', userId);

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
export async function getConnectedDevices(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { data: integrations, error } = await supabase
      .from('wearable_integrations')
      .select('id, device_type, is_active, last_sync, connected_at')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });

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

// Helper functions

async function syncAppleHealthData(
  userId: string,
  token: string,
  samples: Array<{
    type: 'heart_rate' | 'sleep' | 'steps' | 'temperature' | 'activity';
    value: number;
    unit?: string;
    timestamp?: string;
  }> = [],
): Promise<void> {
  try {
    if (samples.length === 0) {
      // Persist only client-provided measurements.
      return;
    }

    for (const sample of samples) {
      if (!sample || typeof sample.value !== 'number' || !sample.type) {
        continue;
      }

      await supabase.from('wearable_data').insert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'apple_health',
        data_type: sample.type,
        value: sample.value,
        unit: sample.unit || (sample.type === 'sleep' ? 'hours' : sample.type === 'steps' ? 'steps' : 'bpm'),
        recorded_at: sample.timestamp || new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error syncing Apple Health data:', error);
    throw error;
  }
}

router.post('/connect-apple-health', connectAppleHealth);
router.post('/connect-fitbit', connectFitbit);
router.post('/sync', triggerWearableSync);
router.get('/data', getWearableData);
router.post('/disconnect', disconnectWearable);
router.get('/integrations', getConnectedDevices);

export default router;

async function syncFitbitData(userId: string, accessToken: string): Promise<void> {
  try {
    // Fetch from Fitbit API
    const response = await axios.get('https://api.fitbit.com/1/user/-/activities/date/today.json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const fitbitData = response.data;

    // Store steps
    if (fitbitData.activities) {
      await supabase.from('wearable_data').insert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'fitbit',
        data_type: 'steps',
        value: fitbitData.activities[0]?.steps || 0,
        unit: 'steps',
        recorded_at: new Date().toISOString(),
      });
    }

    // Store sleep if available
    if (fitbitData.sleep) {
      const totalMinutes = fitbitData.sleep.reduce(
        (sum: number, s: any) => sum + s.duration,
        0
      );
      await supabase.from('wearable_data').insert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'fitbit',
        data_type: 'sleep',
        value: totalMinutes / 60,
        unit: 'hours',
        recorded_at: new Date().toISOString(),
      });
    }

    // Store heart rate if available
    if (fitbitData.activities[0]?.heart) {
      await supabase.from('wearable_data').insert({
        id: uuidv4(),
        user_id: userId,
        device_type: 'fitbit',
        data_type: 'heart_rate',
        value: fitbitData.activities[0].heart,
        unit: 'bpm',
        recorded_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error syncing Fitbit data:', error);
    throw error;
  }
}

function groupWearableDataByType(
  data: any[]
): { [key: string]: any[] } {
  const grouped: { [key: string]: any[] } = {};

  for (const item of data) {
    if (!grouped[item.data_type]) {
      grouped[item.data_type] = [];
    }
    grouped[item.data_type].push(item);
  }

  return grouped;
}
