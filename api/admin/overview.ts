import { createClient } from '@supabase/supabase-js';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: Record<string, any>) => void;
  setHeader: (name: string, value: string) => void;
};

const TABLES_TO_COUNT = [
  'user_roles',
  'role_assignment_logs',
  'admin_actions_log',
  'manager_reports',
  'babies',
  'feeding_logs',
  'sleep_logs',
  'diaper_logs',
  'vaccination_records',
  'growth_measurements',
  'health_alerts',
  'user_health_preferences',
  'user_health_alerts_dismissed',
  'health_alert_cache',
  'baby_photos',
  'photo_collages',
  'doctor_reports',
  'pediatrician_contacts',
  'doctor_profiles',
  'doctor_baby_assignments',
  'diagnoses',
  'medications',
  'medication_adherence',
  'appointment_reminders',
  'medical_reports',
  'medical_history_summary',
  'consultation_notes',
  'doctor_growth_assessment',
  'family_sharing_invites',
  'caregiver_sessions',
  'sharing_activity_log',
  'sleep_analytics',
  'feeding_analytics',
  'health_records',
  'allergies',
  'content_library',
  'user_content_preferences',
  'wearable_integrations',
  'wearable_data',
  'voice_logs',
  'voice_recognition_results',
  'subscription_addons',
  'user_addon_subscriptions',
  'community_forums',
  'community_posts',
  'community_replies',
  'playdate_events',
  'email_reports',
  'milestone_announcements',
  'app_usage_analytics',
  'sync_queue',
  'audit_logs',
  'vaccine_schedules',
  'doctor_appointments',
  'activity_logs',
  'activity_recommendations',
  'activity_impact_analysis',
  'baby_expenses',
  'expense_budgets',
  'expense_summary',
  'growth_benchmarks',
  'milestone_benchmarks',
  'baby_benchmarks',
  'parent_wellness',
  'parent_health_screening',
  'parent_support_resources',
  'sleep_coaching_programs',
  'sleep_coaching_sessions',
  'sleep_coaching_progress',
  'meal_plans',
  'meals_logged',
  'nutrition_info',
  'shopping_lists',
] as const;

const RECENT_TABLES = [
  'babies',
  'feeding_logs',
  'sleep_logs',
  'diaper_logs',
  'vaccination_records',
  'growth_measurements',
  'user_roles',
  'admin_actions_log',
  'health_alerts',
  'family_sharing_invites',
  'doctor_reports',
  'doctor_appointments',
  'user_addon_subscriptions',
  'community_posts',
  'voice_logs',
  'wearable_data',
  'email_reports',
  'baby_expenses',
  'audit_logs',
] as const;

const ORDER_CANDIDATES = [
  'created_at',
  'updated_at',
  'timestamp',
  'date',
  'start_time',
  'purchased_at',
] as const;

const getAuthorizationToken = (
  header: string | string[] | undefined,
): string | undefined => {
  if (!header) return undefined;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !value.startsWith('Bearer ')) return undefined;
  return value.slice(7).trim();
};

async function countRows(supabase: any, table: string): Promise<number> {
  try {
    const { count, error } = await supabase.from(table).select('*', {
      count: 'exact',
      head: true,
    });
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

async function fetchRecentRows(supabase: any, table: string): Promise<any[]> {
  for (const orderColumn of ORDER_CANDIDATES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderColumn, { ascending: false })
        .limit(6);

      if (!error) {
        return data || [];
      }
    } catch {
      // Try next ordering strategy.
    }
  }

  try {
    const { data, error } = await supabase.from(table).select('*').limit(6);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({
      success: false,
      error:
        'Missing SUPABASE_URL or service role key (SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY)',
    });
    return;
  }

  const token = getAuthorizationToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing bearer token' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin role required' });
    return;
  }

  const countResults = await Promise.all(
    TABLES_TO_COUNT.map(async (table) => [table, await countRows(supabase, table)] as const),
  );
  const counts = Object.fromEntries(countResults) as Record<string, number>;

  const roleDistribution = await (async () => {
    try {
      const { data, error } = await supabase.from('user_roles').select('role');
      if (error || !data) return [];

      const rollup = data.reduce<Record<string, number>>((acc, row) => {
        const role = (row as any).role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(rollup)
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);
    } catch {
      return [];
    }
  })();

  const recentResults = await Promise.all(
    RECENT_TABLES.map(async (table) => [table, await fetchRecentRows(supabase, table)] as const),
  );
  const recent = Object.fromEntries(recentResults) as Record<string, any[]>;

  res.status(200).json({
    success: true,
    data: {
      counts,
      roleDistribution,
      recent,
      generatedAt: new Date().toISOString(),
    },
  });
}
