import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { sendTransactionalEmail } from '../utils/email.js';
import { supabase } from '../utils/supabase.js';
import { applyFullSync, buildSyncSnapshot } from '../utils/sync-data.js';
import { resolveFallbackRoleFromUser } from '../utils/effective-role.js';
import { getRoleDistribution } from '../utils/role-manager.js';
import { ensureRecordBabyAccess } from '../utils/baby-access.js';
import { resolveClientAppBaseUrl } from '../utils/app-base-url.js';

const isTruthy = (value: string | undefined): boolean => Boolean(value && value.trim().length > 0);

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const INVITE_ROLES = new Set(['editor', 'viewer', 'caregiver', 'doctor']);
const INVITE_VIEWS = new Set(['patients', 'family-sharing']);

const isLikelyPlaceholder = (value: string | undefined): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('your_') ||
    normalized.includes('example') ||
    normalized.includes('changeme') ||
    normalized.includes('replace_me') ||
    normalized.includes('placeholder')
  );
};

const isLocalUrl = (value: string | undefined): boolean => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const isTrueEnvFlag = (value: string | undefined): boolean =>
  TRUE_VALUES.has(String(value || '').trim().toLowerCase());

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const buildInviteLink = (
  req: Pick<Request, 'get' | 'headers'> & Partial<Pick<Request, 'protocol'>>,
  inviteToken: string,
  view: 'patients' | 'family-sharing',
): string => {
  const inviteUrl = new URL('/login', resolveClientAppBaseUrl(req));
  inviteUrl.searchParams.set('invite', inviteToken);
  inviteUrl.searchParams.set('view', view);
  return inviteUrl.toString();
};

const isGenericEmailEndpointEnabled = (): boolean =>
  isTrueEnvFlag(process.env.ENABLE_GENERIC_EMAIL_ENDPOINT);

const hasSupabasePublishableKey = (): boolean =>
  isTruthy(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || isTruthy(process.env.VITE_SUPABASE_ANON_KEY);

const hasFcmHttpV1Config = (): boolean => {
  const serviceAccountFile =
    process.env.FCM_SERVICE_ACCOUNT_JSON_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (isTruthy(serviceAccountFile) && !isLikelyPlaceholder(serviceAccountFile)) {
    return true;
  }

  const serviceAccountJson =
    process.env.FCM_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (isTruthy(serviceAccountJson) && !isLikelyPlaceholder(serviceAccountJson)) {
    return true;
  }

  const projectId =
    process.env.FCM_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail =
    process.env.FCM_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey =
    process.env.FCM_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY;

  return (
    isTruthy(projectId) &&
    !isLikelyPlaceholder(projectId) &&
    isTruthy(clientEmail) &&
    !isLikelyPlaceholder(clientEmail) &&
    isTruthy(privateKey) &&
    !isLikelyPlaceholder(privateKey)
  );
};

const hasApnsAuthConfig = (): boolean => {
  const authKeyFile = process.env.APNS_AUTH_KEY_P8_FILE || process.env.APNS_AUTH_KEY_FILE;

  if (isTruthy(authKeyFile) && !isLikelyPlaceholder(authKeyFile)) {
    return true;
  }

  const authKey = process.env.APNS_AUTH_KEY_P8 || process.env.APNS_AUTH_KEY;
  const teamId = process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID || process.env.APPLE_KEY_ID;

  return (
    isTruthy(authKey) &&
    !isLikelyPlaceholder(authKey) &&
    isTruthy(teamId) &&
    !isLikelyPlaceholder(teamId) &&
    isTruthy(keyId) &&
    !isLikelyPlaceholder(keyId)
  );
};

const requireUser = (req: AuthRequest, res: Response): req is AuthRequest & { user: any } => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }

  return true;
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

