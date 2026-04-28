import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { supabase } from '../utils/supabase.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  calculateEmergencyShareTtlMinutes,
  buildEmergencyShareLocationSummary,
  EMERGENCY_SHARE_PRESETS,
  EMERGENCY_SHARE_SECTION_KEYS,
  formatEmergencyGrowthSummary,
  getEmergencyShareLinkStatus,
  normalizeEmergencySharePresetKey,
  resolveEmergencyShareDisplayName,
  summarizeEmergencyShareUserAgent,
  type EmergencyShareSectionKey,
} from '../../lib/emergency-share-utils.js';

const router = Router();

type BabyAccessRole = 'owner' | 'shared' | 'doctor' | 'none';

type BabyAccessResult = {
  allowed: boolean;
  canWrite: boolean;
  role: BabyAccessRole;
  baby: any | null;
  sharedRole?: string;
};

const getPdfBuffer = (doc: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer | Uint8Array) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const getUserProfileType = (user: any): string => {
  const profileType = String(user?.user_metadata?.onboarding_profile_type || '').trim().toLowerCase();
  if (profileType === 'doctor' || profileType === 'caregiver' || profileType === 'baby') {
    return profileType;
  }
  return 'baby';
};

const buildClientBaseUrl = (req: Request): string => {
  const configured =
    process.env.CLIENT_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    '';

  if (configured) {
    if (configured.startsWith('http://') || configured.startsWith('https://')) {
      return configured.replace(/\/+$/, '');
    }
    return `https://${configured.replace(/\/+$/, '')}`;
  }

  const origin = req.get('origin');
  if (origin) return origin.replace(/\/+$/, '');
  return 'https://babycore.vercel.app';
};

const createEmergencyShareToken = (): string =>
  crypto.randomBytes(24).toString('base64url');

const EMERGENCY_SHARE_ALLOWED_SECTIONS = EMERGENCY_SHARE_SECTION_KEYS;

type EmergencyShareSection = EmergencyShareSectionKey;
type EmergencyShareAccessLogResult =
  | 'success'
  | 'not_found'
  | 'expired'
  | 'revoked'
  | 'pin_required'
  | 'pin_failed'
  | 'view_limit_reached';

type EmergencyShareRiskLevel = 'info' | 'warning' | 'critical';

type ActivityCenterTone = 'info' | 'success' | 'warning' | 'critical';
type ActivityCenterCategory = 'care' | 'sharing' | 'billing';
type ActivityCenterEventKind =
  | 'care_approval'
  | 'medication_dose'
  | 'emergency_share_access'
  | 'payment'
  | 'family_invite';

type ActivityCenterEvent = {
  id: string;
  kind: ActivityCenterEventKind;
  category: ActivityCenterCategory;
  tone: ActivityCenterTone;
  title: string;
  summary: string;
  occurredAt: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
};

const hashSensitiveValue = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const normalizeEmergencyShareSections = (input: unknown): EmergencyShareSection[] => {
  const requested = Array.isArray(input) ? input : [];
  const normalized = requested
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value): value is EmergencyShareSection =>
      (EMERGENCY_SHARE_ALLOWED_SECTIONS as readonly string[]).includes(value),
    );

  const deduped = Array.from(new Set(normalized));
  if (deduped.length > 0) {
    return deduped;
  }

  return [...EMERGENCY_SHARE_ALLOWED_SECTIONS];
};

const filterEmergencyCardForSections = (card: any, sections: string[]) => {
  const allowedSections = normalizeEmergencyShareSections(sections);
  const allowedSet = new Set<string>(allowedSections);
  const includeDemographics = allowedSet.has('demographics');

  return {
    ...card,
    baby: card?.baby
      ? {
          ...card.baby,
          name: resolveEmergencyShareDisplayName(card.baby.name, allowedSections),
          date_of_birth: includeDemographics ? card.baby.date_of_birth : '',
          country: includeDemographics ? card.baby.country : '',
        }
      : card?.baby,
    allergies: allowedSet.has('allergies') ? card?.allergies || [] : [],
    medications: allowedSet.has('medications') ? card?.medications || [] : [],
    latestGrowth: allowedSet.has('growth') ? card?.latestGrowth || null : null,
    vaccines: allowedSet.has('vaccines') ? card?.vaccines || [] : [],
    doctorContacts: allowedSet.has('doctor_contacts') ? card?.doctorContacts || [] : [],
    allowedSections,
  };
};

const serializeEmergencyCard = (card: any) => ({
  baby: card?.baby
    ? {
        id: String(card.baby.id || ''),
        name: String(card.baby.name || 'Baby'),
        date_of_birth: String(card.baby.date_of_birth || ''),
        country: String(card.baby.country || ''),
      }
    : null,
  generatedAt: card?.generatedAt || new Date().toISOString(),
  allergies: Array.isArray(card?.allergies) ? card.allergies : [],
  medications: Array.isArray(card?.medications) ? card.medications : [],
  latestGrowth: card?.latestGrowth || null,
  vaccines: Array.isArray(card?.vaccines) ? card.vaccines : [],
  doctorContacts: Array.isArray(card?.doctorContacts) ? card.doctorContacts : [],
  allowedSections: normalizeEmergencyShareSections(card?.allowedSections),
});

const serializeEmergencyShareLinkSummary = (linkRow: any, accessLogs: any[] = []) => {
  const status = getEmergencyShareLinkStatus({
    expiresAt: linkRow?.expires_at,
    revokedAt: linkRow?.revoked_at,
    viewCount: Number(linkRow?.view_count || 0),
    maxViews: linkRow?.max_views == null ? null : Number(linkRow.max_views),
  });
  const maxViews = linkRow?.max_views == null ? null : Number(linkRow.max_views);
  const viewCount = Number(linkRow?.view_count || 0);

  return {
    id: String(linkRow?.id || ''),
    tokenPrefix: String(linkRow?.token_prefix || ''),
    presetKey: normalizeEmergencySharePresetKey(linkRow?.preset_key),
    expiresAt: String(linkRow?.expires_at || ''),
    revokedAt: linkRow?.revoked_at ? String(linkRow.revoked_at) : null,
    revokedReason: linkRow?.revoked_reason ? String(linkRow.revoked_reason) : null,
    createdAt: String(linkRow?.created_at || ''),
    ttlMinutes: calculateEmergencyShareTtlMinutes(linkRow?.created_at, linkRow?.expires_at),
    lastAccessedAt: linkRow?.last_accessed_at ? String(linkRow.last_accessed_at) : null,
    lastAccessResult: String(linkRow?.last_access_result || 'pending'),
    viewCount,
    maxViews,
    remainingViews:
      maxViews && maxViews > 0 ? Math.max(0, maxViews - viewCount) : null,
    requiresPin: Boolean(linkRow?.requires_pin),
    allowedSections: normalizeEmergencyShareSections(linkRow?.allowed_sections),
    status,
    accessLogs: accessLogs.map((entry) => ({
      id: String(entry?.id || ''),
      accessedAt: String(entry?.accessed_at || entry?.created_at || ''),
      result: String(entry?.result || 'pending'),
      viewerLabel: entry?.viewer_label ? String(entry.viewer_label) : null,
      requestPath: entry?.request_path ? String(entry.request_path) : null,
      deviceSummary: entry?.device_summary ? String(entry.device_summary) : null,
      countryCode: entry?.country_code ? String(entry.country_code) : null,
      region: entry?.region ? String(entry.region) : null,
      city: entry?.city ? String(entry.city) : null,
      locationSummary: buildEmergencyShareLocationSummary({
        countryCode: entry?.country_code,
        region: entry?.region,
        city: entry?.city,
      }),
      riskLevel: String(entry?.risk_level || 'info'),
      riskReason: entry?.risk_reason ? String(entry.risk_reason) : null,
    })),
  };
};

const findEmergencyShareLinkByToken = async (token: string) => {
  const tokenHash = hashSensitiveValue(token);
  const hashedLookup = await supabase
    .from('emergency_share_links')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (hashedLookup.error) throw hashedLookup.error;
  if (hashedLookup.data) return hashedLookup.data;

  const legacyLookup = await supabase
    .from('emergency_share_links')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (legacyLookup.error) throw legacyLookup.error;
  return legacyLookup.data;
};

const getEmergencyShareIpHash = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const raw =
    String(forwardedValue || req.socket.remoteAddress || '')
      .split(',')[0]
      .trim();

  if (!raw) return null;
  return hashSensitiveValue(raw);
};

const getEmergencyShareHeaderValue = (req: Request, headerName: string): string => {
  const directValue = req.get(headerName);
  if (directValue) {
    return String(directValue).trim();
  }

  const rawValue = req.headers[headerName.toLowerCase()];
  if (Array.isArray(rawValue)) {
    return String(rawValue[0] || '').trim();
  }

  return String(rawValue || '').trim();
};

