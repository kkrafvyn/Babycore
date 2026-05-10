import type {
  CareProfileFeedingStyle,
  CareProfileHealthConsideration,
  CareProfilePreferences,
  CareProfilePriority,
  CareProfileStage,
  CareProfileSupportFocus,
  UserSettings,
} from '../types';

export type CareProfileRole = 'baby' | 'doctor' | 'caregiver';

const BABY_STAGE_LABELS: Record<CareProfileStage, string> = {
  newborn: 'Newborn',
  infant: 'Infant',
  toddler: 'Toddler',
  preschool: 'Preschool',
};

const FEEDING_STYLE_LABELS: Record<CareProfileFeedingStyle, string> = {
  breastfeeding: 'Breastfeeding',
  bottle: 'Bottle feeding',
  mixed: 'Mixed feeding',
  solids: 'Solids focus',
};

const PRIORITY_LABELS: Record<CareProfilePriority, string> = {
  sleep: 'Sleep',
  feeding: 'Feeding',
  growth: 'Growth',
  medical: 'Medical',
  routine: 'Routine',
  milestones: 'Milestones',
};

const HEALTH_LABELS: Record<CareProfileHealthConsideration, string> = {
  premature: 'Premature',
  reflux: 'Reflux',
  allergies: 'Allergies',
  nicu: 'NICU history',
  'multiple-birth': 'Multiple birth',
};

const SUPPORT_LABELS: Record<CareProfileSupportFocus, string> = {
  'daily-logs': 'Daily logs',
  'medical-followups': 'Medical follow-ups',
  'handoff-updates': 'Handoff updates',
  'growth-review': 'Growth review',
};

const DEFAULT_BABY_PROFILE: CareProfilePreferences = {
  childStage: 'newborn',
  feedingStyle: 'mixed',
  carePriorities: ['feeding', 'sleep'],
  healthConsiderations: [],
  supportFocus: [],
};

const DEFAULT_DOCTOR_PROFILE: CareProfilePreferences = {
  carePriorities: ['medical', 'growth'],
  healthConsiderations: [],
  supportFocus: ['medical-followups', 'growth-review'],
};

const DEFAULT_CAREGIVER_PROFILE: CareProfilePreferences = {
  carePriorities: ['routine', 'feeding'],
  healthConsiderations: [],
  supportFocus: ['daily-logs', 'handoff-updates'],
};

const dedupe = <T extends string>(values: T[] | undefined): T[] =>
  Array.from(new Set((values || []).filter(Boolean))) as T[];

export const getDefaultCareProfile = (role: CareProfileRole): CareProfilePreferences => {
  if (role === 'doctor') {
    return { ...DEFAULT_DOCTOR_PROFILE };
  }

  if (role === 'caregiver') {
    return { ...DEFAULT_CAREGIVER_PROFILE };
  }

  return { ...DEFAULT_BABY_PROFILE };
};

export const normalizeCareProfile = (
  role: CareProfileRole,
  profile?: CareProfilePreferences | null,
): CareProfilePreferences => {
  const defaults = getDefaultCareProfile(role);
  return {
    childStage: profile?.childStage ?? defaults.childStage,
    feedingStyle: profile?.feedingStyle ?? defaults.feedingStyle,
    carePriorities: dedupe(profile?.carePriorities ?? defaults.carePriorities),
    healthConsiderations: dedupe(profile?.healthConsiderations ?? defaults.healthConsiderations),
    supportFocus: dedupe(profile?.supportFocus ?? defaults.supportFocus),
  };
};