async function countRows(table: string): Promise<number> {
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

async function fetchRecentRows(table: string): Promise<any[]> {
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
      // Try the next ordering strategy.
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

const extractStoragePath = (audioUrl?: string, storageKey?: string): string | null => {
  if (storageKey) {
    return storageKey.replace(/^voice-logs\//, '');
  }

  if (!audioUrl) return null;

  try {
    const parsed = new URL(audioUrl);
    const marker = '/storage/v1/object/public/voice-logs/';
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
};

const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  const endpoint = process.env.SPEECH_TRANSCRIBE_ENDPOINT;
  if (!endpoint) {
    return '';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SPEECH_TRANSCRIBE_API_KEY
        ? { Authorization: `Bearer ${process.env.SPEECH_TRANSCRIBE_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      audioBase64: audioBuffer.toString('base64'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcription provider failed (${response.status})`);
  }

  const payload = (await response.json()) as { text?: string };
  return String(payload.text || '').trim();
};

export function healthCheckHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  });
}

export function healthConfigHandler(_req: Request, res: Response): void {
  const checks = {
    supabaseFrontendUrl:
      isTruthy(process.env.VITE_SUPABASE_URL) && !isLikelyPlaceholder(process.env.VITE_SUPABASE_URL),
    supabaseFrontendKey: hasSupabasePublishableKey(),
    supabaseServerUrl:
      isTruthy(process.env.SUPABASE_URL) && !isLikelyPlaceholder(process.env.SUPABASE_URL),
    supabaseServiceKey:
      (isTruthy(process.env.SUPABASE_SERVICE_KEY) || isTruthy(process.env.SUPABASE_SERVICE_ROLE_KEY)) &&
      !isLikelyPlaceholder(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    paystackPublicKey:
      isTruthy(process.env.VITE_PAYSTACK_PUBLIC_KEY) &&
      !isLikelyPlaceholder(process.env.VITE_PAYSTACK_PUBLIC_KEY),
    paystackSecretKey:
      (isTruthy(process.env.PAYSTACK_SECRET_KEY) || isTruthy(process.env.PAYSTACK_SERVICE_KEY)) &&
      !isLikelyPlaceholder(process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SERVICE_KEY),
    oauthRedirectConfigured:
      isTruthy(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL) &&
      !isLocalUrl(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL),
    vapidPublicKey:
      isTruthy(process.env.VITE_VAPID_PUBLIC_KEY) &&
      !isLikelyPlaceholder(process.env.VITE_VAPID_PUBLIC_KEY),
    vapidPrivateKey:
      isTruthy(process.env.VAPID_PRIVATE_KEY) &&
      !isLikelyPlaceholder(process.env.VAPID_PRIVATE_KEY),
    fcmHttpV1: hasFcmHttpV1Config(),
    apnsAuth: hasApnsAuthConfig(),
  };

  const criticalCheckKeys = [
    'supabaseFrontendUrl',
    'supabaseFrontendKey',
    'supabaseServerUrl',
    'supabaseServiceKey',
    'paystackPublicKey',
    'paystackSecretKey',
    'oauthRedirectConfigured',
  ] as const;

  const recommendedCheckKeys = ['vapidPublicKey', 'vapidPrivateKey', 'fcmHttpV1', 'apnsAuth'] as const;

  const missingCritical = criticalCheckKeys.filter((key) => !checks[key]);
  const missingRecommended = recommendedCheckKeys.filter((key) => !checks[key]);

  const shouldExposeDetails =
    (process.env.NODE_ENV || 'development') !== 'production' ||
    isTrueEnvFlag(process.env.EXPOSE_HEALTH_CONFIG_DETAILS);

  if (!shouldExposeDetails) {
    res.status(200).json({
      success: true,
      ready: missingCritical.length === 0,
      checks: {
        redacted: true,
      },
      missingCriticalCount: missingCritical.length,
      missingRecommendedCount: missingRecommended.length,
    });
    return;
  }

  res.status(200).json({
    success: true,
    ready: missingCritical.length === 0,
    checks,
    missingCritical,
    missingRecommended,
    urls: {
      appOrigin: process.env.VITE_SUPABASE_AUTH_REDIRECT_URL || null,
      paystackWebhookPrimary: '/api/payments/webhook/paystack',
      paystackWebhookCompat: '/api/webhooks/paystack',
      flutterwaveWebhookPrimary: '/api/payments/webhook/flutterwave',
      flutterwaveWebhookCompat: '/api/webhooks/flutterwave',
    },
  });
}

export async function sendEmailHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  if (!isGenericEmailEndpointEnabled()) {
    res.status(410).json({
      success: false,
      error: 'Generic email endpoint is disabled. Use a dedicated email workflow.',
    });
    return;
  }

  if (req.userRole !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin role required' });
    return;
  }

  const to = normalizeEmail(req.body?.to);
  const subject = String(req.body?.subject || '').trim();
  const html = String(req.body?.html || '').trim();
  const from = typeof req.body?.from === 'string' ? req.body.from : undefined;

  if (!to || !subject || !html) {
    res.status(400).json({ success: false, error: 'Missing to/subject/html' });
    return;
  }

  if (!isValidEmail(to)) {
    res.status(400).json({ success: false, error: 'Invalid recipient email address' });
    return;
  }

  if (from && !isValidEmail(from)) {
    res.status(400).json({ success: false, error: 'Invalid sender email address' });
    return;
  }

  if (subject.length > 200 || html.length > 100_000) {
    res.status(400).json({ success: false, error: 'Email payload exceeds allowed limits' });
    return;
  }

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      html,
      from,
    });

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send email',
    });
  }
}

