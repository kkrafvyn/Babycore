import { emitCareWorkspaceUpdated } from './care-workspace-events';

export type ParentWellnessMood =
  | 'rested'
  | 'steady'
  | 'hopeful'
  | 'drained'
  | 'overwhelmed';

export type ParentRecoveryStatus = 'recovering' | 'steady' | 'strong';

export interface ParentWellnessEntry {
  id: string;
  babyId: string;
  caregiverName: string;
  loggedAt: string;
  mood: ParentWellnessMood;
  stressLevel: number;
  sleepHours: number;
  pumpingSessions: number;
  waterIntake: number;
  mealsCompleted: number;
  recoveryStatus: ParentRecoveryStatus;
  notes?: string;
  tags: string[];
}

export interface CreateParentWellnessEntryInput {
  babyId: string;
  caregiverName: string;
  mood: ParentWellnessMood;
  stressLevel: number;
  sleepHours: number;
  pumpingSessions?: number;
  waterIntake?: number;
  mealsCompleted?: number;
  recoveryStatus?: ParentRecoveryStatus;
  notes?: string;
}

export interface ParentWellnessSummary {
  checkInCount: number;
  averageStressLevel: number;
  averageSleepHours: number;
  sleepDebtHours: number;
  totalPumpingSessions: number;
  averageWaterIntake: number;
  highStressCount: number;
  lowSleepCount: number;
  latestEntry: ParentWellnessEntry | null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'babylog.parent-wellness.v1';
const RECOMMENDED_SLEEP_HOURS = 7.5;
const memoryStorage = new Map<string, string>();

const getStorage = (): StorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
};