const getEmergencyShareLocationParts = (req: Request) => {
  const countryCode =
    getEmergencyShareHeaderValue(req, 'x-vercel-ip-country') ||
    getEmergencyShareHeaderValue(req, 'cf-ipcountry') ||
    '';
  const region =
    getEmergencyShareHeaderValue(req, 'x-vercel-ip-country-region') ||
    getEmergencyShareHeaderValue(req, 'x-vercel-ip-region') ||
    '';
  const city = getEmergencyShareHeaderValue(req, 'x-vercel-ip-city') || '';

  return {
    countryCode: countryCode || null,
    region: region || null,
    city: city || null,
  };
};

const getEmergencyShareOwnerSnapshot = async (babyId?: string | null) => {
  if (!babyId) {
    return null;
  }

  const { data, error } = await supabase
    .from('babies')
    .select('id,name,user_id')
    .eq('id', babyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.user_id) {
    return null;
  }

  return {
    babyId: String(data.id || babyId),
    babyName: String(data.name || 'baby'),
    ownerUserId: String(data.user_id),
  };
};

const detectEmergencyShareRisk = async (params: {
  linkRow?: any | null;
  result: EmergencyShareAccessLogResult;
  accessedAt: string;
}): Promise<{ riskLevel: EmergencyShareRiskLevel; riskReason: string | null }> => {
  if (!params.linkRow?.id) {
    return { riskLevel: 'info', riskReason: null };
  }

  const { data: recentLogs, error } = await supabase
    .from('emergency_share_link_access_logs')
    .select('result,accessed_at')
    .eq('link_id', params.linkRow.id)
    .order('accessed_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const accessedAtMs = new Date(params.accessedAt).getTime();
  const entries = (recentLogs || []).map((entry: any) => ({
    result: String(entry?.result || 'pending'),
    accessedAtMs: new Date(entry?.accessed_at || 0).getTime(),
  }));

  const pinFailuresLastTenMinutes =
    entries.filter(
      (entry) =>
        entry.result === 'pin_failed' &&
        Number.isFinite(entry.accessedAtMs) &&
        accessedAtMs - entry.accessedAtMs <= 10 * 60 * 1000,
    ).length + (params.result === 'pin_failed' ? 1 : 0);

  if (pinFailuresLastTenMinutes >= 3) {
    return {
      riskLevel: 'critical',
      riskReason: 'Multiple incorrect PIN attempts detected in the last 10 minutes.',
    };
  }

  const accessAttemptsLastTwoMinutes =
    entries.filter(
      (entry) =>
        Number.isFinite(entry.accessedAtMs) &&
        accessedAtMs - entry.accessedAtMs <= 2 * 60 * 1000,
    ).length + 1;

  if (accessAttemptsLastTwoMinutes >= 5) {
    return {
      riskLevel: 'warning',
      riskReason: 'High share-link activity detected in the last 2 minutes.',
    };
  }

  const previousAccessAtMs = params.linkRow?.last_accessed_at
    ? new Date(params.linkRow.last_accessed_at).getTime()
    : Number.NaN;

  if (
    params.result === 'success' &&
    Number.isFinite(previousAccessAtMs) &&
    accessedAtMs - previousAccessAtMs >= 12 * 60 * 60 * 1000
  ) {
    return {
      riskLevel: 'warning',
      riskReason: 'Link was opened again after more than 12 hours of inactivity.',
    };
  }

  return { riskLevel: 'info', riskReason: null };
};

const validateEmergencySharePin = (pin: string, accessPinHash?: string | null): boolean => {
  if (!pin || !accessPinHash) return false;
  return hashSensitiveValue(pin) === accessPinHash;
};

const logEmergencyShareAccess = async (params: {
  linkRow?: any | null;
  babyId?: string | null;
  result: EmergencyShareAccessLogResult;
  req: Request;
  viewerLabel?: string | null;
  incrementViewCount?: boolean;
  nextViewCount?: number;
}) => {
  const accessedAt = new Date().toISOString();
  const location = getEmergencyShareLocationParts(params.req);
  const deviceSummary = summarizeEmergencyShareUserAgent(params.req.get('user-agent') || null);
  let riskLevel: EmergencyShareRiskLevel = 'info';
  let riskReason: string | null = null;

  if (params.linkRow?.id) {
    try {
      const risk = await detectEmergencyShareRisk({
        linkRow: params.linkRow,
        result: params.result,
        accessedAt,
      });
      riskLevel = risk.riskLevel;
      riskReason = risk.riskReason;
    } catch (error) {
      console.warn('Failed to evaluate emergency share access risk:', error);
    }
  }

  try {
    await supabase.from('emergency_share_link_access_logs').insert({
      link_id: params.linkRow?.id || null,
      baby_id: params.babyId || params.linkRow?.baby_id || null,
      accessed_at: accessedAt,
      result: params.result,
      ip_hash: getEmergencyShareIpHash(params.req),
      user_agent: params.req.get('user-agent') || null,
      device_summary: deviceSummary,
      country_code: location.countryCode,
      region: location.region,
      city: location.city,
      risk_level: riskLevel,
      risk_reason: riskReason,
      viewer_label: params.viewerLabel || null,
      request_path: params.req.originalUrl || params.req.path,
    });
  } catch (error) {
    console.warn('Failed to persist emergency share access log:', error);
  }

  if (!params.linkRow?.id) return;

  const updatePayload: Record<string, unknown> = {
    last_access_result: params.result,
  };

  if (params.incrementViewCount) {
    updatePayload.last_accessed_at = accessedAt;
    updatePayload.view_count = Math.max(0, Number(params.nextViewCount || 0));
  }

  try {
    await supabase
      .from('emergency_share_links')
      .update(updatePayload)
      .eq('id', params.linkRow.id);
  } catch (error) {
    console.warn('Failed to update emergency share link access metadata:', error);
  }

  if (riskLevel !== 'info') {
    try {
      const ownerSnapshot = await getEmergencyShareOwnerSnapshot(
        params.babyId || params.linkRow?.baby_id || null,
      );
      if (ownerSnapshot?.ownerUserId) {
        const viewerText = params.viewerLabel ? ` by ${params.viewerLabel}` : '';
        await supabase.from('scheduled_notifications').insert({
          user_id: ownerSnapshot.ownerUserId,
          baby_id: ownerSnapshot.babyId,
          title: riskLevel === 'critical' ? 'Emergency share alert' : 'Emergency share activity',
          body:
            `${ownerSnapshot.babyName}'s emergency share link had ${riskLevel} activity${viewerText}. ` +
            `${riskReason || 'Review recent access history.'}`,
          data: {
            babyId: ownerSnapshot.babyId,
            deepLink: 'emergency-card',
            type: 'emergency_share_alert',
            riskLevel,
            riskReason,
            result: params.result,
          },
          tag: `emergency-share-risk-${params.linkRow?.id || ownerSnapshot.babyId}`,
          scheduled_for: accessedAt,
          status: 'pending',
        });
      }
    } catch (error) {
      console.warn('Failed to queue emergency share risk notification:', error);
    }
  }
};

const queueEmergencyShareOpenedNotification = async (params: {
  ownerUserId?: string | null;
  babyId: string;
  babyName: string;
  viewerLabel?: string | null;
}) => {
  if (!params.ownerUserId) return;

  try {
    const viewerText = params.viewerLabel ? ` by ${params.viewerLabel}` : '';
    await supabase.from('scheduled_notifications').insert({
      user_id: params.ownerUserId,
      baby_id: params.babyId,
      title: 'Emergency share link opened',
      body: `Your emergency share link for ${params.babyName} was opened${viewerText}.`,
      data: {
        babyId: params.babyId,
        deepLink: 'emergency-card',
        type: 'emergency_share_access',
      },
      tag: 'emergency-share-link-access',
      scheduled_for: new Date().toISOString(),
      status: 'pending',
    });
  } catch (error) {
    console.warn('Failed to queue emergency share notification:', error);
  }
};

const resolvePublicEmergencyShareRequest = async (
  req: Request,
  token: string,
): Promise<
  | {
      ok: true;
      value: {
        linkRow: any;
        card: any;
        emergencyText: string;
        allowedSections: EmergencyShareSection[];
        nextViewCount: number;
      };
    }
  | { ok: false; status: number; error: string; pinRequired?: boolean }
> => {
  const viewerLabel = String(req.query.viewer || req.get('x-viewer-label') || '').trim() || null;
  const sharePin = String(req.query.pin || req.get('x-share-pin') || '').trim();
  const linkRow = await findEmergencyShareLinkByToken(token);

  if (!linkRow) {
    await logEmergencyShareAccess({
      result: 'not_found',
      req,
      viewerLabel,
    });
    return { ok: false, status: 404, error: 'Share link not found' };
  }

  if (linkRow.revoked_at) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'revoked',
      req,
      viewerLabel,
    });
    return { ok: false, status: 410, error: 'Share link has been revoked' };
  }

  const expiresAtMs = new Date(linkRow.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'expired',
      req,
      viewerLabel,
    });
    return { ok: false, status: 410, error: 'Share link has expired' };
  }

  const maxViews = Number(linkRow.max_views);
  const currentViews = Number(linkRow.view_count || 0);
  if (Number.isFinite(maxViews) && maxViews > 0 && currentViews >= maxViews) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'view_limit_reached',
      req,
      viewerLabel,
    });
    return { ok: false, status: 410, error: 'Share link view limit has been reached' };
  }

  if (Boolean(linkRow.requires_pin) && !sharePin) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'pin_required',
      req,
      viewerLabel,
    });
    return { ok: false, status: 401, error: 'Share PIN required', pinRequired: true };
  }

  if (Boolean(linkRow.requires_pin) && !validateEmergencySharePin(sharePin, linkRow.access_pin_hash)) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'pin_failed',
      req,
      viewerLabel,
    });
    return { ok: false, status: 403, error: 'Invalid share PIN', pinRequired: true };
  }

  const baseCard = await buildEmergencyCard(linkRow.baby_id);
  if (!baseCard.baby) {
    await logEmergencyShareAccess({
      linkRow,
      result: 'not_found',
      req,
      viewerLabel,
    });
    return { ok: false, status: 404, error: 'Baby profile not found' };
  }

  const allowedSections = normalizeEmergencyShareSections(linkRow.allowed_sections);
  const card = filterEmergencyCardForSections(baseCard, allowedSections);
  const emergencyText = formatEmergencyCardAsText(card);
  const nextViewCount = currentViews + 1;

  await logEmergencyShareAccess({
    linkRow,
    result: 'success',
    req,
    viewerLabel,
    incrementViewCount: true,
    nextViewCount,
  });

  await queueEmergencyShareOpenedNotification({
    ownerUserId: baseCard.baby?.user_id,
    babyId: linkRow.baby_id,
    babyName: String(baseCard.baby?.name || 'baby'),
    viewerLabel,
  });

  return {
    ok: true,
    value: {
      linkRow,
      card,
      emergencyText,
      allowedSections,
      nextViewCount,
    },
  };
};