export async function sendInviteEmailHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  const inviteToken = String(req.body?.invite_token || '').trim();
  const requestedView = String(req.body?.view || req.body?.invite_view || 'patients')
    .trim()
    .toLowerCase();
  const view = INVITE_VIEWS.has(requestedView) ? (requestedView as 'patients' | 'family-sharing') : 'patients';
  const providedRecipientEmail = normalizeEmail(req.body?.recipient_email);

  if (!inviteToken) {
    res.status(400).json({ success: false, error: 'Missing invite_token' });
    return;
  }

  try {
    const { data: invite, error } = await supabase
      .from('family_sharing_invites')
      .select(
        'id, invited_email, invited_name, role, invite_token, created_by, expires_at, is_public_link, baby_name_snapshot',
      )
      .eq('invite_token', inviteToken)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      res.status(404).json({ success: false, error: 'Invite not found' });
      return;
    }

    if (String(invite.created_by || '').trim() !== String(req.user.id || '').trim() && req.userRole !== 'admin') {
      res.status(403).json({ success: false, error: 'You cannot send email for this invite' });
      return;
    }

    if (invite.is_public_link) {
      res.status(400).json({ success: false, error: 'Public invite links do not support email delivery' });
      return;
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      res.status(400).json({ success: false, error: 'Invite has expired' });
      return;
    }

    const recipientEmail = normalizeEmail(invite.invited_email);
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      res.status(400).json({ success: false, error: 'Invite is missing a valid recipient email' });
      return;
    }

    if (providedRecipientEmail && providedRecipientEmail !== recipientEmail) {
      res.status(400).json({
        success: false,
        error: 'recipient_email does not match the stored invite recipient',
      });
      return;
    }

    const normalizedRole = String(invite.role || '').trim().toLowerCase();
    const role = INVITE_ROLES.has(normalizedRole) ? normalizedRole : 'caregiver';
    const inviteLink = buildInviteLink(req, inviteToken, view);
    const safeRoleLabel = escapeHtml(role);
    const safeInviteLink = escapeHtml(inviteLink);
    const safeBabyName = String(invite.baby_name_snapshot || '').trim();
    const safeRecipientName = String(invite.invited_name || '').trim();
    const subject = `BabyCore invite: ${role}`;
    const introCopy = safeBabyName
      ? `You were invited as <strong>${safeRoleLabel}</strong> to help care for <strong>${escapeHtml(safeBabyName)}</strong>.`
      : `You were invited as <strong>${safeRoleLabel}</strong> to BabyCore.`;
    const greeting = safeRecipientName ? `<p>Hi ${escapeHtml(safeRecipientName)},</p>` : '';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="margin-bottom: 12px;">You have been invited to BabyCore</h2>
        ${greeting}
        <p>${introCopy}</p>
        <p>Click the button below to accept:</p>
        <p style="margin: 24px 0;">
          <a href="${safeInviteLink}" style="display:inline-block;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;">
            Accept Invite
          </a>
        </p>
        <p style="color:#555;">If the button does not work, open this link:</p>
        <p style="word-break: break-all; color:#1f6feb;">${safeInviteLink}</p>
      </div>
    `.trim();
    const text = [
      'You have been invited to BabyCore.',
      safeBabyName ? `Role: ${role} for ${safeBabyName}` : `Role: ${role}`,
      `Accept invite: ${inviteLink}`,
    ].join('\n');

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });

    res.status(200).json({
      success: true,
      message: 'Invite email processed',
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send invite email',
    });
  }
}

export async function sendReportEmailHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  res.status(410).json({
    success: false,
    error: 'Deprecated endpoint. Use /api/reports/email so report links are generated server-side.',
  });
}

export async function currentRoleHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  try {
    res.status(200).json({
      success: true,
      role: req.userRole || resolveFallbackRoleFromUser(req.user),
    });
  } catch (error) {
    console.error('Failed to load current user role:', error);
    res.status(200).json({
      success: true,
      role: req.userRole || resolveFallbackRoleFromUser(req.user),
    });
  }
}

export async function adminOverviewHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  if (req.userRole !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin role required' });
    return;
  }

  const countResults = await Promise.all(
    TABLES_TO_COUNT.map(async (table) => [table, await countRows(table)] as const),
  );
  const counts = Object.fromEntries(countResults) as Record<string, number>;

  const roleDistribution = await getRoleDistribution().catch(() => []);

  const recentResults = await Promise.all(
    RECENT_TABLES.map(async (table) => [table, await fetchRecentRows(table)] as const),
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

export async function syncFullHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  try {
    const localData =
      req.body?.localData && typeof req.body.localData === 'object' ? req.body.localData : req.body;

    const result = await applyFullSync(supabase, req.user, localData);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      results: result.results,
    });
  } catch (error) {
    console.error('Failed to apply full sync:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply full sync',
    });
  }
}

export async function syncSnapshotHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  try {
    const snapshot = await buildSyncSnapshot(supabase, req.user);
    res.status(200).json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to build sync snapshot:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build sync snapshot',
    });
  }
}

export async function voiceTranscribeHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!requireUser(req, res)) return;

  const voiceLogId = String(req.body?.voice_log_id || req.body?.voiceLogId || '').trim();
  if (!voiceLogId) {
    res.status(400).json({ success: false, error: 'Missing voice_log_id' });
    return;
  }

  try {
    const voiceLog = await ensureRecordBabyAccess<{
      id: string;
      baby_id: string;
      transcription?: string | null;
      audio_url?: string | null;
      storage_key?: string | null;
      storage_url?: string | null;
    }>(req, res, {
      table: 'voice_logs',
      idValue: voiceLogId,
      select: 'id,baby_id,transcription,audio_url,storage_key,storage_url',
      write: true,
      missingMessage: 'Voice log not found',
      forbiddenMessage: 'You do not have permission to transcribe this voice log',
    });
    if (!voiceLog) return;

    if (voiceLog.transcription) {
      res.status(200).json({ success: true, transcription: voiceLog.transcription });
      return;
    }

    const storagePath =
      extractStoragePath(
        String(voiceLog.audio_url || voiceLog.storage_url || ''),
        voiceLog.storage_key || undefined,
      ) ||
      String(voiceLog.storage_key || '').trim() ||
      null;
    if (!storagePath) {
      res.status(200).json({
        success: true,
        transcription: '',
        message: 'No storage path available for transcription.',
      });
      return;
    }

    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from('voice-logs')
      .download(storagePath);

    if (downloadError || !audioBlob) throw downloadError || new Error('Unable to load audio file');

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const transcription = await transcribeAudio(audioBuffer);

    if (transcription) {
      await supabase.from('voice_logs').update({ transcription }).eq('id', voiceLogId);
    }

    res.status(200).json({ success: true, transcription });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to transcribe audio',
    });
  }
}