export const deriveSettingsFromCareProfile = (
  role: CareProfileRole,
  profile?: CareProfilePreferences | null,
): Pick<UserSettings, 'feedingInterval' | 'reminderPreferences' | 'careProfilePreferences'> => {
  const normalized = normalizeCareProfile(role, profile);
  const priorities = new Set(normalized.carePriorities || []);
  const healthConsiderations = new Set(normalized.healthConsiderations || []);
  const supportFocus = new Set(normalized.supportFocus || []);

  let feedingInterval = 3;
  if (normalized.childStage === 'newborn') feedingInterval = 2;
  if (normalized.childStage === 'infant') feedingInterval = 3;
  if (normalized.childStage === 'toddler') feedingInterval = 4;
  if (normalized.childStage === 'preschool') feedingInterval = 5;
  if (normalized.feedingStyle === 'solids') feedingInterval = Math.max(feedingInterval, 4);
  if (role !== 'baby') feedingInterval = 4;

  return {
    feedingInterval,
    careProfilePreferences: normalized,
    reminderPreferences: {
      feeding:
        priorities.has('feeding') ||
        normalized.feedingStyle === 'breastfeeding' ||
        normalized.feedingStyle === 'mixed',
      sleep: priorities.has('sleep') || priorities.has('routine') || normalized.childStage === 'newborn',
      diaper: normalized.childStage === 'newborn' || priorities.has('routine'),
      medication:
        priorities.has('medical') ||
        healthConsiderations.size > 0 ||
        supportFocus.has('medical-followups'),
      vaccine: priorities.has('medical') || role === 'doctor',
      growth:
        priorities.has('growth') ||
        priorities.has('milestones') ||
        supportFocus.has('growth-review'),
      retryMissed: true,
      snoozeMinutes: normalized.childStage === 'newborn' ? 15 : 30,
      quietHoursEnabled: role !== 'doctor',
    },
  };
};

export const getCareProfileBadges = (
  role: CareProfileRole,
  profile?: CareProfilePreferences | null,
): string[] => {
  const normalized = normalizeCareProfile(role, profile);
  const badges: string[] = [];

  if (role === 'baby' && normalized.childStage) {
    badges.push(BABY_STAGE_LABELS[normalized.childStage]);
  }
  if (role === 'baby' && normalized.feedingStyle) {
    badges.push(FEEDING_STYLE_LABELS[normalized.feedingStyle]);
  }

  (normalized.carePriorities || []).slice(0, 2).forEach((priority) => {
    badges.push(PRIORITY_LABELS[priority]);
  });

  if (role !== 'baby') {
    (normalized.supportFocus || []).slice(0, 2).forEach((focus) => {
      badges.push(SUPPORT_LABELS[focus]);
    });
  }

  return dedupe(badges).slice(0, 4);
};

export const getCareProfileSummary = (
  role: CareProfileRole,
  profile?: CareProfilePreferences | null,
): string => {
  const normalized = normalizeCareProfile(role, profile);

  if (role === 'doctor') {
    return `Focused on ${(normalized.supportFocus || []).map((focus) => SUPPORT_LABELS[focus]).join(', ').toLowerCase()} with priority on ${(normalized.carePriorities || []).map((priority) => PRIORITY_LABELS[priority]).join(', ').toLowerCase()}.`;
  }

  if (role === 'caregiver') {
    return `Built for ${(normalized.supportFocus || []).map((focus) => SUPPORT_LABELS[focus]).join(', ').toLowerCase()} while keeping ${(normalized.carePriorities || []).map((priority) => PRIORITY_LABELS[priority]).join(', ').toLowerCase()} front and center.`;
  }

  const stageLabel = normalized.childStage ? BABY_STAGE_LABELS[normalized.childStage] : 'Baby';
  const feedingLabel = normalized.feedingStyle ? FEEDING_STYLE_LABELS[normalized.feedingStyle].toLowerCase() : 'mixed feeding';
  const priorities = (normalized.carePriorities || []).map((priority) => PRIORITY_LABELS[priority].toLowerCase());
  const healthNotes = (normalized.healthConsiderations || []).map((item) => HEALTH_LABELS[item].toLowerCase());

  const healthSummary = healthNotes.length > 0 ? ` Watch for ${healthNotes.join(', ')}.` : '';
  return `${stageLabel} plan centered on ${feedingLabel} and ${priorities.join(', ')}.${healthSummary}`;
};