const csvValue = (value: unknown): string => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const resolveBabyAccess = async (
  userId: string,
  userEmail: string | undefined,
  babyId: string,
): Promise<BabyAccessResult> => {
  const { data: baby, error: babyError } = await supabase
    .from('babies')
    .select('*')
    .eq('id', babyId)
    .maybeSingle();

  if (babyError || !baby) {
    return { allowed: false, canWrite: false, role: 'none', baby: null };
  }

  if (baby.user_id === userId) {
    return { allowed: true, canWrite: true, role: 'owner', baby };
  }

  const userEmailNormalized = normalizeEmail(userEmail);

  const { data: acceptedByUserInvite } = await supabase
    .from('family_sharing_invites')
    .select('*')
    .eq('baby_id', babyId)
    .eq('accepted_by', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let acceptedByEmailInvite: any = null;
  if (userEmailNormalized) {
    const { data } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .ilike('invited_email', userEmailNormalized)
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    acceptedByEmailInvite = data || null;
  }

  const acceptedInvite = acceptedByUserInvite || acceptedByEmailInvite;

  if (acceptedInvite) {
    const writableRoles = new Set(['owner', 'editor', 'caregiver', 'doctor']);
    return {
      allowed: true,
      canWrite: writableRoles.has(String(acceptedInvite.role || '').toLowerCase()),
      role: 'shared',
      baby,
      sharedRole: acceptedInvite.role,
    };
  }

  const { data: assignment } = await supabase
    .from('doctor_baby_assignments')
    .select('id,status')
    .eq('baby_id', babyId)
    .eq('doctor_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (assignment) {
    return { allowed: true, canWrite: true, role: 'doctor', baby };
  }

  return { allowed: false, canWrite: false, role: 'none', baby: null };
};

const ensureBabyAccess = async (
  req: AuthRequest,
  res: Response,
  babyId: string,
): Promise<BabyAccessResult | null> => {
  const userId = req.user?.id as string | undefined;
  const userEmail = req.user?.email as string | undefined;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return null;
  }

  const access = await resolveBabyAccess(userId, userEmail, babyId);
  if (!access.allowed) {
    res.status(403).json({ success: false, error: 'No access to this baby profile' });
    return null;
  }

  return access;
};

const formatRoleLabel = (value?: string | null): string => {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'owner':
      return 'Owner';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Viewer';
    case 'caregiver':
      return 'Caregiver';
    case 'doctor':
      return 'Doctor';
    default:
      return 'Care team member';
  }
};

const formatApprovalRequestType = (value?: string | null): string => {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'medication_edit':
      return 'medication update';
    case 'medication_schedule_edit':
      return 'medication schedule change';
    case 'medication_log':
      return 'medication log';
    case 'health_record_edit':
      return 'health record change';
    case 'growth_edit':
      return 'growth update';
    case 'vaccination_edit':
      return 'vaccination change';
    case 'profile_edit':
      return 'profile change';
    default:
      return 'care update';
  }
};

const resolveActivityTimestamp = (...values: Array<string | null | undefined>): string => {
  const timestamp = values.find((value) => {
    if (!value) return false;
    return !Number.isNaN(new Date(value).getTime());
  });

  return timestamp || new Date().toISOString();
};

const buildEmergencyShareActivityItem = (entry: any): ActivityCenterEvent => {
  const viewer = String(entry?.viewer_label || '').trim() || 'Someone';
  const occurredAt = resolveActivityTimestamp(entry?.accessed_at, entry?.created_at);
  const result = String(entry?.result || '').trim().toLowerCase() as EmergencyShareAccessLogResult;

  switch (result) {
    case 'success':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'success',
        title: 'Emergency card opened',
        summary: `${viewer} accessed the shared emergency card.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    case 'expired':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'warning',
        title: 'Expired emergency link used',
        summary: `${viewer} tried to open an expired emergency link.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    case 'revoked':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'warning',
        title: 'Revoked emergency link attempted',
        summary: `${viewer} tried to use a revoked emergency link.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    case 'pin_failed':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'warning',
        title: 'Incorrect emergency PIN entered',
        summary: `${viewer} entered the wrong share PIN.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    case 'view_limit_reached':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'warning',
        title: 'Emergency link reached its view limit',
        summary: `${viewer} reached the maximum allowed opens for that link.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    case 'pin_required':
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'info',
        title: 'Emergency link requested a PIN',
        summary: `${viewer} reached a PIN-protected emergency card.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
    default:
      return {
        id: `share-${entry.id}`,
        kind: 'emergency_share_access',
        category: 'sharing',
        tone: 'info',
        title: 'Emergency link activity detected',
        summary: `${viewer} interacted with a shared emergency link.`,
        occurredAt,
        deepLink: 'emergency-card',
        metadata: { result, viewerLabel: entry?.viewer_label || null },
      };
  }
};

const buildApprovalActivityItem = (entry: any): ActivityCenterEvent => {
  const requestType = String(entry?.care_approval_requests?.request_type || '').trim();
  const requestLabel = formatApprovalRequestType(requestType);
  const requestStatus = String(entry?.care_approval_requests?.status || '').trim().toLowerCase();
  const action = String(entry?.action || '').trim().toLowerCase();
  const actorLabel = formatRoleLabel(entry?.actor_role);
  const detailText =
    String(
      entry?.details?.decision_notes ||
        entry?.details?.reason ||
        entry?.details?.note ||
        entry?.details?.message ||
        '',
    ).trim() || null;

  let tone: ActivityCenterTone = 'info';
  let title = 'Care approval updated';

  switch (action) {
    case 'created':
      tone = 'warning';
      title = `Approval requested for ${requestLabel}`;
      break;
    case 'approved':
      tone = 'success';
      title = `${requestLabel} approved`;
      break;
    case 'rejected':
      tone = 'warning';
      title = `${requestLabel} rejected`;
      break;
    case 'cancelled':
      tone = 'info';
      title = `${requestLabel} cancelled`;
      break;
    case 'updated':
      tone = requestStatus === 'pending' ? 'warning' : 'info';
      title = `${requestLabel} updated`;
      break;
    default:
      break;
  }

  return {
    id: `approval-${entry.id}`,
    kind: 'care_approval',
    category: 'care',
    tone,
    title,
    summary: detailText
      ? `${actorLabel}. ${detailText}`
      : `${actorLabel} changed the approval status to ${requestStatus || 'pending'}.`,
    occurredAt: resolveActivityTimestamp(entry?.created_at),
    deepLink: 'health-records',
    metadata: {
      action,
      actorRole: entry?.actor_role || null,
      requestType,
      requestStatus,
    },
  };
};