const generateEntryId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `wellness-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const deriveTags = (entry: Omit<ParentWellnessEntry, 'tags'>): string[] => {
  const tags = new Set<string>();

  if (entry.sleepHours < 5) tags.add('sleep-debt');
  if (entry.stressLevel >= 8) tags.add('high-stress');
  if (entry.waterIntake < 5) tags.add('low-hydration');
  if (entry.mealsCompleted < 2) tags.add('skipped-meals');
  if (entry.pumpingSessions >= 5) tags.add('heavy-pumping');
  if (entry.recoveryStatus === 'recovering') tags.add('recovery-mode');

  return Array.from(tags);
};

const normalizeEntry = (entry: ParentWellnessEntry): ParentWellnessEntry => {
  const normalizedBase = {
    ...entry,
    caregiverName: entry.caregiverName.trim() || 'Caregiver',
    stressLevel: clamp(Number(entry.stressLevel) || 1, 1, 10),
    sleepHours: clamp(Number(entry.sleepHours) || 0, 0, 24),
    pumpingSessions: clamp(Number(entry.pumpingSessions) || 0, 0, 20),
    waterIntake: clamp(Number(entry.waterIntake) || 0, 0, 30),
    mealsCompleted: clamp(Number(entry.mealsCompleted) || 0, 0, 10),
    recoveryStatus: entry.recoveryStatus || 'steady',
    notes: entry.notes?.trim() || undefined,
  };

  return {
    ...normalizedBase,
    tags: deriveTags(normalizedBase),
  };
};

const sortEntries = (entries: ParentWellnessEntry[]) =>
  entries
    .slice()
    .sort((left, right) => new Date(right.loggedAt).getTime() - new Date(left.loggedAt).getTime());

const readAllEntries = (): ParentWellnessEntry[] => {
  const raw = getStorage().getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ParentWellnessEntry[];
    if (!Array.isArray(parsed)) return [];
    return sortEntries(parsed.map((entry) => normalizeEntry(entry)));
  } catch {
    return [];
  }
};

const writeAllEntries = (entries: ParentWellnessEntry[]) => {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(sortEntries(entries)));
  emitCareWorkspaceUpdated({
    babyId: entries[0]?.babyId,
    source: 'wellness',
  });
};

export const getAllParentWellnessEntries = (): ParentWellnessEntry[] => readAllEntries();

export const getParentWellnessEntries = (babyId: string): ParentWellnessEntry[] =>
  readAllEntries().filter((entry) => entry.babyId === babyId);

export const createParentWellnessEntry = (
  input: CreateParentWellnessEntryInput,
): ParentWellnessEntry => {
  const nextEntry = normalizeEntry({
    id: generateEntryId(),
    babyId: input.babyId,
    caregiverName: input.caregiverName,
    loggedAt: new Date().toISOString(),
    mood: input.mood,
    stressLevel: input.stressLevel,
    sleepHours: input.sleepHours,
    pumpingSessions: input.pumpingSessions ?? 0,
    waterIntake: input.waterIntake ?? 0,
    mealsCompleted: input.mealsCompleted ?? 0,
    recoveryStatus: input.recoveryStatus ?? 'steady',
    notes: input.notes,
    tags: [],
  });

  const entries = readAllEntries();
  entries.push(nextEntry);
  writeAllEntries(entries);
  return nextEntry;
};

export const deleteParentWellnessEntry = (entryId: string): boolean => {
  const entries = readAllEntries();
  const filtered = entries.filter((entry) => entry.id !== entryId);
  if (filtered.length === entries.length) return false;
  writeAllEntries(filtered);
  return true;
};

export const replaceParentWellnessEntries = (entries: ParentWellnessEntry[]) => {
  writeAllEntries(entries.map((entry) => normalizeEntry(entry)));
};

export const getParentWellnessSummary = (babyId: string): ParentWellnessSummary => {
  const entries = getParentWellnessEntries(babyId);
  const count = entries.length;
  const totalStress = entries.reduce((sum, entry) => sum + entry.stressLevel, 0);
  const totalSleep = entries.reduce((sum, entry) => sum + entry.sleepHours, 0);
  const totalPumping = entries.reduce((sum, entry) => sum + entry.pumpingSessions, 0);
  const totalWater = entries.reduce((sum, entry) => sum + entry.waterIntake, 0);
  const highStressCount = entries.filter((entry) => entry.stressLevel >= 8).length;
  const lowSleepCount = entries.filter((entry) => entry.sleepHours < 5).length;

  return {
    checkInCount: count,
    averageStressLevel: count ? Number((totalStress / count).toFixed(1)) : 0,
    averageSleepHours: count ? Number((totalSleep / count).toFixed(1)) : 0,
    sleepDebtHours: count ? Number(Math.max(0, count * RECOMMENDED_SLEEP_HOURS - totalSleep).toFixed(1)) : 0,
    totalPumpingSessions: totalPumping,
    averageWaterIntake: count ? Number((totalWater / count).toFixed(1)) : 0,
    highStressCount,
    lowSleepCount,
    latestEntry: entries[0] ?? null,
  };
};

export const getParentWellnessRecommendations = (summary: ParentWellnessSummary): string[] => {
  if (!summary.checkInCount) {
    return [
      'Start a short check-in to track sleep, stress, hydration, and recovery alongside baby care.',
    ];
  }

  const recommendations: string[] = [];

  if (summary.averageSleepHours < 5.5) {
    recommendations.push('Protect one uninterrupted recovery block today if another caregiver can cover a feed or nap.');
  }

  if (summary.highStressCount >= 2 || (summary.latestEntry && summary.latestEntry.stressLevel >= 8)) {
    recommendations.push('Use the shared care task flow to hand off one urgent task before stress compounds.');
  }

  if (summary.averageWaterIntake > 0 && summary.averageWaterIntake < 5) {
    recommendations.push('Pair each feeding or pumping block with water to support hydration and recovery.');
  }

  if ((summary.latestEntry?.pumpingSessions ?? 0) >= 5) {
    recommendations.push('Heavy pumping day detected. Add an extra rest window and check supply or latch notes if needed.');
  }

  if (!recommendations.length) {
    recommendations.push('Your recent check-ins look steady. Keep logging so patterns stay visible before hard days stack up.');
  }

  return recommendations;
};

export const clearParentWellnessEntriesForTests = () => {
  getStorage().removeItem(STORAGE_KEY);
  memoryStorage.delete(STORAGE_KEY);
};
