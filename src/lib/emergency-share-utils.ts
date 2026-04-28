export const EMERGENCY_SHARE_SECTION_KEYS = [
  'demographics',
  'allergies',
  'medications',
  'growth',
  'vaccines',
  'doctor_contacts',
] as const;

export type EmergencyShareSectionKey = (typeof EMERGENCY_SHARE_SECTION_KEYS)[number];

export const EMERGENCY_SHARE_PRESET_KEYS = [
  'clinic_visit',
  'travel',
  'caregiver_handoff',
  'custom',
] as const;

export type EmergencySharePresetKey = (typeof EMERGENCY_SHARE_PRESET_KEYS)[number];

export type EmergencyShareLinkStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'view_limit_reached';

export type EmergencyShareRiskLevel = 'info' | 'warning' | 'critical';

export type EmergencySharePresetDefinition = {
  key: EmergencySharePresetKey;
  label: string;
  description: string;
  ttlMinutes: number;
  maxViews: number | null;
  requiresPin: boolean;
  allowedSections: EmergencyShareSectionKey[];
};

export const EMERGENCY_SHARE_PRESETS: Record<
  EmergencySharePresetKey,
  EmergencySharePresetDefinition
> = {
  clinic_visit: {
    key: 'clinic_visit',
    label: 'Clinic Visit',
    description: 'Short-lived link with essentials for urgent triage or check-in.',
    ttlMinutes: 180,
    maxViews: 5,
    requiresPin: false,
    allowedSections: [
      'demographics',
      'allergies',
      'medications',
      'growth',
      'vaccines',
      'doctor_contacts',
    ],
  },
  travel: {
    key: 'travel',
    label: 'Travel',
    description: 'Longer access window for flights, trips, and border crossings.',
    ttlMinutes: 24 * 60,
    maxViews: 10,
    requiresPin: true,
    allowedSections: [
      'demographics',
      'allergies',
      'medications',
      'vaccines',
      'doctor_contacts',
    ],
  },
  caregiver_handoff: {
    key: 'caregiver_handoff',
    label: 'Caregiver Handoff',
    description: 'Focused summary for babysitters, relatives, or backup caregivers.',
    ttlMinutes: 12 * 60,
    maxViews: 6,
    requiresPin: true,
    allowedSections: [
      'demographics',
      'allergies',
      'medications',
      'doctor_contacts',
    ],
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    description: 'Fully customized emergency share configuration.',
    ttlMinutes: 60,
    maxViews: null,
    requiresPin: false,
    allowedSections: [...EMERGENCY_SHARE_SECTION_KEYS],
  },
};

const hasDemographicsSection = (sections?: readonly string[] | null): boolean => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return true;
  }

  return sections.includes('demographics');
};

export const resolveEmergencyShareDisplayName = (
  name: unknown,
  sections?: readonly string[] | null,
): string => {
  if (!hasDemographicsSection(sections)) {
    return 'Baby';
  }

  const normalizedName = String(name || '').trim();
  return normalizedName || 'Baby';
};

export const normalizeEmergencySharePresetKey = (
  value: unknown,
): EmergencySharePresetKey => {
  const normalized = String(value || '').trim().toLowerCase();
  if ((EMERGENCY_SHARE_PRESET_KEYS as readonly string[]).includes(normalized)) {
    return normalized as EmergencySharePresetKey;
  }

  return 'custom';
};

export const resolveEmergencySharePreset = (
  value: unknown,
): EmergencySharePresetDefinition => {
  const key = normalizeEmergencySharePresetKey(value);
  return EMERGENCY_SHARE_PRESETS[key];
};

export const calculateEmergencyShareTtlMinutes = (
  createdAt?: string | null,
  expiresAt?: string | null,
): number | null => {
  if (!createdAt || !expiresAt) {
    return null;
  }

  const createdAtMs = new Date(createdAt).getTime();
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= createdAtMs) {
    return null;
  }

  return Math.max(1, Math.round((expiresAtMs - createdAtMs) / 60000));
};

export const formatEmergencyGrowthSummary = (growth: Record<string, unknown> | null | undefined): string => {
  if (!growth) {
    return 'No recent growth or vitals recorded';
  }

  const dateValue = String(growth.date || '').trim();
  const weightValue = growth.weight ?? '-';
  const heightValue = growth.height ?? '-';
  const headCircumferenceValue =
    growth.head_circumference ?? growth.headCircumference ?? '-';

  return `Date ${dateValue || '-'} | W ${weightValue} | H ${heightValue} | HC ${headCircumferenceValue}`;
};

export const summarizeEmergencyShareUserAgent = (userAgent: unknown): string => {
  const source = String(userAgent || '').trim();
  if (!source) {
    return 'Unknown device';
  }

  const normalized = source.toLowerCase();
  const deviceType = normalized.includes('mobile')
    ? 'Mobile'
    : normalized.includes('tablet') || normalized.includes('ipad')
      ? 'Tablet'
      : 'Desktop';
  const browser = normalized.includes('edg/')
    ? 'Edge'
    : normalized.includes('chrome/')
      ? 'Chrome'
      : normalized.includes('safari/') && !normalized.includes('chrome/')
        ? 'Safari'
        : normalized.includes('firefox/')
          ? 'Firefox'
          : 'Browser';
  const platform = normalized.includes('android')
    ? 'Android'
    : normalized.includes('iphone') || normalized.includes('ipad') || normalized.includes('ios')
      ? 'iOS'
      : normalized.includes('mac os')
        ? 'macOS'
        : normalized.includes('windows')
          ? 'Windows'
          : normalized.includes('linux')
            ? 'Linux'
            : 'Unknown OS';

  return `${deviceType} | ${browser} | ${platform}`;
};

export const buildEmergencyShareLocationSummary = (input: {
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
}): string => {
  const pieces = [input.city, input.region, input.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return pieces.length ? pieces.join(', ') : 'Location unavailable';
};

export const getEmergencyShareLinkStatus = (input: {
  expiresAt?: string | null;
  revokedAt?: string | null;
  viewCount?: number | null;
  maxViews?: number | null;
  now?: number | string | Date;
}): EmergencyShareLinkStatus => {
  if (input.revokedAt) {
    return 'revoked';
  }

  const nowMs =
    typeof input.now === 'number'
      ? input.now
      : input.now
        ? new Date(input.now).getTime()
        : Date.now();
  const expiresAtMs = input.expiresAt ? new Date(input.expiresAt).getTime() : Number.NaN;
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) {
    return 'expired';
  }

  const maxViews = Number(input.maxViews || 0);
  const viewCount = Number(input.viewCount || 0);
  if (maxViews > 0 && viewCount >= maxViews) {
    return 'view_limit_reached';
  }

  return 'active';
};