const buildMedicationActivityItem = (entry: any): ActivityCenterEvent => {
  const doseStatus = String(entry?.dose_status || '').trim().toLowerCase();
  const medicationName = String(entry?.medication_name || 'Medication').trim();
  const title = `${doseStatus === 'skipped' ? 'Dose skipped' : 'Dose missed'}: ${medicationName}`;

  return {
    id: `dose-${entry.id}`,
    kind: 'medication_dose',
    category: 'care',
    tone: doseStatus === 'missed' ? 'warning' : 'info',
    title,
    summary: entry?.notes
      ? String(entry.notes)
      : entry?.approval_required
        ? 'Follow-up may require parent approval.'
        : 'Review the schedule and check in with the care team.',
    occurredAt: resolveActivityTimestamp(entry?.logged_at, entry?.created_at, entry?.planned_for),
    deepLink: 'health-records',
    metadata: {
      doseStatus,
      medicationName,
      plannedFor: entry?.planned_for || null,
      approvalRequired: Boolean(entry?.approval_required),
    },
  };
};

const buildPaymentActivityItem = (entry: any): ActivityCenterEvent => {
  const status = String(entry?.status || '').trim().toLowerCase();
  const recoveryStatus = String(entry?.recovery_status || '').trim().toLowerCase();
  const planName = String(entry?.plan_name || 'Premium plan').trim();
  const occurredAt = resolveActivityTimestamp(
    entry?.last_transition_at,
    entry?.attempted_at,
    entry?.updated_at,
    entry?.created_at,
  );

  if (status === 'failed') {
    return {
      id: `payment-${entry.id}`,
      kind: 'payment',
      category: 'billing',
      tone: 'warning',
      title:
        recoveryStatus === 'retry_scheduled'
          ? 'Billing retry scheduled'
          : 'Payment needs attention',
      summary:
        String(entry?.error_message || '').trim() ||
        `${planName} could not be confirmed. Reference ${String(entry?.reference || '').trim()}.`,
      occurredAt,
      deepLink: 'payment',
      metadata: {
        status,
        recoveryStatus,
        retryCount: Number(entry?.retry_count || 0),
        nextRetryAt: entry?.next_retry_at || null,
        reference: entry?.reference || null,
      },
    };
  }

  if (
    recoveryStatus === 'recovered' ||
    status === 'reconciled' ||
    Boolean(entry?.recovered_at)
  ) {
    return {
      id: `payment-${entry.id}`,
      kind: 'payment',
      category: 'billing',
      tone: 'success',
      title: 'Billing recovered',
      summary: `${planName} is back in good standing.`,
      occurredAt,
      deepLink: 'payment',
      metadata: {
        status,
        recoveryStatus,
        recoveredAt: entry?.recovered_at || null,
        reference: entry?.reference || null,
      },
    };
  }

  return {
    id: `payment-${entry.id}`,
    kind: 'payment',
    category: 'billing',
    tone: status === 'cancelled' ? 'warning' : 'info',
    title: status === 'cancelled' ? 'Subscription payment cancelled' : 'Billing updated',
    summary: `${planName} payment status is ${status || 'updated'}.`,
    occurredAt,
    deepLink: 'payment',
    metadata: {
      status,
      recoveryStatus,
      reference: entry?.reference || null,
    },
  };
};

const buildFamilyInviteActivityItems = (entries: any[]): ActivityCenterEvent[] =>
  entries.map((entry) => {
    const accepted = Boolean(entry?.accepted_at);
    const roleLabel = formatRoleLabel(entry?.role);
    const email = String(entry?.invited_email || 'A family member').trim();

    return {
      id: `invite-${entry.id}`,
      kind: 'family_invite',
      category: 'sharing',
      tone: accepted ? 'success' : 'info',
      title: accepted ? `${roleLabel} joined the care team` : 'Care invite sent',
      summary: accepted
        ? `${email} accepted access as ${roleLabel}.`
        : `${email} was invited as ${roleLabel}.`,
      occurredAt: resolveActivityTimestamp(entry?.accepted_at, entry?.created_at),
      deepLink: 'family-sharing',
      metadata: {
        role: entry?.role || null,
        invitedEmail: entry?.invited_email || null,
        accepted,
      },
    };
  });

const buildEmergencyCard = async (babyId: string) => {
  const [babyResult, allergiesResult, medicationsResult, growthResult, vaccineResult, doctorContactsResult] =
    await Promise.all([
      supabase
        .from('babies')
        .select('id,name,date_of_birth,country,user_id')
        .eq('id', babyId)
        .maybeSingle(),
      supabase
        .from('allergies')
        .select('allergen,severity,reaction_description,discovered_date')
        .eq('baby_id', babyId)
        .order('discovered_date', { ascending: false }),
      supabase
        .from('medications')
        .select('medication_name,dosage,frequency,status,start_date,end_date')
        .eq('baby_id', babyId)
        .in('status', ['active', 'completed'])
        .order('start_date', { ascending: false }),
      supabase
        .from('growth_measurements')
        .select('date,weight,height,head_circumference')
        .eq('baby_id', babyId)
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('vaccination_records')
        .select('vaccine_name,status,due_date')
        .eq('baby_id', babyId)
        .in('status', ['overdue', 'scheduled'])
        .order('due_date', { ascending: true })
        .limit(10),
      supabase
        .from('pediatrician_contacts')
        .select('name,clinic_name,phone,email,specialty,is_primary')
        .eq('baby_id', babyId)
        .order('is_primary', { ascending: false }),
    ]);

  const baby = babyResult.data;
  const allergies = allergiesResult.data || [];
  const medications = medicationsResult.data || [];
  const growth = growthResult.data?.[0] || null;
  const vaccines = vaccineResult.data || [];
  const doctorContacts = doctorContactsResult.data || [];

  return {
    baby,
    generatedAt: new Date().toISOString(),
    allergies,
    medications,
    latestGrowth: growth,
    vaccines,
    doctorContacts,
  };
};

const formatEmergencyCardAsText = (card: any): string => {
  const lines: string[] = [];

  lines.push(`Emergency Share Card - ${resolveEmergencyShareDisplayName(card?.baby?.name, card?.allowedSections)}`);
  lines.push(`Generated: ${new Date(card.generatedAt).toLocaleString()}`);
  lines.push('');
  lines.push(`Date of birth: ${card?.baby?.date_of_birth || 'Unknown'}`);
  lines.push(`Country: ${card?.baby?.country || 'Unknown'}`);
  lines.push('');

  lines.push('Allergies:');
  if (!card.allergies.length) {
    lines.push('- None recorded');
  } else {
    for (const entry of card.allergies) {
      lines.push(`- ${entry.allergen} (${entry.severity})`);
    }
  }
  lines.push('');

  lines.push('Active medications:');
  if (!card.medications.length) {
    lines.push('- None recorded');
  } else {
    for (const entry of card.medications) {
      lines.push(
        `- ${entry.medication_name}${entry.dosage ? ` ${entry.dosage}` : ''}${
          entry.frequency ? ` (${entry.frequency})` : ''
        }`,
      );
    }
  }
  lines.push('');

  lines.push('Recent vitals:');
  if (!card.latestGrowth) {
    lines.push('- No recent growth/vitals recorded');
  } else {
    lines.push(`- ${formatEmergencyGrowthSummary(card.latestGrowth)}`);
  }
  lines.push('');

  lines.push('Vaccines to review:');
  if (!card.vaccines.length) {
    lines.push('- None flagged');
  } else {
    for (const vax of card.vaccines) {
      lines.push(`- ${vax.vaccine_name} (${vax.status}) due ${vax.due_date || '-'}`);
    }
  }
  lines.push('');

  lines.push('Doctor / Clinic contacts:');
  if (!card.doctorContacts.length) {
    lines.push('- None recorded');
  } else {
    for (const contact of card.doctorContacts) {
      lines.push(
        `- ${contact.name}${contact.specialty ? ` (${contact.specialty})` : ''}${
          contact.clinic_name ? ` | ${contact.clinic_name}` : ''
        }${contact.phone ? ` | ${contact.phone}` : ''}${contact.email ? ` | ${contact.email}` : ''}`,
      );
    }
  }
  lines.push('');
  lines.push('Medical disclaimer: This summary does not replace emergency or professional medical judgment.');

  return lines.join('\n');
};

router.get('/medications/:babyId/schedules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('baby_id', babyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [], accessRole: access.role });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load medication schedules' });
  }
});

