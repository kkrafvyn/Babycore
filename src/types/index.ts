// Core data types for Bud & Bloom app

export interface Baby {
  id: string;
  name: string;
  dateOfBirth: string; // ISO 8601
  gender?: 'boy' | 'girl' | 'other';
  photoUrl?: string;
  country: string;
  ageGroup?: 'newborn' | 'infant' | 'toddler' | 'preschool';
  createdAt: string;
}

export interface SleepLog {
  id: string;
  babyId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration: number; // in minutes
  notes?: string;
  createdAt: string;
}

export interface FeedLog {
  id: string;
  babyId: string;
  timestamp: string; // ISO 8601
  type: 'breast' | 'bottle' | 'solids';
  duration?: number; // in minutes (breast)
  breastLeft?: boolean; // breast
  breastRight?: boolean; // breast
  bottleAmount?: number; // ml or oz (bottle)
  bottleType?: 'breast_milk' | 'formula' | 'other'; // bottle
  solidDescription?: string; // solids
  notes?: string;
  createdAt: string;
}

export interface DiaperLog {
  id: string;
  babyId: string;
  timestamp: string; // ISO 8601
  type: 'wet' | 'dirty' | 'both';
  notes?: string;
  createdAt: string;
}

export interface GrowthMeasurement {
  id: string;
  babyId: string;
  date: string; // ISO 8601
  weight?: number; // kg or lb/oz
  height?: number; // cm or inches
  headCircumference?: number; // cm or inches
  createdAt: string;
}

export interface VaccinationRecord {
  id: string;
  babyId: string;
  name: string;
  dueDate: string; // ISO 8601
  status: 'scheduled' | 'given' | 'overdue' | 'skipped';
  givenDate?: string; // ISO 8601
  notes?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  babyId: string;
  timestamp: string; // ISO 8601
  type: 'tummy_time' | 'reading' | 'outdoor' | 'music' | 'sensory' | 'social' | 'other';
  duration: number; // in minutes
  description?: string;
  notes?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  babyId: string;
  date: string; // ISO 8601
  type: 'first-smile' | 'rolling' | 'sitting' | 'crawling' | 'walking' | 'first-words' | 'first-tooth' | 'other';
  description: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface MemoryLog {
  id: string;
  babyId: string;
  timestamp: string; // ISO 8601
  text: string;
  photoUrl?: string;
  isMilestone?: boolean;
  tags?: string[];
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  babyId: string;
  date: string; // ISO 8601
  type: 'doctor-visit' | 'medication' | 'allergy' | 'condition' | 'other';
  title: string;
  description: string;
  doctorName?: string;
  clinic?: string;
  medicationName?: string;
  dosage?: string;
  allergen?: string;
  notes?: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  babyId: string;
  email: string;
  name: string;
  relationship: 'parent' | 'grandparent' | 'sibling' | 'other';
  role: 'owner' | 'editor' | 'viewer';
  status: 'invited' | 'accepted' | 'declined';
  invitedAt: string; // ISO 8601
  acceptedAt?: string; // ISO 8601
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: 'feeding' | 'sleep' | 'diaper' | 'activities' | 'milestones' | 'medical' | 'general';
  enabled: boolean;
  reminderTime?: string; // 24h format "10:30"
  frequency?: 'never' | 'once' | 'daily' | 'weekly';
  createdAt: string;
}

export interface BackupData {
  id: string;
  userId: string;
  type: 'automatic' | 'manual';
  format: 'json' | 'csv';
  size: number; // bytes
  url: string;
  createdAt: string;
}

export type CareProfileStage = 'newborn' | 'infant' | 'toddler' | 'preschool';
export type CareProfileFeedingStyle = 'breastfeeding' | 'bottle' | 'mixed' | 'solids';
export type CareProfilePriority = 'sleep' | 'feeding' | 'growth' | 'medical' | 'routine' | 'milestones';
export type CareProfileHealthConsideration = 'premature' | 'reflux' | 'allergies' | 'nicu' | 'multiple-birth';
export type CareProfileSupportFocus = 'daily-logs' | 'medical-followups' | 'handoff-updates' | 'growth-review';

export interface CareProfilePreferences {
  childStage?: CareProfileStage;
  feedingStyle?: CareProfileFeedingStyle;
  carePriorities?: CareProfilePriority[];
  healthConsiderations?: CareProfileHealthConsideration[];
  supportFocus?: CareProfileSupportFocus[];
}

export interface UserSettings {
  userId?: string;
  units: 'metric' | 'imperial';
  language?: string;
  careProfilePreferences?: CareProfilePreferences;
  careWorkspaceData?: {
    sharedCareTasks?: unknown[];
    parentWellnessEntries?: unknown[];
    offlineEmergencySnapshots?: unknown[];
    syncedAt?: string;
  };
  notificationsEnabled: boolean;
  feedingInterval?: number; // hours
  reminderPreferences?: {
    feeding?: boolean;
    sleep?: boolean;
    diaper?: boolean;
    medication?: boolean;
    vaccine?: boolean;
    growth?: boolean;
    retryMissed?: boolean;
    snoozeMinutes?: number;
    quietHoursEnabled?: boolean;
  };
  quietHoursStart?: string; // 24h format "22:00"
  quietHoursEnd?: string; // 24h format "07:00"
  theme?: 'light' | 'dark' | 'system';
  subscriptionPlan?: string;
  subscriptionStatus?: 'free' | 'active' | 'expired';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionCurrency?: string;
  biometricLockEnabled?: boolean;
  privacyLockDelay?: number; // minutes
  updatedAt: string;
}

export interface HealthLog {
  id: string;
  babyId: string;
  timestamp: string;
  type: 'temperature' | 'medication';
  value?: string; // e.g., "37.5"
  unit?: string; // e.g., "°C"
  name?: string; // Medication name
  dose?: string; // e.g., "2.5ml"
  nextDoseAt?: string;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  babyId: string;
  date: string; // ISO 8601
  prompt: string;
  text: string;
  mood?: 'happy' | 'tired' | 'grateful' | 'emotional' | 'proud';
  createdAt: string;
}

export interface Achievement {
  id: string;
  babyId: string;
  type: string; // e.g. 'logging_streak_7', 'first_100_diapers'
  title: string;
  description: string;
  icon: string; // emoji
  unlockedAt: string; // ISO 8601
  createdAt: string;
}

export type View = 'onboarding' | 'dashboard' | 'sleep' | 'feeding' | 'diaper' | 'growth' | 'vaccination' | 'settings' | 'journal' | 'health' | 'memories' | 'timeline' | 'insights' | 'tips' | 'photos' | 'report' | 'handoff' | 'baby-journal' | 'achievements' | 'sleep-training' | 'white-noise' | 'parent-wellness' | 'expenses' | 'nutrition' | 'care-expansion';
