import { supabase } from './supabase';

export interface HealthAlert {
  id: string;
  type: 'epidemic' | 'seasonal' | 'outbreak' | 'warning';
  disease_name: string;
  regions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date?: string;
  description?: string;
  prevention_tips?: string;
  affected_age_groups: string[];
  source?: string;
  data_source_url?: string;
}

export interface HealthPreferences {
  alerts_enabled: boolean;
  alert_types: string[];
  notification_frequency: 'immediate' | 'daily';
  primary_region: string;
}

/**
 * Fetch health alerts for user's region
 */
export async function getUserHealthAlerts(
  userId: string,
  countryCode: string
): Promise<HealthAlert[]> {
  try {
    const { data, error } = await supabase
      .from('health_alerts')
      .select('*')
      .contains('regions', [countryCode])
      .gte('end_date', new Date().toISOString())
      .order('severity', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching health alerts:', err);
    return [];
  }
}

/**
 * Get user's health alert preferences
 */
export async function getUserHealthPreferences(
  userId: string
): Promise<HealthPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_health_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching health preferences:', err);
    return null;
  }
}

/**
 * Create or update user's health preferences
 */
export async function updateHealthPreferences(
  userId: string,
  preferences: Partial<HealthPreferences>
): Promise<HealthPreferences | null> {
  try {
    const existing = await getUserHealthPreferences(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('user_health_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_health_preferences')
        .insert({
          user_id: userId,
          ...preferences,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error('Error updating health preferences:', err);
    return null;
  }
}

/**
 * Dismiss an alert for user
 */
export async function dismissAlert(
  userId: string,
  alertId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_health_alerts_dismissed')
      .insert({
        user_id: userId,
        alert_id: alertId,
      });

    if (error && error.code !== '23505') throw error; // 23505 = unique constraint
    return true;
  } catch (err) {
    console.error('Error dismissing alert:', err);
    return false;
  }
}

/**
 * Get active alerts excluding dismissed ones
 */
export async function getActiveAlertsForUser(
  userId: string,
  countryCode: string
): Promise<HealthAlert[]> {
  try {
    // Get dismissed alert IDs
    const { data: dismissedData } = await supabase
      .from('user_health_alerts_dismissed')
      .select('alert_id')
      .eq('user_id', userId);

    const dismissedIds = (dismissedData || []).map((d) => d.alert_id);

    // Get active alerts
    const { data: alerts } = await supabase
      .from('health_alerts')
      .select('*')
      .contains('regions', [countryCode])
      .gte('end_date', new Date().toISOString())
      .order('severity', { ascending: false });

    if (!alerts) return [];

    // Filter out dismissed ones
    return alerts.filter((alert) => !dismissedIds.includes(alert.id));
  } catch (err) {
    console.error('Error getting active alerts:', err);
    return [];
  }
}

/**
 * Fetch latest alerts from WHO/CDC API (backend should call this)
 */
export async function fetchExternalHealthAlerts(): Promise<void> {
  try {
    // This would be called by a backend cron job
    // Pseudo code for integration:
    // 1. Fetch from WHO Disease Outbreak News API
    // 2. Fetch from CDC Outbreak Alerts
    // 3. Parse and transform to HealthAlert format
    // 4. Upsert into health_alerts table
    console.log('Health alerts sync initiated');
  } catch (err) {
    console.error('Error syncing health alerts:', err);
  }
}