router.post('/medications/schedules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      id,
      babyId,
      medicationId,
      medicationName,
      dosage,
      route,
      frequency,
      intervalHours,
      dosesPerDay,
      reminderTimes,
      instructions,
      startDate,
      endDate,
      stockQuantity,
      stockUnit,
      refillThreshold,
      lastRefillAt,
      nextRefillDueDate,
      requiresConfirmation,
      status,
    } = req.body || {};

    if (!babyId || !String(medicationName || '').trim()) {
      return res.status(400).json({ success: false, error: 'babyId and medicationName are required' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId));
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'You do not have write permission for this baby' });
    }

    const payload = {
      baby_id: String(babyId),
      medication_id: medicationId || null,
      medication_name: String(medicationName).trim(),
      dosage: dosage || null,
      route: route || null,
      frequency: frequency || null,
      interval_hours: intervalHours ?? null,
      doses_per_day: dosesPerDay ?? null,
      reminder_times: Array.isArray(reminderTimes) ? reminderTimes : [],
      instructions: instructions || null,
      start_date: startDate || null,
      end_date: endDate || null,
      stock_quantity: stockQuantity ?? null,
      stock_unit: stockUnit || null,
      refill_threshold: refillThreshold ?? 0,
      last_refill_at: lastRefillAt || null,
      next_refill_due_date: nextRefillDueDate || null,
      requires_confirmation: Boolean(requiresConfirmation),
      status: status || 'active',
      created_by: userId,
    };

    if (access.role !== 'owner') {
      const profileType = getUserProfileType(req.user);
      const { data: request, error: requestError } = await supabase
        .from('care_approval_requests')
        .insert({
          baby_id: String(babyId),
          request_type: 'medication_schedule_edit',
          target_table: 'medication_schedules',
          target_record_id: id || null,
          requested_payload: {
            ...payload,
            operation: id ? 'update' : 'create',
          },
          reason: 'Care team requested medication schedule change',
          requested_by: userId,
          requested_by_role: profileType,
          status: 'pending',
        })
        .select('*')
        .single();

      if (requestError) throw requestError;
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        approvalRequest: request,
        message: 'Schedule update submitted for parent approval',
      });
    }

    if (id) {
      const { data, error } = await supabase
        .from('medication_schedules')
        .update(payload)
        .eq('id', id)
        .eq('baby_id', String(babyId))
        .select('*')
        .single();

      if (error) throw error;
      return res.json({ success: true, data, mode: 'updated' });
    }

    const { data, error } = await supabase
      .from('medication_schedules')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data, mode: 'created' });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: error?.message || 'Failed to save medication schedule' });
  }
});

router.post('/medications/:scheduleId/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    const userEmail = req.user?.email as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { scheduleId } = req.params;
    const {
      plannedFor,
      doseStatus = 'taken',
      quantityUsed,
      notes,
      caregiverConfirmed,
      forceApproval,
    } = req.body || {};

    const { data: schedule, error: scheduleError } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return res.status(404).json({ success: false, error: 'Medication schedule not found' });
    }

    const access = await resolveBabyAccess(userId, userEmail, schedule.baby_id);
    if (!access.allowed) {
      return res.status(403).json({ success: false, error: 'No access to this schedule' });
    }

    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required' });
    }

    const normalizedDoseStatus =
      doseStatus === 'missed' || doseStatus === 'skipped' ? doseStatus : 'taken';
    const parsedQuantity = Number.isFinite(Number(quantityUsed)) ? Number(quantityUsed) : null;

    const shouldRequireApproval =
      Boolean(forceApproval) || (Boolean(schedule.requires_confirmation) && access.role !== 'owner');

    const logPayload = {
      schedule_id: scheduleId,
      baby_id: schedule.baby_id,
      medication_name: schedule.medication_name,
      planned_for: plannedFor || null,
      dose_status: normalizedDoseStatus,
      quantity_used: parsedQuantity,
      notes: notes || null,
      logged_by: userId,
      caregiver_confirmed_by: caregiverConfirmed ? userId : null,
      caregiver_confirmed_at: caregiverConfirmed ? new Date().toISOString() : null,
      approval_required: shouldRequireApproval,
    };

    const { data: createdLog, error: logError } = await supabase
      .from('medication_dose_logs')
      .insert(logPayload)
      .select('*')
      .single();

    if (logError) throw logError;

    if (parsedQuantity !== null && parsedQuantity > 0 && schedule.stock_quantity !== null) {
      const updatedStock = Math.max(Number(schedule.stock_quantity) - parsedQuantity, 0);
      const threshold = Number(schedule.refill_threshold || 0);
      const nextRefillDueDate = updatedStock <= threshold ? new Date().toISOString().slice(0, 10) : null;

      await supabase
        .from('medication_schedules')
        .update({
          stock_quantity: updatedStock,
          next_refill_due_date: nextRefillDueDate,
        })
        .eq('id', scheduleId);
    }

    let approvalRequest: any = null;
    if (shouldRequireApproval) {
      const profileType = getUserProfileType(req.user);
      const { data: request, error: requestError } = await supabase
        .from('care_approval_requests')
        .insert({
          baby_id: schedule.baby_id,
          request_type: 'medication_log',
          target_table: 'medication_dose_logs',
          target_record_id: createdLog.id,
          requested_payload: {
            schedule_id: scheduleId,
            medication_name: schedule.medication_name,
            dose_status: normalizedDoseStatus,
            quantity_used: parsedQuantity,
            notes: notes || null,
            planned_for: plannedFor || null,
          },
          reason:
            profileType === 'doctor' || profileType === 'caregiver'
              ? 'Dose requires parent approval'
              : 'Manual approval requested',
          requested_by: userId,
          requested_by_role: profileType,
          status: 'pending',
        })
        .select('*')
        .single();

      if (requestError) {
        return res.status(500).json({
          success: false,
          error: requestError.message || 'Dose saved but approval request failed',
          data: createdLog,
        });
      }

      approvalRequest = request;
      await supabase
        .from('medication_dose_logs')
        .update({ approval_request_id: request.id })
        .eq('id', createdLog.id);
    }

    return res.json({
      success: true,
      data: createdLog,
      approvalRequest,
      requiresApproval: shouldRequireApproval,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to log medication dose' });
  }
});

router.get('/medications/:babyId/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)));

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_dose_logs')
      .select(
        `
        *,
        medication_schedules (
          id,
          medication_name,
          dosage,
          frequency,
          stock_quantity,
          refill_threshold,
          stock_unit
        )
      `,
      )
      .eq('baby_id', babyId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load dose logs' });
  }
});

router.get('/medications/:babyId/refill-alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'active');

    if (error) throw error;

    const alerts = (data || [])
      .map((schedule: any) => {
        const stockQuantity = schedule.stock_quantity === null ? null : Number(schedule.stock_quantity);
        const threshold = Number(schedule.refill_threshold || 0);
        const isLowStock = stockQuantity !== null && stockQuantity <= threshold;
        const dueByDate =
          schedule.next_refill_due_date && new Date(schedule.next_refill_due_date).getTime() <= Date.now();
        const shouldAlert = isLowStock || dueByDate;

        return {
          scheduleId: schedule.id,
          medicationName: schedule.medication_name,
          stockQuantity,
          stockUnit: schedule.stock_unit,
          refillThreshold: threshold,
          nextRefillDueDate: schedule.next_refill_due_date,
          shouldAlert,
          reason: isLowStock ? 'low_stock' : dueByDate ? 'refill_due' : null,
        };
      })
      .filter((item) => item.shouldAlert);

    return res.json({ success: true, data: alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load refill alerts' });
  }
});

router.post('/approvals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      babyId,
      requestType = 'other',
      targetTable,
      targetRecordId,
      requestedPayload,
      reason,
    } = req.body || {};

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId));
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required' });
    }

    const profileType = getUserProfileType(req.user);
    const { data, error } = await supabase
      .from('care_approval_requests')
      .insert({
        baby_id: String(babyId),
        request_type: requestType,
        target_table: targetTable || null,
        target_record_id: targetRecordId || null,
        requested_payload: requestedPayload || {},
        reason: reason || null,
        requested_by: userId,
        requested_by_role: profileType,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create approval request' });
  }
});

router.get('/approvals/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const status = String(req.query.status || 'all').toLowerCase();

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    let query = supabase
      .from('care_approval_requests')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [], canDecide: access.role === 'owner' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load approvals' });
  }
});

