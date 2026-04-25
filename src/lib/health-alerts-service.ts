import { supabase } from './supabase';
import { getApiBaseUrl } from './api-base-url';

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_COUNTRY_CODE = 'US';
const GLOBAL_REGION_CODE = 'GLOBAL';

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

const SEVERITY_PRIORITY: Record<HealthAlert['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const normalizeCountryCode = (countryCode: string): string => {
  const cleaned = countryCode.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cleaned) ? cleaned : DEFAULT_COUNTRY_CODE;
};

const isAlertActive = (alert: Pick<HealthAlert, 'end_date'>): boolean => {
  if (!alert.end_date) {
    return true;
  }

  const endTimestamp = new Date(alert.end_date).getTime();
  return Number.isFinite(endTimestamp) && endTimestamp >= Date.now();
};

const matchesRegion = (alert: Pick<HealthAlert, 'regions'>, countryCode: string): boolean => {
  if (!Array.isArray(alert.regions)) {
    return false;
  }

  const normalizedRegions = alert.regions.map((region) => String(region).toUpperCase());
  return (
    normalizedRegions.includes(countryCode) || normalizedRegions.includes(GLOBAL_REGION_CODE)
  );
};

const sortAlerts = (alerts: HealthAlert[]): HealthAlert[] =>
  [...alerts].sort((left, right) => {
    const severityDiff =
      (SEVERITY_PRIORITY[right.severity] || 0) - (SEVERITY_PRIORITY[left.severity] || 0);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return new Date(right.start_date).getTime() - new Date(left.start_date).getTime();
  });

/**
 * Fetch health alerts for user's region
 */
export async function getUserHealthAlerts(
  userId: string,
  countryCode: string
): Promise<HealthAlert[]> {
  try {
    const normalizedCountryCode = normalizeCountryCode(countryCode || DEFAULT_COUNTRY_CODE);

    const { data, error } = await supabase
      .from('health_alerts')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(200);

    if (error) throw error;

    const alerts = (data || []) as HealthAlert[];
    return sortAlerts(
      alerts.filter(
        (alert) => isAlertActive(alert) && matchesRegion(alert, normalizedCountryCode),
      ),
    );
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
    const normalizedCountryCode = normalizeCountryCode(countryCode || DEFAULT_COUNTRY_CODE);

    // Get dismissed alert IDs
    const { data: dismissedData, error: dismissedError } = await supabase
      .from('user_health_alerts_dismissed')
      .select('alert_id')
      .eq('user_id', userId);

    if (dismissedError) throw dismissedError;

    const dismissedIds = new Set((dismissedData || []).map((record) => record.alert_id));
    const alerts = await getUserHealthAlerts(userId, normalizedCountryCode);

    return alerts.filter((alert) => !dismissedIds.has(alert.id));
  } catch (err) {
    console.error('Error getting active alerts:', err);
    return [];
  }
}

/**
 * Trigger backend sync for WHO + CDC outbreak feeds
 */
export async function syncExternalHealthAlerts(): Promise<boolean> {
  try {
    const authClient = supabase.auth as any;
    const {
      data: { session },
      error: sessionError,
    } = await authClient.getSession();

    if (sessionError) throw sessionError;

    const accessToken: string | undefined = session?.access_token;
    if (!accessToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/health-alerts/sync-external`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Health alerts sync failed (${response.status}): ${body}`);
    }

    return true;
  } catch (err) {
    console.error('Error syncing health alerts:', err);
    return false;
  }
}

/**
 * Backwards-compatible alias
 */
export async function fetchExternalHealthAlerts(): Promise<boolean> {
  return syncExternalHealthAlerts();
}