router.get('/approvals/:babyId/timeline', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const limit = Math.max(1, Math.min(400, Number(req.query.limit || 150)));

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('care_approval_audit_logs')
      .select(
        `
        id,
        approval_request_id,
        action,
        actor_id,
        actor_role,
        details,
        created_at,
        care_approval_requests!inner (
          id,
          baby_id,
          request_type,
          status
        )
      `,
      )
      .eq('care_approval_requests.baby_id', babyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json({
      success: true,
      data: (data || []).map((entry: any) => ({
        id: entry.id,
        approvalRequestId: entry.approval_request_id,
        action: entry.action,
        actorId: entry.actor_id,
        actorRole: entry.actor_role,
        details: entry.details || {},
        createdAt: entry.created_at,
        requestType: entry.care_approval_requests?.request_type || null,
        requestStatus: entry.care_approval_requests?.status || null,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load approval timeline' });
  }
});

router.get('/activity-feed/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const limit = Math.max(1, Math.min(80, Number(req.query.limit || 40)));

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const userId = String(req.user?.id || '').trim();
    const isOwner = access.role === 'owner';
    const perSourceLimit = Math.max(8, Math.min(20, limit));

    const fetchRows = async (label: string, operation: any): Promise<any[]> => {
      const { data, error } = await operation;
      if (error) {
        console.warn(`Activity feed lookup failed for ${label}:`, error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    };

    const [
      emergencyShareLogs,
      approvalAuditLogs,
      medicationDoseLogs,
      familyInvites,
      paymentEvents,
    ] = await Promise.all([
      fetchRows(
        'emergency share logs',
        supabase
          .from('emergency_share_link_access_logs')
          .select('id,result,viewer_label,accessed_at,request_path,created_at')
          .eq('baby_id', babyId)
          .order('accessed_at', { ascending: false })
          .limit(perSourceLimit),
      ),
      fetchRows(
        'approval audit logs',
        supabase
          .from('care_approval_audit_logs')
          .select(
            `
            id,
            approval_request_id,
            action,
            actor_id,
            actor_role,
            details,
            created_at,
            care_approval_requests!inner (
              id,
              baby_id,
              request_type,
              status
            )
          `,
          )
          .eq('care_approval_requests.baby_id', babyId)
          .order('created_at', { ascending: false })
          .limit(perSourceLimit),
      ),
      fetchRows(
        'medication dose logs',
        supabase
          .from('medication_dose_logs')
          .select(
            'id,medication_name,planned_for,logged_at,dose_status,notes,approval_required,created_at',
          )
          .eq('baby_id', babyId)
          .in('dose_status', ['missed', 'skipped'])
          .order('logged_at', { ascending: false })
          .limit(perSourceLimit),
      ),
      isOwner
        ? fetchRows(
            'family invites',
            supabase
              .from('family_sharing_invites')
              .select('id,invited_email,role,accepted_at,created_at')
              .eq('baby_id', babyId)
              .order('created_at', { ascending: false })
              .limit(Math.min(perSourceLimit, 12)),
          )
        : Promise.resolve([]),
      isOwner && userId
        ? fetchRows(
            'payment events',
            supabase
              .from('payment_events')
              .select(
                'id,reference,provider,status,plan_name,error_message,retry_count,recovery_status,next_retry_at,recovered_at,attempted_at,last_transition_at,updated_at,created_at',
              )
              .eq('user_id', userId)
              .order('attempted_at', { ascending: false })
              .limit(Math.max(perSourceLimit, 20)),
          )
        : Promise.resolve([]),
    ]);

    const activityItems: ActivityCenterEvent[] = [
      ...emergencyShareLogs.map(buildEmergencyShareActivityItem),
      ...approvalAuditLogs.map(buildApprovalActivityItem),
      ...medicationDoseLogs.map(buildMedicationActivityItem),
      ...buildFamilyInviteActivityItems(familyInvites),
      ...paymentEvents
        .filter((entry) => {
          const status = String(entry?.status || '').trim().toLowerCase();
          const recoveryStatus = String(entry?.recovery_status || '').trim().toLowerCase();
          return (
            status === 'failed' ||
            status === 'reconciled' ||
            status === 'cancelled' ||
            recoveryStatus === 'recovered' ||
            recoveryStatus === 'retry_scheduled' ||
            recoveryStatus === 'retrying' ||
            Number(entry?.retry_count || 0) > 0
          );
        })
        .map(buildPaymentActivityItem),
    ]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
      )
      .slice(0, limit);

    const summary = {
      total: activityItems.length,
      urgent: activityItems.filter(
        (item) => item.tone === 'warning' || item.tone === 'critical',
      ).length,
      actionRequired: activityItems.filter((item) => {
        if (item.tone === 'critical') return true;
        if (item.kind === 'care_approval') {
          return String(item.metadata?.requestStatus || '').trim().toLowerCase() === 'pending';
        }
        if (item.kind === 'medication_dose') {
          return String(item.metadata?.doseStatus || '').trim().toLowerCase() === 'missed';
        }
        if (item.kind === 'payment') {
          const status = String(item.metadata?.status || '').trim().toLowerCase();
          const recoveryStatus = String(item.metadata?.recoveryStatus || '')
            .trim()
            .toLowerCase();
          return (
            status === 'failed' ||
            recoveryStatus === 'retry_scheduled' ||
            recoveryStatus === 'retrying' ||
            recoveryStatus === 'eligible'
          );
        }
        return false;
      }).length,
      care: activityItems.filter((item) => item.category === 'care').length,
      sharing: activityItems.filter((item) => item.category === 'sharing').length,
      billing: activityItems.filter((item) => item.category === 'billing').length,
    };

    return res.json({
      success: true,
      data: {
        babyId,
        babyName: access.baby?.name || null,
        role: access.role === 'shared' ? access.sharedRole || 'shared' : access.role,
        generatedAt: new Date().toISOString(),
        summary,
        items: activityItems,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load activity feed',
    });
  }
});

router.post('/approvals/:approvalId/decision', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { approvalId } = req.params;
    const { decision, notes } = req.body || {};
    const status = String(decision || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'decision must be approved, rejected, or cancelled' });
    }

    const { data: request, error: requestError } = await supabase
      .from('care_approval_requests')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ success: false, error: 'Approval request not found' });
    }

    const access = await ensureBabyAccess(req, res, request.baby_id);
    if (!access) return;

    const isRequester = request.requested_by === userId;
    const isOwner = access.role === 'owner';
    if (!isOwner && !(isRequester && status === 'cancelled')) {
      return res.status(403).json({ success: false, error: 'Only parent owner can approve/reject this request' });
    }

    const { data, error } = await supabase
      .from('care_approval_requests')
      .update({
        status,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_notes: notes || null,
      })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (error) throw error;

    if (request.target_table === 'medication_dose_logs' && request.target_record_id) {
      await supabase
        .from('medication_dose_logs')
        .update({
          approval_required: status === 'approved' ? false : true,
          caregiver_confirmed_by: status === 'approved' ? userId : null,
          caregiver_confirmed_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', request.target_record_id);
    }

    if (
      status === 'approved' &&
      request.target_table === 'medication_schedules' &&
      request.requested_payload
    ) {
      const payload = request.requested_payload as Record<string, any>;
      const targetRecordId = request.target_record_id || payload.id || null;

      const schedulePayload = {
        baby_id: payload.baby_id || request.baby_id,
        medication_id: payload.medication_id || null,
        medication_name: payload.medication_name || null,
        dosage: payload.dosage || null,
        route: payload.route || null,
        frequency: payload.frequency || null,
        interval_hours: payload.interval_hours ?? null,
        doses_per_day: payload.doses_per_day ?? null,
        reminder_times: Array.isArray(payload.reminder_times) ? payload.reminder_times : [],
        instructions: payload.instructions || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        stock_quantity: payload.stock_quantity ?? null,
        stock_unit: payload.stock_unit || null,
        refill_threshold: payload.refill_threshold ?? 0,
        last_refill_at: payload.last_refill_at || null,
        next_refill_due_date: payload.next_refill_due_date || null,
        requires_confirmation: Boolean(payload.requires_confirmation),
        status: payload.status || 'active',
        created_by: payload.created_by || request.requested_by,
      };

      if (targetRecordId) {
        const { error: upsertError } = await supabase
          .from('medication_schedules')
          .upsert({ ...schedulePayload, id: targetRecordId }, { onConflict: 'id' });
        if (upsertError) throw upsertError;
      } else {
        const { error: insertError } = await supabase.from('medication_schedules').insert(schedulePayload);
        if (insertError) throw insertError;
      }
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to process decision' });
  }
});

type ClinicQueueFilters = {
  search: string;
  pendingOnly: boolean;
  overdueOnly: boolean;
  sortBy: string;
};

const getClinicPatientQueueData = async (doctorId: string, filters: ClinicQueueFilters) => {
  const [assignmentsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('doctor_baby_assignments')
      .select('id,baby_id,parent_id,status,start_date,notes,babies(name,date_of_birth,country,photo_url)')
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .order('start_date', { ascending: false }),
    supabase
      .from('appointment_reminders')
      .select('id,baby_id,scheduled_date,scheduled_time,appointment_type,status')
      .eq('doctor_id', doctorId)
      .in('status', ['pending', 'reminded'])
      .order('scheduled_date', { ascending: true })
      .limit(200),
  ]);

  if (assignmentsResult.error) throw assignmentsResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  const assignments = assignmentsResult.data || [];
  const babyIds = assignments.map((item: any) => item.baby_id).filter(Boolean);

  if (!babyIds.length) {
    return {
      queue: [],
      alertInbox: [],
      stats: { totalPatients: 0, filteredPatients: 0, pendingApprovals: 0, overdueVaccines: 0 },
    };
  }

  const [approvalsResult, overdueVaccinesResult] = await Promise.all([
    supabase
      .from('care_approval_requests')
      .select('id,baby_id,status,request_type,created_at,reason')
      .in('baby_id', babyIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('vaccination_records')
      .select('id,baby_id,vaccine_name,due_date,status')
      .in('baby_id', babyIds)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(400),
  ]);

  if (approvalsResult.error) throw approvalsResult.error;
  if (overdueVaccinesResult.error) throw overdueVaccinesResult.error;

  const appointmentsByBaby = new Map<string, any[]>();
  for (const appointment of appointmentsResult.data || []) {
    if (!appointmentsByBaby.has(appointment.baby_id)) {
      appointmentsByBaby.set(appointment.baby_id, []);
    }
    appointmentsByBaby.get(appointment.baby_id)?.push(appointment);
  }

  const approvalsByBaby = new Map<string, any[]>();
  for (const item of approvalsResult.data || []) {
    if (!approvalsByBaby.has(item.baby_id)) {
      approvalsByBaby.set(item.baby_id, []);
    }
    approvalsByBaby.get(item.baby_id)?.push(item);
  }

  const overdueByBaby = new Map<string, any[]>();
  for (const item of overdueVaccinesResult.data || []) {
    if (!overdueByBaby.has(item.baby_id)) {
      overdueByBaby.set(item.baby_id, []);
    }
    overdueByBaby.get(item.baby_id)?.push(item);
  }

  const rawQueue = assignments.map((assignment: any) => {
    const nextAppointment = (appointmentsByBaby.get(assignment.baby_id) || [])[0] || null;
    const pendingApprovals = approvalsByBaby.get(assignment.baby_id) || [];
    const overdueVaccines = overdueByBaby.get(assignment.baby_id) || [];

    return {
      assignmentId: assignment.id,
      babyId: assignment.baby_id,
      babyName: assignment.babies?.name || `Baby ${String(assignment.baby_id).slice(0, 8)}`,
      babyPhotoUrl: assignment.babies?.photo_url || null,
      country: assignment.babies?.country || 'US',
      dateOfBirth: assignment.babies?.date_of_birth || null,
      nextAppointment,
      pendingApprovalsCount: pendingApprovals.length,
      overdueVaccinesCount: overdueVaccines.length,
      status: assignment.status,
    };
  });

  let queue = rawQueue;
  if (filters.search) {
    queue = queue.filter((item) => item.babyName.toLowerCase().includes(filters.search));
  }
  if (filters.pendingOnly) {
    queue = queue.filter((item) => item.pendingApprovalsCount > 0);
  }
  if (filters.overdueOnly) {
    queue = queue.filter((item) => item.overdueVaccinesCount > 0);
  }

  if (filters.sortBy === 'appointments') {
    queue = [...queue].sort((a, b) => {
      const aTs = a.nextAppointment?.scheduled_date
        ? new Date(`${a.nextAppointment.scheduled_date}T${a.nextAppointment.scheduled_time || '00:00'}`).getTime()
        : Number.POSITIVE_INFINITY;
      const bTs = b.nextAppointment?.scheduled_date
        ? new Date(`${b.nextAppointment.scheduled_date}T${b.nextAppointment.scheduled_time || '00:00'}`).getTime()
        : Number.POSITIVE_INFINITY;
      return aTs - bTs;
    });
  } else {
    queue = [...queue].sort((a, b) => {
      const priorityA = a.pendingApprovalsCount * 3 + a.overdueVaccinesCount * 2;
      const priorityB = b.pendingApprovalsCount * 3 + b.overdueVaccinesCount * 2;
      if (priorityA === priorityB) {
        return a.babyName.localeCompare(b.babyName);
      }
      return priorityB - priorityA;
    });
  }

  const alertInbox = [
    ...(approvalsResult.data || []).map((item: any) => ({
      type: 'approval',
      id: item.id,
      babyId: item.baby_id,
      createdAt: item.created_at,
      title: `Approval required: ${item.request_type}`,
      message: item.reason || 'A care team change is waiting for parent decision.',
    })),
    ...(overdueVaccinesResult.data || []).slice(0, 50).map((item: any) => ({
      type: 'vaccine',
      id: item.id,
      babyId: item.baby_id,
      createdAt: item.due_date,
      title: `Overdue vaccine: ${item.vaccine_name}`,
      message: `Due date ${item.due_date}`,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    queue,
    alertInbox,
    stats: {
      totalPatients: rawQueue.length,
      filteredPatients: queue.length,
      pendingApprovals: (approvalsResult.data || []).length,
      overdueVaccines: (overdueVaccinesResult.data || []).length,
    },
  };
};

router.get('/clinic/patient-queue', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const filters: ClinicQueueFilters = {
      search: String(req.query.search || '').trim().toLowerCase(),
      pendingOnly: String(req.query.pendingOnly || 'false') === 'true',
      overdueOnly: String(req.query.overdueOnly || 'false') === 'true',
      sortBy: String(req.query.sortBy || 'priority').toLowerCase(),
    };

    const data = await getClinicPatientQueueData(doctorId, filters);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load clinic panel data' });
  }
});

router.get('/clinic/patient-queue/export', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const filters: ClinicQueueFilters = {
      search: String(req.query.search || '').trim().toLowerCase(),
      pendingOnly: String(req.query.pendingOnly || 'false') === 'true',
      overdueOnly: String(req.query.overdueOnly || 'false') === 'true',
      sortBy: String(req.query.sortBy || 'priority').toLowerCase(),
    };
    const data = await getClinicPatientQueueData(doctorId, filters);
    const queue = data.queue || [];
    const headers = [
      'Baby Name',
      'Country',
      'Date of Birth',
      'Pending Approvals',
      'Overdue Vaccines',
      'Next Appointment Date',
      'Next Appointment Time',
      'Status',
    ];

    const lines = [
      headers.map(csvValue).join(','),
      ...queue.map((entry: any) =>
        [
          entry.babyName,
          entry.country,
          entry.dateOfBirth,
          entry.pendingApprovalsCount,
          entry.overdueVaccinesCount,
          entry.nextAppointment?.scheduled_date || '',
          entry.nextAppointment?.scheduled_time || '',
          entry.status,
        ]
          .map(csvValue)
          .join(','),
      ),
    ];

    const filename = `clinic-patient-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(lines.join('\n'));
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to export patient queue' });
  }
});

router.get('/clinic/report-templates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('clinic_report_templates')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load templates' });
  }
});

router.post('/clinic/report-templates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      id,
      name,
      reportType = 'health_summary',
      includeData = ['sleep', 'feeding', 'diaper', 'growth', 'vaccinations', 'health'],
      promptNotes,
      isDefault = false,
    } = req.body || {};

    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }

    const payload = {
      doctor_id: doctorId,
      name: String(name).trim(),
      report_type: String(reportType || 'health_summary'),
      include_data: Array.isArray(includeData) ? includeData : [],
      prompt_notes: promptNotes || null,
      is_default: Boolean(isDefault),
    };

    if (id) {
      const { data, error } = await supabase
        .from('clinic_report_templates')
        .update(payload)
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('*')
        .single();

      if (error) throw error;
      return res.json({ success: true, data, mode: 'updated' });
    }

    const { data, error } = await supabase
      .from('clinic_report_templates')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data, mode: 'created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to save template' });
  }
});

router.delete('/clinic/report-templates/:templateId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { templateId } = req.params;
    const { error } = await supabase
      .from('clinic_report_templates')
      .delete()
      .eq('id', templateId)
      .eq('doctor_id', doctorId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to delete template' });
  }
});

router.get('/emergency-card/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const card = await buildEmergencyCard(babyId);
    if (!card.baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    const responseCard = serializeEmergencyCard(
      filterEmergencyCardForSections(card, [...EMERGENCY_SHARE_ALLOWED_SECTIONS]),
    );
    const text = formatEmergencyCardAsText(responseCard);
    const qrCodeDataUrl = await QRCode.toDataURL(text);

    return res.json({
      success: true,
      data: {
        ...responseCard,
        text,
        qrCodeDataUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to build emergency card' });
  }
});

router.get('/emergency-card/:babyId/share-links', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required for share links' });
    }

    const { data: links, error: linksError } = await supabase
      .from('emergency_share_links')
      .select(
        'id,token_prefix,preset_key,expires_at,revoked_at,revoked_reason,created_at,last_accessed_at,last_access_result,view_count,max_views,requires_pin,allowed_sections',
      )
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (linksError) throw linksError;

    const linkIds = (links || []).map((entry: any) => String(entry.id || '')).filter(Boolean);
    const accessLogsByLink = new Map<string, any[]>();

    if (linkIds.length > 0) {
      const { data: accessLogs, error: accessLogsError } = await supabase
        .from('emergency_share_link_access_logs')
        .select(
          'id,link_id,accessed_at,result,viewer_label,request_path,created_at,device_summary,country_code,region,city,risk_level,risk_reason',
        )
        .in('link_id', linkIds)
        .order('accessed_at', { ascending: false })
        .limit(200);

      if (accessLogsError) throw accessLogsError;

      for (const entry of accessLogs || []) {
        const key = String(entry.link_id || '');
        if (!key) continue;
        const existing = accessLogsByLink.get(key) || [];
        if (existing.length >= 5) continue;
        existing.push(entry);
        accessLogsByLink.set(key, existing);
      }
    }

    return res.json({
      success: true,
      data: (links || []).map((entry: any) =>
        serializeEmergencyShareLinkSummary(entry, accessLogsByLink.get(String(entry.id || '')) || []),
      ),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load share links' });
  }
});

router.post('/emergency-card/:babyId/share-link', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required for share links' });
    }

    const requestBody = req.body || {};
    const presetKey = normalizeEmergencySharePresetKey(requestBody?.presetKey);
    const preset = EMERGENCY_SHARE_PRESETS[presetKey];
    const hasCustomTtl = Number.isFinite(Number(requestBody?.ttlMinutes));
    const ttlMinutes = Math.max(
      5,
      Math.min(
        7 * 24 * 60,
        Number(hasCustomTtl ? requestBody?.ttlMinutes : preset.ttlMinutes || 60),
      ),
    );
    const hasExplicitMaxViews = Object.prototype.hasOwnProperty.call(requestBody, 'maxViews');
    const requestedMaxViews = hasExplicitMaxViews
      ? Number(requestBody?.maxViews)
      : Number(preset.maxViews);
    const maxViews =
      Number.isFinite(requestedMaxViews) && requestedMaxViews > 0 ? Math.floor(requestedMaxViews) : null;
    const requiresPin = Object.prototype.hasOwnProperty.call(requestBody, 'requiresPin')
      ? Boolean(requestBody?.requiresPin)
      : Boolean(preset.requiresPin);
    const accessPin = String(req.body?.accessPin || '').trim();
    const allowedSections = Array.isArray(requestBody?.allowedSections)
      ? normalizeEmergencyShareSections(requestBody.allowedSections)
      : normalizeEmergencyShareSections(preset.allowedSections);

    if (requiresPin && !/^\d{4,8}$/.test(accessPin)) {
      return res.status(400).json({
        success: false,
        error: 'Share PIN must be 4 to 8 digits',
      });
    }

    const token = createEmergencyShareToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('emergency_share_links').insert({
      baby_id: babyId,
      created_by: userId,
      token: null,
      token_hash: hashSensitiveValue(token),
      token_prefix: token.slice(0, 8),
      preset_key: presetKey,
      expires_at: expiresAt,
      max_views: maxViews,
      requires_pin: requiresPin,
      access_pin_hash: requiresPin ? hashSensitiveValue(accessPin) : null,
      allowed_sections: allowedSections,
      view_count: 0,
      last_access_result: 'pending',
    });
    if (insertError) throw insertError;

    const baseUrl = buildClientBaseUrl(req);
    const shareUrl = `${baseUrl}/emergency-card/${token}`;
    const apiUrl = `${baseUrl}/api/care/public/emergency-card/${token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(shareUrl);

    return res.json({
      success: true,
      data: {
        token,
        shareUrl,
        apiUrl,
        qrCodeDataUrl,
        expiresAt,
        ttlMinutes,
        presetKey,
        maxViews,
        viewCount: 0,
        remainingViews: maxViews,
        requiresPin,
        allowedSections,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create share link' });
  }
});

router.post('/emergency-card/:babyId/share-links/:linkId/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, linkId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required for share links' });
    }

    const { data: existingLink, error: existingLinkError } = await supabase
      .from('emergency_share_links')
      .select(
        'id,token_prefix,preset_key,expires_at,revoked_at,revoked_reason,created_at,last_accessed_at,last_access_result,view_count,max_views,requires_pin,allowed_sections',
      )
      .eq('id', linkId)
      .eq('baby_id', babyId)
      .maybeSingle();

    if (existingLinkError) throw existingLinkError;
    if (!existingLink) {
      return res.status(404).json({ success: false, error: 'Share link not found' });
    }

    const revokeReason = String(req.body?.reason || existingLink.revoked_reason || 'revoked_by_owner').trim();
    const revokedAt = existingLink.revoked_at || new Date().toISOString();

    const { data: updatedLink, error: updateError } = await supabase
      .from('emergency_share_links')
      .update({
        revoked_at: revokedAt,
        revoked_reason: revokeReason,
        last_access_result: 'revoked',
      })
      .eq('id', linkId)
      .eq('baby_id', babyId)
      .select(
        'id,token_prefix,preset_key,expires_at,revoked_at,revoked_reason,created_at,last_accessed_at,last_access_result,view_count,max_views,requires_pin,allowed_sections',
      )
      .single();

    if (updateError) throw updateError;

    const { data: accessLogs, error: accessLogsError } = await supabase
      .from('emergency_share_link_access_logs')
      .select(
        'id,link_id,accessed_at,result,viewer_label,request_path,created_at,device_summary,country_code,region,city,risk_level,risk_reason',
      )
      .eq('link_id', linkId)
      .order('accessed_at', { ascending: false })
      .limit(5);

    if (accessLogsError) throw accessLogsError;

    return res.json({
      success: true,
      data: serializeEmergencyShareLinkSummary(updatedLink, accessLogs || []),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to revoke share link' });
  }
});

router.get('/public/emergency-card/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing share token' });
    }

    const resolved = await resolvePublicEmergencyShareRequest(req, token);
    if (!resolved.ok) {
      return res.status(resolved.status).json({
        success: false,
        error: resolved.error,
        pinRequired: Boolean(resolved.pinRequired),
      });
    }

    const { linkRow, card, emergencyText, allowedSections, nextViewCount } = resolved.value;
    const responseCard = serializeEmergencyCard(card);
    const qrCodeDataUrl = await QRCode.toDataURL(emergencyText);

    return res.json({
      success: true,
      data: {
        ...responseCard,
        text: emergencyText,
        qrCodeDataUrl,
        shareToken: token,
        expiresAt: linkRow.expires_at,
        maxViews: linkRow.max_views,
        viewCount: nextViewCount,
        remainingViews:
          linkRow.max_views && Number(linkRow.max_views) > 0
            ? Math.max(0, Number(linkRow.max_views) - nextViewCount)
            : null,
        requiresPin: Boolean(linkRow.requires_pin),
        allowedSections: responseCard.allowedSections.length ? responseCard.allowedSections : allowedSections,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load public emergency card' });
  }
});

router.get('/public/emergency-card/:token/pdf', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing share token' });
    }

    const resolved = await resolvePublicEmergencyShareRequest(req, token);
    if (!resolved.ok) {
      return res.status(resolved.status).json({
        success: false,
        error: resolved.error,
        pinRequired: Boolean(resolved.pinRequired),
      });
    }

    const { linkRow, card, emergencyText } = resolved.value;
    const qrCodeDataUrl = await QRCode.toDataURL(emergencyText);

    const doc = new PDFDocument({ margin: 42 });
    const bufferPromise = getPdfBuffer(doc);

    doc.fontSize(20).text('BabyCore Emergency Share Card');
    doc.moveDown(0.4);
    doc.fontSize(12).text(`Baby: ${card.baby.name}`);
    doc.fontSize(10).fillColor('#4b5563').text(`Generated: ${new Date(card.generatedAt).toLocaleString()}`);
    doc.fillColor('#000000');
    doc.moveDown(0.7);
    doc.image(qrCodeDataUrl, 430, 42, { width: 120 });

    for (const line of emergencyText.split('\n')) {
      if (!line.trim()) {
        doc.moveDown(0.35);
      } else if (line.endsWith(':')) {
        doc.fontSize(12).font('Helvetica-Bold').text(line);
        doc.font('Helvetica');
      } else {
        doc.fontSize(10).text(line);
      }
    }

    doc.moveDown(0.8);
    doc
      .fontSize(9)
      .fillColor('#6b7280')
      .text(`Share link expires at ${new Date(linkRow.expires_at).toLocaleString()}`);
    doc.end();

    const buffer = await bufferPromise;
    const safeBabyName = String(card.baby.name || 'baby').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const fileName = `emergency-share-card-${safeBabyName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to generate public emergency PDF' });
  }
});

router.get('/emergency-card/:babyId/pdf', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const card = await buildEmergencyCard(babyId);
    if (!card.baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    const emergencyText = formatEmergencyCardAsText(card);
    const qrCodeDataUrl = await QRCode.toDataURL(emergencyText);

    const doc = new PDFDocument({ margin: 42 });
    const bufferPromise = getPdfBuffer(doc);

    doc.fontSize(20).text('BabyCore Emergency Share Card');
    doc.moveDown(0.4);
    doc.fontSize(12).text(`Baby: ${card.baby.name}`);
    doc.fontSize(10).fillColor('#4b5563').text(`Generated: ${new Date(card.generatedAt).toLocaleString()}`);
    doc.fillColor('#000000');
    doc.moveDown(0.7);

    doc.image(qrCodeDataUrl, 430, 42, { width: 120 });

    const lines = emergencyText.split('\n');
    for (const line of lines) {
      if (!line.trim()) {
        doc.moveDown(0.35);
      } else if (line.endsWith(':')) {
        doc.fontSize(12).font('Helvetica-Bold').text(line);
        doc.font('Helvetica');
      } else {
        doc.fontSize(10).text(line);
      }
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#6b7280').text('This card is informational. For emergencies, contact local emergency services immediately.');
    doc.end();

    const buffer = await bufferPromise;
    const safeBabyName = String(card.baby.name || 'baby').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const fileName = `emergency-share-card-${safeBabyName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to generate emergency PDF' });
  }
});

export default router;
