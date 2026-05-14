import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  Droplets,
  FileText,
  Heart,
  MessageCircle,
  Mic,
  Package,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Watch,
} from 'lucide-react';
import {
  addDiaperLog,
  addFeedLog,
  addHealthLog,
  addSleepLog,
} from '../../lib/supabase-storage';
import type { DiaperLog, FeedLog, HealthLog, SleepLog } from '../../types';

interface CareExpansionHubProps {
  babyId: string;
  babyName: string;
  onBack: () => void;
  onRecordsSaved?: () => void;
}

type CaptureSource = 'voice' | 'text' | 'image';
type CaptureSuggestionType =
  | 'feeding'
  | 'sleep'
  | 'diaper'
  | 'pumping'
  | 'medication'
  | 'nutrition'
  | 'expense';
type MilkLocation = 'fridge' | 'freezer' | 'prepared' | 'used' | 'discarded';
type DaycareMood = 'settled' | 'sleepy' | 'playful' | 'fussy' | 'needs-follow-up';
type MilestoneStatus = 'watching' | 'observed' | 'provider-question';
type QuickActionStatus = 'planned' | 'ready' | 'needs-native-work';
type TabId = 'capture' | 'milk' | 'daycare' | 'milestones' | 'surfaces' | 'assistant' | 'recovery';

interface CaptureSuggestion {
  type: CaptureSuggestionType;
  summary: string;
  confidence: number;
}

interface CaptureEntry {
  id: string;
  babyId: string;
  source: CaptureSource;
  rawText: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'saved' | 'linked';
  suggestions: CaptureSuggestion[];
  linkedRecordCount?: number;
  linkedAt?: string;
}

interface MilkLot {
  id: string;
  babyId: string;
  label: string;
  amountMl: number;
  location: MilkLocation;
  expressedAt: string;
  expiresAt: string;
  notes: string;
  createdAt: string;
}

interface DaycareUpdate {
  id: string;
  babyId: string;
  caregiverName: string;
  dropoffTime: string;
  pickupTime: string;
  meals: string;
  naps: string;
  diapers: string;
  mood: DaycareMood;
  summary: string;
  createdAt: string;
}

interface MilestoneCheck {
  id: string;
  babyId: string;
  ageBand: string;
  label: string;
  status: MilestoneStatus;
  observedAt?: string;
  notes: string;
}

interface QuickActionPlan {
  id: string;
  label: string;
  surface: 'apple-watch' | 'wear-os' | 'live-activity' | 'android-notification' | 'shortcut';
  status: QuickActionStatus;
  notes: string;
}

interface RecoveryPlan {
  hydrationTarget: number;
  mealTarget: number;
  restWindow: string;
  medicationReminder: string;
  supportContact: string;
  notes: string;
  updatedAt: string;
}

interface WorkspaceState {
  captureEntries: CaptureEntry[];
  milkLots: MilkLot[];
  daycareUpdates: DaycareUpdate[];
  milestones: MilestoneCheck[];
  quickActions: QuickActionPlan[];
  recoveryPlan: RecoveryPlan;
}

const STORAGE_KEY = 'babycore_care_expansion_workspace_v1';

const todayInputValue = () => new Date().toISOString().split('T')[0];
const nowTimeValue = () => new Date().toTimeString().slice(0, 5);
const isoFromDate = (date: string) => new Date(`${date}T12:00:00`).toISOString();
const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const addDays = (date: string, days: number) => {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
};

const defaultMilestones: MilestoneCheck[] = [
  {
    id: '2m-smile',
    babyId: '',
    ageBand: '2 months',
    label: 'Calms when spoken to or picked up',
    status: 'watching',
    notes: '',
  },
  {
    id: '4m-laugh',
    babyId: '',
    ageBand: '4 months',
    label: 'Chuckles or makes sounds to get attention',
    status: 'watching',
    notes: '',
  },
  {
    id: '6m-roll',
    babyId: '',
    ageBand: '6 months',
    label: 'Rolls from tummy to back',
    status: 'watching',
    notes: '',
  },
  {
    id: '9m-look',
    babyId: '',
    ageBand: '9 months',
    label: 'Looks when name is called',
    status: 'watching',
    notes: '',
  },
  {
    id: '12m-wave',
    babyId: '',
    ageBand: '12 months',
    label: 'Waves bye-bye or plays simple gesture games',
    status: 'watching',
    notes: '',
  },
  {
    id: '18m-point',
    babyId: '',
    ageBand: '18 months',
    label: 'Points to show something interesting',
    status: 'watching',
    notes: '',
  },
  {
    id: '24m-words',
    babyId: '',
    ageBand: '24 months',
    label: 'Uses two-word phrases',
    status: 'watching',
    notes: '',
  },
];

const defaultQuickActions: QuickActionPlan[] = [
  {
    id: 'apple-watch-feed',
    label: 'Apple Watch feed, sleep, diaper, pump buttons',
    surface: 'apple-watch',
    status: 'needs-native-work',
    notes: 'Map to the same view intents used by app shortcuts.',
  },
  {
    id: 'live-activity-sleep',
    label: 'iOS Live Activity for active sleep or feed timer',
    surface: 'live-activity',
    status: 'planned',
    notes: 'Show elapsed time, last feed, and next nap estimate.',
  },
  {
    id: 'android-notification-actions',
    label: 'Android notification quick actions',
    surface: 'android-notification',
    status: 'ready',
    notes: 'Extend existing Android widget intents to notification actions.',
  },
  {
    id: 'wear-os-quick-log',
    label: 'Wear OS quick log follow-up',
    surface: 'wear-os',
    status: 'planned',
    notes: 'Build after notification action model is stable.',
  },
  {
    id: 'caregiver-shortcuts',
    label: 'Caregiver capture shortcut',
    surface: 'shortcut',
    status: 'ready',
    notes: 'Open capture inbox directly from mobile app shortcuts.',
  },
];

const defaultRecoveryPlan: RecoveryPlan = {
  hydrationTarget: 8,
  mealTarget: 3,
  restWindow: '14:00',
  medicationReminder: '',
  supportContact: '',
  notes: '',
  updatedAt: new Date().toISOString(),
};

const createDefaultWorkspace = (babyId: string): WorkspaceState => ({
  captureEntries: [],
  milkLots: [],
  daycareUpdates: [],
  milestones: defaultMilestones.map((milestone) => ({
    ...milestone,
    id: `${babyId}-${milestone.id}`,
    babyId,
  })),
  quickActions: defaultQuickActions,
  recoveryPlan: defaultRecoveryPlan,
});

const readAllWorkspaces = (): Record<string, WorkspaceState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeWorkspace = (babyId: string, state: WorkspaceState) => {
  const all = readAllWorkspaces();
  all[babyId] = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

const loadWorkspace = (babyId: string): WorkspaceState => {
  const all = readAllWorkspaces();
  return all[babyId] || createDefaultWorkspace(babyId);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value.includes('T') ? value : `${value}T12:00:00`));

const getDaysUntil = (date: string) => {
  const end = new Date(`${date}T12:00:00`).getTime();
  const now = new Date(`${todayInputValue()}T12:00:00`).getTime();
  return Math.ceil((end - now) / 86400000);
};

const parseCaptureSuggestions = (rawText: string): CaptureSuggestion[] => {
  const text = rawText.toLowerCase();
  const suggestions: CaptureSuggestion[] = [];
  const addSuggestion = (type: CaptureSuggestionType, summary: string, confidence: number) => {
    suggestions.push({ type, summary, confidence });
  };

  if (/(feed|fed|bottle|nursed|nursing|breast|formula)/.test(text)) {
    addSuggestion('feeding', 'Create a feeding entry from this note.', 0.82);
  }
  if (/(sleep|slept|nap|bedtime|woke|wake)/.test(text)) {
    addSuggestion('sleep', 'Create a sleep or nap entry from this note.', 0.8);
  }
  if (/(diaper|nappy|wet|dirty|poop|stool)/.test(text)) {
    addSuggestion('diaper', 'Create a diaper entry from this note.', 0.78);
  }
  if (/(pump|pumped|expressed|stash|freezer|fridge)/.test(text)) {
    addSuggestion('pumping', 'Create a pump or milk inventory entry.', 0.76);
  }
  if (/(medicine|medication|dose|tylenol|ibuprofen|antibiotic)/.test(text)) {
    addSuggestion('medication', 'Create a medication or health note.', 0.74);
  }
  if (/(meal|ate|solid|puree|allergen|reaction|rash)/.test(text)) {
    addSuggestion('nutrition', 'Create a nutrition or food-introduction entry.', 0.76);
  }
  if (/(\$|cost|bought|receipt|paid|diapers|formula)/.test(text)) {
    addSuggestion('expense', 'Create a baby expense entry from this note.', 0.68);
  }

  return suggestions.length > 0
    ? suggestions
    : [{ type: 'feeding', summary: 'Review manually before saving. No strong event type detected.', confidence: 0.35 }];
};

const getStatusClass = (status: string) => {
  if (status === 'ready' || status === 'observed' || status === 'saved' || status === 'linked') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
  }
  if (status === 'provider-question' || status === 'needs-native-work') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300';
};

const captureSourceIcon: Record<CaptureSource, React.ReactNode> = {
  voice: <Mic size={16} />,
  text: <FileText size={16} />,
  image: <Camera size={16} />,
};

const tabItems: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'capture', label: 'Capture', icon: <Mic size={16} /> },
  { id: 'milk', label: 'Milk', icon: <Droplets size={16} /> },
  { id: 'daycare', label: 'Daycare', icon: <ClipboardList size={16} /> },
  { id: 'milestones', label: 'Milestones', icon: <Shield size={16} /> },
  { id: 'surfaces', label: 'Surfaces', icon: <Watch size={16} /> },
  { id: 'assistant', label: 'Assistant', icon: <MessageCircle size={16} /> },
  { id: 'recovery', label: 'Recovery', icon: <Heart size={16} /> },
];

const hasCaptureSuggestion = (entry: CaptureEntry, type: CaptureSuggestionType) =>
  entry.suggestions.some((suggestion) => suggestion.type === type);

const toCaptureNote = (entry: CaptureEntry) =>
  `[Care Expansion] ${entry.source} capture from ${entry.createdBy}: ${entry.rawText}`;

const extractNumber = (text: string, patterns: RegExp[]): number | undefined => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] ? Number(match[1]) : NaN;
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
};

const extractDurationMinutes = (text: string): number | undefined => {
  const normalized = text.toLowerCase();
  let minutes = 0;

  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/g)) {
    minutes += Number(match[1]) * 60;
  }

  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/g)) {
    minutes += Number(match[1]);
  }

  return minutes > 0 ? Math.max(1, Math.round(minutes)) : undefined;
};

const parseTimeParts = (
  hourValue: string,
  minuteValue: string | undefined,
  meridiemValue: string | undefined,
  baseDate: Date,
) => {
  let hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  const meridiem = meridiemValue?.toLowerCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null;
  }

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const resolveCaptureTimestamp = (entry: CaptureEntry) => {
  const baseDate = new Date(entry.createdAt);
  const timeMatch = entry.rawText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/i);
  const parsedTime = timeMatch
    ? parseTimeParts(timeMatch[1], timeMatch[2], timeMatch[3], baseDate)
    : null;
  return (parsedTime || baseDate).toISOString();
};

const resolveSleepWindow = (entry: CaptureEntry) => {
  const baseDate = new Date(entry.createdAt);
  const timePattern = String.raw`([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?`;
  const rangeMatch = entry.rawText.match(
    new RegExp(`${timePattern}\\s*(?:to|-|until)\\s*${timePattern}`, 'i'),
  );

  if (rangeMatch) {
    const start = parseTimeParts(rangeMatch[1], rangeMatch[2], rangeMatch[3], baseDate);
    const end = parseTimeParts(rangeMatch[4], rangeMatch[5], rangeMatch[6], baseDate);

    if (start && end) {
      if (end.getTime() <= start.getTime()) {
        end.setDate(end.getDate() + 1);
      }
      return {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      };
    }
  }

  const duration = extractDurationMinutes(entry.rawText) || 30;
  const end = new Date(resolveCaptureTimestamp(entry));
  const start = new Date(end.getTime() - duration * 60000);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    duration,
  };
};

const extractBottleAmount = (text: string): number | undefined => {
  const ml = extractNumber(text, [/(\d+(?:\.\d+)?)\s*ml\b/i, /(\d+(?:\.\d+)?)\s*milliliters?\b/i]);
  if (ml) return Math.round(ml);

  const ounces = extractNumber(text, [/(\d+(?:\.\d+)?)\s*oz\b/i, /(\d+(?:\.\d+)?)\s*ounces?\b/i]);
  return ounces ? Math.round(ounces * 29.57) : undefined;
};

const extractMedicationName = (text: string) => {
  const match = text.match(/\b(tylenol|acetaminophen|ibuprofen|motrin|advil|antibiotic|vitamin d|medicine|medication)\b/i);
  if (!match) return 'Medication';
  return match[1]
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
};

const extractMedicationDose = (text: string) => {
  const match = text.match(/(\d+(?:\.\d+)?\s*(?:ml|mg|mcg|g|tsp|tablet|tablets|drop|drops|dose))\b/i);
  return match?.[1];
};

const hasExpenseIntent = (text: string) => /\$|cost|bought|receipt|paid|purchase|purchased|ordered|spent/i.test(text);
const hasFeedingEventIntent = (text: string) =>
  /\b(feed|fed|bottle|nurs|breastfed|ate|meal|solid|solids|puree|drank)\b/i.test(text);
const hasDiaperEventIntent = (text: string) =>
  /\b(wet|dirty|poop|stool|nappy|diaper\s+(change|changed|at|was|is)|changed\s+diaper)\b/i.test(text);
const hasMedicationEventIntent = (text: string) =>
  /\b(gave|give|dose|dosed|took|administered|tylenol|acetaminophen|ibuprofen|motrin|advil|antibiotic|vitamin d)\b/i.test(text);

const shouldCreateFeedingLog = (entry: CaptureEntry) => {
  if (!hasCaptureSuggestion(entry, 'feeding') && !hasCaptureSuggestion(entry, 'nutrition')) {
    return false;
  }

  const amount = extractBottleAmount(entry.rawText);
  return !hasExpenseIntent(entry.rawText) || hasFeedingEventIntent(entry.rawText) || Boolean(amount);
};

const shouldCreateDiaperLog = (entry: CaptureEntry) =>
  hasCaptureSuggestion(entry, 'diaper') &&
  hasDiaperEventIntent(entry.rawText) &&
  (!hasExpenseIntent(entry.rawText) || /\b(wet|dirty|poop|stool|changed)\b/i.test(entry.rawText));

const shouldCreateMedicationLog = (entry: CaptureEntry) =>
  hasCaptureSuggestion(entry, 'medication') &&
  (!hasExpenseIntent(entry.rawText) || hasMedicationEventIntent(entry.rawText));

const createLogsFromCapture = async (entry: CaptureEntry, babyId: string) => {
  const createdAt = new Date().toISOString();
  const timestamp = resolveCaptureTimestamp(entry);
  const rawText = entry.rawText.toLowerCase();
  const note = toCaptureNote(entry);
  let createdCount = 0;

  if (shouldCreateFeedingLog(entry)) {
    const feedLog: FeedLog = {
      id: makeId(),
      babyId,
      timestamp,
      type: /solid|solids|meal|ate|puree|allergen|food/.test(rawText)
        ? 'solids'
        : /nurs|breast/.test(rawText)
          ? 'breast'
          : 'bottle',
      createdAt,
      notes: note,
    };

    if (feedLog.type === 'breast') {
      const mentionsLeft = /\bleft\b/i.test(entry.rawText);
      const mentionsRight = /\bright\b/i.test(entry.rawText);
      feedLog.duration = extractDurationMinutes(entry.rawText) || 10;
      feedLog.breastLeft = mentionsLeft || !mentionsRight;
      feedLog.breastRight = mentionsRight || !mentionsLeft;
    } else if (feedLog.type === 'bottle') {
      feedLog.bottleAmount = extractBottleAmount(entry.rawText);
      feedLog.bottleType = /formula/.test(rawText)
        ? 'formula'
        : /breast\s*milk|expressed|pumped/.test(rawText)
          ? 'breast_milk'
          : 'other';
    } else {
      feedLog.solidDescription = entry.rawText.slice(0, 160);
    }

    await addFeedLog(feedLog);
    createdCount += 1;
  }

  if (hasCaptureSuggestion(entry, 'sleep')) {
    const sleepWindow = resolveSleepWindow(entry);
    const sleepLog: SleepLog = {
      id: makeId(),
      babyId,
      ...sleepWindow,
      notes: note,
      createdAt,
    };

    await addSleepLog(sleepLog);
    createdCount += 1;
  }

  if (shouldCreateDiaperLog(entry)) {
    const diaperLog: DiaperLog = {
      id: makeId(),
      babyId,
      timestamp,
      type: /both|mixed/.test(rawText) ? 'both' : /dirty|poop|stool/.test(rawText) ? 'dirty' : 'wet',
      notes: note,
      createdAt,
    };

    await addDiaperLog(diaperLog);
    createdCount += 1;
  }

  if (shouldCreateMedicationLog(entry)) {
    const healthLog: HealthLog = {
      id: makeId(),
      babyId,
      timestamp,
      type: 'medication',
      name: extractMedicationName(entry.rawText),
      dose: extractMedicationDose(entry.rawText),
      notes: note,
      createdAt,
    };

    await addHealthLog(healthLog);
    createdCount += 1;
  }

  return createdCount;
};

const createMilkLotFromCapture = (entry: CaptureEntry, babyId: string): MilkLot | null => {
  if (!hasCaptureSuggestion(entry, 'pumping')) {
    return null;
  }

  const amountMl = extractBottleAmount(entry.rawText);
  if (!amountMl) {
    return null;
  }

  const expressedAt = resolveCaptureTimestamp(entry);
  const expiresAt = new Date(expressedAt);
  expiresAt.setDate(expiresAt.getDate() + 4);

  return {
    id: makeId(),
    babyId,
    label: 'Captured pump',
    amountMl,
    location: /freezer/.test(entry.rawText.toLowerCase()) ? 'freezer' : 'fridge',
    expressedAt,
    expiresAt: expiresAt.toISOString().split('T')[0],
    notes: toCaptureNote(entry),
    createdAt: new Date().toISOString(),
  };
};

export function CareExpansionHub({ babyId, babyName, onBack, onRecordsSaved }: CareExpansionHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('capture');
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspace(babyId));
  const [savingCaptureId, setSavingCaptureId] = useState<string | null>(null);
  const [captureForm, setCaptureForm] = useState({
    source: 'text' as CaptureSource,
    createdBy: 'Caregiver',
    rawText: '',
  });
  const [milkForm, setMilkForm] = useState({
    label: 'Morning pump',
    amountMl: '',
    location: 'fridge' as MilkLocation,
    expressedAt: todayInputValue(),
    expiresAt: addDays(todayInputValue(), 4),
    notes: '',
  });
  const [daycareForm, setDaycareForm] = useState({
    caregiverName: 'Daycare',
    dropoffTime: '08:00',
    pickupTime: '17:00',
    meals: '',
    naps: '',
    diapers: '',
    mood: 'settled' as DaycareMood,
    summary: '',
  });
  const [assistantQuestion, setAssistantQuestion] = useState('What changed since daycare drop-off?');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryPlan>(() => workspace.recoveryPlan);

  const saveWorkspace = (next: WorkspaceState) => {
    setWorkspace(next);
    writeWorkspace(babyId, next);
  };

  const milkTotals = useMemo(() => {
    return workspace.milkLots.reduce(
      (summary, lot) => {
        if (lot.location === 'used' || lot.location === 'discarded') {
          summary.unavailable += lot.amountMl;
        } else {
          summary.available += lot.amountMl;
        }
        const daysUntil = getDaysUntil(lot.expiresAt);
        if (lot.location !== 'used' && lot.location !== 'discarded' && daysUntil <= 2) {
          summary.expiringSoon += lot.amountMl;
        }
        return summary;
      },
      { available: 0, unavailable: 0, expiringSoon: 0 },
    );
  }, [workspace.milkLots]);

  const latestDaycare = workspace.daycareUpdates[0];
  const observedMilestones = workspace.milestones.filter((item) => item.status === 'observed').length;
  const providerQuestions = workspace.milestones.filter((item) => item.status === 'provider-question').length;
  const readyQuickActions = workspace.quickActions.filter((item) => item.status === 'ready').length;

  const addCaptureEntry = () => {
    if (!captureForm.rawText.trim()) {
      alert('Add a note, voice transcript, or daycare sheet text first.');
      return;
    }

    const entry: CaptureEntry = {
      id: makeId(),
      babyId,
      source: captureForm.source,
      rawText: captureForm.rawText.trim(),
      createdBy: captureForm.createdBy.trim() || 'Caregiver',
      createdAt: new Date().toISOString(),
      status: 'draft',
      suggestions: parseCaptureSuggestions(captureForm.rawText),
    };

    saveWorkspace({
      ...workspace,
      captureEntries: [entry, ...workspace.captureEntries],
    });
    setCaptureForm((current) => ({ ...current, rawText: '' }));
  };

  const saveCaptureEntry = async (id: string) => {
    const entry = workspace.captureEntries.find((candidate) => candidate.id === id);
    if (!entry || entry.status === 'linked' || savingCaptureId) {
      return;
    }

    setSavingCaptureId(id);
    try {
      const createdLogCount = await createLogsFromCapture(entry, babyId);
      const milkLot = createMilkLotFromCapture(entry, babyId);
      const linkedRecordCount = createdLogCount + (milkLot ? 1 : 0);

      saveWorkspace({
        ...workspace,
        captureEntries: workspace.captureEntries.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                status: linkedRecordCount > 0 ? 'linked' : 'saved',
                linkedRecordCount,
                linkedAt: new Date().toISOString(),
              }
            : candidate,
        ),
        milkLots: milkLot ? [milkLot, ...workspace.milkLots] : workspace.milkLots,
      });

      if (linkedRecordCount > 0) {
        await onRecordsSaved?.();
      }
    } catch (error) {
      console.error('Unable to save capture card records:', error);
      alert('We could not create records from this capture yet. Please try again.');
    } finally {
      setSavingCaptureId(null);
    }
  };

  const deleteCaptureEntry = (id: string) => {
    saveWorkspace({
      ...workspace,
      captureEntries: workspace.captureEntries.filter((entry) => entry.id !== id),
    });
  };

  const addMilkLot = () => {
    const amountMl = Number(milkForm.amountMl);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      alert('Add a milk amount in ml.');
      return;
    }

    const lot: MilkLot = {
      id: makeId(),
      babyId,
      label: milkForm.label.trim() || 'Milk lot',
      amountMl,
      location: milkForm.location,
      expressedAt: isoFromDate(milkForm.expressedAt),
      expiresAt: milkForm.expiresAt,
      notes: milkForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    saveWorkspace({
      ...workspace,
      milkLots: [lot, ...workspace.milkLots],
    });
    setMilkForm((current) => ({ ...current, amountMl: '', notes: '' }));
  };

  const updateMilkLocation = (id: string, location: MilkLocation) => {
    saveWorkspace({
      ...workspace,
      milkLots: workspace.milkLots.map((lot) => (lot.id === id ? { ...lot, location } : lot)),
    });
  };

  const deleteMilkLot = (id: string) => {
    saveWorkspace({
      ...workspace,
      milkLots: workspace.milkLots.filter((lot) => lot.id !== id),
    });
  };

  const addDaycareUpdate = () => {
    const update: DaycareUpdate = {
      id: makeId(),
      babyId,
      caregiverName: daycareForm.caregiverName.trim() || 'Caregiver',
      dropoffTime: daycareForm.dropoffTime,
      pickupTime: daycareForm.pickupTime,
      meals: daycareForm.meals.trim(),
      naps: daycareForm.naps.trim(),
      diapers: daycareForm.diapers.trim(),
      mood: daycareForm.mood,
      summary: daycareForm.summary.trim(),
      createdAt: new Date().toISOString(),
    };

    saveWorkspace({
      ...workspace,
      daycareUpdates: [update, ...workspace.daycareUpdates],
    });
    setDaycareForm((current) => ({ ...current, meals: '', naps: '', diapers: '', summary: '' }));
  };

  const deleteDaycareUpdate = (id: string) => {
    saveWorkspace({
      ...workspace,
      daycareUpdates: workspace.daycareUpdates.filter((update) => update.id !== id),
    });
  };

  const updateMilestoneStatus = (id: string, status: MilestoneStatus) => {
    saveWorkspace({
      ...workspace,
      milestones: workspace.milestones.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              status,
              observedAt: status === 'observed' ? new Date().toISOString() : milestone.observedAt,
            }
          : milestone,
      ),
    });
  };

  const updateMilestoneNotes = (id: string, notes: string) => {
    saveWorkspace({
      ...workspace,
      milestones: workspace.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, notes } : milestone,
      ),
    });
  };

  const updateQuickActionStatus = (id: string, status: QuickActionStatus) => {
    saveWorkspace({
      ...workspace,
      quickActions: workspace.quickActions.map((action) =>
        action.id === id ? { ...action, status } : action,
      ),
    });
  };

  const saveRecoveryPlan = () => {
    const nextPlan = {
      ...recoveryDraft,
      hydrationTarget: Math.max(0, Number(recoveryDraft.hydrationTarget) || 0),
      mealTarget: Math.max(0, Number(recoveryDraft.mealTarget) || 0),
      updatedAt: new Date().toISOString(),
    };
    saveWorkspace({
      ...workspace,
      recoveryPlan: nextPlan,
    });
    setRecoveryDraft(nextPlan);
  };

  const generateAssistantAnswer = () => {
    const recentCapture = workspace.captureEntries.slice(0, 3);
    const daycare = workspace.daycareUpdates[0];
    const milk = milkTotals.available;
    const needsFollowUp = [
      providerQuestions > 0 ? `${providerQuestions} milestone question${providerQuestions === 1 ? '' : 's'}` : '',
      milkTotals.expiringSoon > 0 ? `${milkTotals.expiringSoon} ml milk expiring soon` : '',
      daycare?.mood === 'needs-follow-up' ? 'daycare follow-up requested' : '',
    ].filter(Boolean);

    const answer = [
      `For ${babyName}, I found ${recentCapture.length} recent capture note${recentCapture.length === 1 ? '' : 's'}, ${workspace.daycareUpdates.length} daycare update${workspace.daycareUpdates.length === 1 ? '' : 's'}, and ${milk} ml available milk inventory.`,
      daycare
        ? `Latest daycare note: ${daycare.summary || `${daycare.meals || 'No meals logged'}, ${daycare.naps || 'no naps logged'}, ${daycare.diapers || 'no diapers logged'}.`}`
        : 'No daycare update has been logged yet.',
      needsFollowUp.length
        ? `Follow-up queue: ${needsFollowUp.join('; ')}.`
        : 'No urgent follow-up items are flagged in this workspace.',
      'This assistant summarizes Babycore records only and is not a diagnosis or emergency triage tool.',
    ].join(' ');

    setAssistantAnswer(answer);
  };

  const renderMetric = (label: string, value: string, helper: string, icon: React.ReactNode) => (
    <div className="rounded-2xl border border-border-gray bg-surface p-4 dark:border-zinc-800">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-2xl font-headline font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-light">{label}</p>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-text-dim">{helper}</p>
    </div>
  );

  const renderCapture = () => (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <h3 className="font-headline text-xl font-black tracking-tight text-foreground">Universal Capture</h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-text-dim">
          Turn a voice transcript, typed note, or daycare sheet text into structured review cards.
        </p>

        <div className="mt-5 grid gap-3">
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">Source</label>
          <div className="grid grid-cols-3 gap-2">
            {(['text', 'voice', 'image'] as CaptureSource[]).map((source) => (
              <button
                key={source}
                onClick={() => setCaptureForm((current) => ({ ...current, source }))}
                className={`rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  captureForm.source === source
                    ? 'border-primary bg-primary text-white'
                    : 'border-border-gray bg-background text-text-dim dark:border-zinc-800'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {captureSourceIcon[source]}
                  {source}
                </span>
              </button>
            ))}
          </div>

          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">Submitted by</label>
          <input
            value={captureForm.createdBy}
            onChange={(event) => setCaptureForm((current) => ({ ...current, createdBy: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />

          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">Note or transcript</label>
          <textarea
            value={captureForm.rawText}
            onChange={(event) => setCaptureForm((current) => ({ ...current, rawText: event.target.value }))}
            rows={7}
            placeholder="Example: 9:15 bottle 120 ml, wet diaper at 10:40, nap from 11 to 12:20."
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-primary dark:border-zinc-800"
          />

          <button
            onClick={addCaptureEntry}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            <Plus size={16} />
            Create Review Card
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {workspace.captureEntries.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border-gray bg-surface p-6 text-center dark:border-zinc-800">
            <Sparkles className="mx-auto mb-3 text-primary" size={28} />
            <p className="font-headline text-xl font-black text-foreground">Capture queue is empty</p>
            <p className="mt-2 text-sm font-semibold text-text-dim">Add a caregiver note to see structured suggestions.</p>
          </div>
        ) : (
          workspace.captureEntries.map((entry) => (
            <article key={entry.id} className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-primary">
                    {captureSourceIcon[entry.source]}
                    <p className="text-xs font-black uppercase tracking-widest">{entry.source} capture</p>
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">{entry.createdBy}</p>
                  <p className="text-xs font-semibold text-text-light">{formatDate(entry.createdAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <p className="mt-4 rounded-2xl bg-background p-4 text-sm font-semibold leading-relaxed text-text-dim dark:bg-zinc-950">
                {entry.rawText}
              </p>
              {entry.linkedRecordCount ? (
                <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {entry.linkedRecordCount} record{entry.linkedRecordCount === 1 ? '' : 's'} linked to {babyName}
                </p>
              ) : null}
              <div className="mt-4 grid gap-2">
                {entry.suggestions.map((suggestion) => (
                  <div key={`${entry.id}-${suggestion.type}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border-gray px-4 py-3 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-black capitalize text-foreground">{suggestion.type}</p>
                      <p className="text-xs font-semibold text-text-dim">{suggestion.summary}</p>
                    </div>
                    <span className="text-xs font-black text-primary">{Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => saveCaptureEntry(entry.id)}
                  disabled={entry.status === 'linked' || savingCaptureId === entry.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-white/80"
                >
                  <CheckCircle size={15} />
                  {entry.status === 'linked' ? 'Linked' : savingCaptureId === entry.id ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => deleteCaptureEntry(entry.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-gray text-text-dim dark:border-zinc-800"
                  title="Delete capture"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );

  const renderMilk = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {renderMetric('Available stash', `${milkTotals.available} ml`, 'Fridge, freezer, and prepared milk still available.', <Droplets size={18} />)}
        {renderMetric('Expiring soon', `${milkTotals.expiringSoon} ml`, 'Milk with two days or less remaining.', <RefreshCw size={18} />)}
        {renderMetric('Used or discarded', `${milkTotals.unavailable} ml`, 'Inventory already marked used or discarded.', <Package size={18} />)}
      </div>

      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <h3 className="font-headline text-xl font-black tracking-tight text-foreground">Add Milk Lot</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            value={milkForm.label}
            onChange={(event) => setMilkForm((current) => ({ ...current, label: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            value={milkForm.amountMl}
            onChange={(event) => setMilkForm((current) => ({ ...current, amountMl: event.target.value }))}
            placeholder="Amount ml"
            inputMode="decimal"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            type="date"
            value={milkForm.expressedAt}
            onChange={(event) => setMilkForm((current) => ({ ...current, expressedAt: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            type="date"
            value={milkForm.expiresAt}
            onChange={(event) => setMilkForm((current) => ({ ...current, expiresAt: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <select
            value={milkForm.location}
            onChange={(event) => setMilkForm((current) => ({ ...current, location: event.target.value as MilkLocation }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          >
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="prepared">Prepared bottle</option>
          </select>
          <input
            value={milkForm.notes}
            onChange={(event) => setMilkForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Bottle prep or storage note"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
        </div>
        <button
          onClick={addMilkLot}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
        >
          <Plus size={16} />
          Add To Stash
        </button>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {workspace.milkLots.map((lot) => (
          <article key={lot.id} className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-headline text-xl font-black text-foreground">{lot.label}</p>
                <p className="text-sm font-semibold text-text-dim">{lot.amountMl} ml expressed {formatDate(lot.expressedAt)}</p>
              </div>
              <button
                onClick={() => deleteMilkLot(lot.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray text-text-dim dark:border-zinc-800"
                title="Delete milk lot"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-widest text-text-light">
              Expires {formatDate(lot.expiresAt)} ({getDaysUntil(lot.expiresAt)}d)
            </p>
            {lot.notes && <p className="mt-3 text-sm font-semibold text-text-dim">{lot.notes}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['fridge', 'freezer', 'prepared', 'used', 'discarded'] as MilkLocation[]).map((location) => (
                <button
                  key={location}
                  onClick={() => updateMilkLocation(lot.id, location)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                    lot.location === location
                      ? 'bg-primary text-white'
                      : 'bg-background text-text-dim dark:bg-zinc-950'
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderDaycare = () => (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <h3 className="font-headline text-xl font-black tracking-tight text-foreground">Daycare Sheet</h3>
        <div className="mt-5 grid gap-3">
          <input
            value={daycareForm.caregiverName}
            onChange={(event) => setDaycareForm((current) => ({ ...current, caregiverName: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={daycareForm.dropoffTime}
              onChange={(event) => setDaycareForm((current) => ({ ...current, dropoffTime: event.target.value }))}
              className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
            />
            <input
              type="time"
              value={daycareForm.pickupTime}
              onChange={(event) => setDaycareForm((current) => ({ ...current, pickupTime: event.target.value }))}
              className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
            />
          </div>
          <input
            value={daycareForm.meals}
            onChange={(event) => setDaycareForm((current) => ({ ...current, meals: event.target.value }))}
            placeholder="Meals and bottles"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            value={daycareForm.naps}
            onChange={(event) => setDaycareForm((current) => ({ ...current, naps: event.target.value }))}
            placeholder="Naps"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            value={daycareForm.diapers}
            onChange={(event) => setDaycareForm((current) => ({ ...current, diapers: event.target.value }))}
            placeholder="Diapers"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <select
            value={daycareForm.mood}
            onChange={(event) => setDaycareForm((current) => ({ ...current, mood: event.target.value as DaycareMood }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          >
            <option value="settled">Settled</option>
            <option value="sleepy">Sleepy</option>
            <option value="playful">Playful</option>
            <option value="fussy">Fussy</option>
            <option value="needs-follow-up">Needs follow-up</option>
          </select>
          <textarea
            value={daycareForm.summary}
            onChange={(event) => setDaycareForm((current) => ({ ...current, summary: event.target.value }))}
            rows={4}
            placeholder="Away-parent summary"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-primary dark:border-zinc-800"
          />
          <button
            onClick={addDaycareUpdate}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            <Plus size={16} />
            Save Daycare Update
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {latestDaycare && (
          <div className="rounded-[2rem] border border-border-gray bg-primary p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Away-parent digest</p>
            <h3 className="mt-2 font-headline text-2xl font-black tracking-tight">Since drop-off</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/85">
              {latestDaycare.meals || 'No meals logged'}; {latestDaycare.naps || 'no naps logged'}; {latestDaycare.diapers || 'no diapers logged'}. Mood: {latestDaycare.mood.replace('-', ' ')}.
            </p>
          </div>
        )}
        {workspace.daycareUpdates.map((update) => (
          <article key={update.id} className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-headline text-xl font-black text-foreground">{update.caregiverName}</p>
                <p className="text-xs font-black uppercase tracking-widest text-text-light">
                  {update.dropoffTime} to {update.pickupTime} | {formatDate(update.createdAt)}
                </p>
              </div>
              <button
                onClick={() => deleteDaycareUpdate(update.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray text-text-dim dark:border-zinc-800"
                title="Delete daycare update"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <p className="rounded-2xl bg-background p-3 text-xs font-bold text-text-dim dark:bg-zinc-950">{update.meals || 'No meals'}</p>
              <p className="rounded-2xl bg-background p-3 text-xs font-bold text-text-dim dark:bg-zinc-950">{update.naps || 'No naps'}</p>
              <p className="rounded-2xl bg-background p-3 text-xs font-bold text-text-dim dark:bg-zinc-950">{update.diapers || 'No diapers'}</p>
            </div>
            {update.summary && <p className="mt-4 text-sm font-semibold leading-relaxed text-text-dim">{update.summary}</p>}
          </article>
        ))}
      </section>
    </div>
  );

  const renderMilestones = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {renderMetric('Observed', `${observedMilestones}`, 'Milestones marked observed.', <CheckCircle size={18} />)}
        {renderMetric('Questions', `${providerQuestions}`, 'Items to raise at the next visit.', <Shield size={18} />)}
        {renderMetric('Checklist', `${workspace.milestones.length}`, 'Starter developmental checks.', <ClipboardList size={18} />)}
      </div>
      <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <p className="text-sm font-semibold leading-relaxed text-text-dim">
          This is a tracking aid and provider-visit prep surface. It does not diagnose delays or replace clinical guidance.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {workspace.milestones.map((milestone) => (
          <article key={milestone.id} className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">{milestone.ageBand}</p>
                <h3 className="mt-1 font-headline text-xl font-black tracking-tight text-foreground">{milestone.label}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(milestone.status)}`}>
                {milestone.status.replace('-', ' ')}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['watching', 'observed', 'provider-question'] as MilestoneStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateMilestoneStatus(milestone.id, status)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                    milestone.status === status ? 'bg-primary text-white' : 'bg-background text-text-dim dark:bg-zinc-950'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
            <textarea
              value={milestone.notes}
              onChange={(event) => updateMilestoneNotes(milestone.id, event.target.value)}
              rows={3}
              placeholder="Observation, example, or provider question"
              className="mt-4 w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-primary dark:border-zinc-800"
            />
          </article>
        ))}
      </div>
    </div>
  );

  const renderSurfaces = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {renderMetric('Ready specs', `${readyQuickActions}`, 'Native quick-action items ready for implementation.', <Watch size={18} />)}
        {renderMetric('Needs native work', `${workspace.quickActions.filter((item) => item.status === 'needs-native-work').length}`, 'Items requiring platform-specific code.', <Package size={18} />)}
        {renderMetric('Planned', `${workspace.quickActions.filter((item) => item.status === 'planned').length}`, 'Items still in spec mode.', <Calendar size={18} />)}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {workspace.quickActions.map((action) => (
          <article key={action.id} className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">{action.surface.replace('-', ' ')}</p>
                <h3 className="mt-1 font-headline text-xl font-black tracking-tight text-foreground">{action.label}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(action.status)}`}>
                {action.status.replace('-', ' ')}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-text-dim">{action.notes}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['planned', 'ready', 'needs-native-work'] as QuickActionStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateQuickActionStatus(action.id, status)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                    action.status === status ? 'bg-primary text-white' : 'bg-background text-text-dim dark:bg-zinc-950'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderAssistant = () => (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <h3 className="font-headline text-xl font-black tracking-tight text-foreground">Record-Grounded Assistant</h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-text-dim">
          Ask from this workspace first. The answer cites logged capture, daycare, milk, milestone, and recovery data.
        </p>
        <textarea
          value={assistantQuestion}
          onChange={(event) => setAssistantQuestion(event.target.value)}
          rows={5}
          className="mt-5 w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-primary dark:border-zinc-800"
        />
        <button
          onClick={generateAssistantAnswer}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
        >
          <MessageCircle size={16} />
          Answer From Records
        </button>
      </section>
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light">Question</p>
        <h3 className="mt-2 font-headline text-2xl font-black tracking-tight text-foreground">{assistantQuestion}</h3>
        <p className="mt-5 rounded-2xl bg-background p-5 text-sm font-semibold leading-relaxed text-text-dim dark:bg-zinc-950">
          {assistantAnswer || 'Run the assistant after adding records to see a grounded summary.'}
        </p>
      </section>
    </div>
  );

  const renderRecovery = () => (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <h3 className="font-headline text-xl font-black tracking-tight text-foreground">Parent Recovery Plan</h3>
        <div className="mt-5 grid gap-3">
          <input
            type="number"
            value={recoveryDraft.hydrationTarget}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, hydrationTarget: Number(event.target.value) }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            type="number"
            value={recoveryDraft.mealTarget}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, mealTarget: Number(event.target.value) }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            type="time"
            value={recoveryDraft.restWindow}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, restWindow: event.target.value }))}
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            value={recoveryDraft.medicationReminder}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, medicationReminder: event.target.value }))}
            placeholder="Medication reminder"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <input
            value={recoveryDraft.supportContact}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, supportContact: event.target.value }))}
            placeholder="Support contact"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary dark:border-zinc-800"
          />
          <textarea
            value={recoveryDraft.notes}
            onChange={(event) => setRecoveryDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={4}
            placeholder="Support handoff notes"
            className="rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-primary dark:border-zinc-800"
          />
          <button
            onClick={saveRecoveryPlan}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            <CheckCircle size={16} />
            Save Recovery Plan
          </button>
        </div>
      </section>
      <section className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light">Today support card</p>
        <h3 className="mt-2 font-headline text-2xl font-black tracking-tight text-foreground">{babyName}'s care team</h3>
        <div className="mt-5 space-y-3">
          <p className="rounded-2xl bg-background p-4 text-sm font-semibold text-text-dim dark:bg-zinc-950">
            Hydration target: {workspace.recoveryPlan.hydrationTarget} cups. Meal target: {workspace.recoveryPlan.mealTarget}.
          </p>
          <p className="rounded-2xl bg-background p-4 text-sm font-semibold text-text-dim dark:bg-zinc-950">
            Protected rest window: {workspace.recoveryPlan.restWindow || 'Not set'}.
          </p>
          <p className="rounded-2xl bg-background p-4 text-sm font-semibold text-text-dim dark:bg-zinc-950">
            Medication reminder: {workspace.recoveryPlan.medicationReminder || 'None set'}.
          </p>
          <p className="rounded-2xl bg-background p-4 text-sm font-semibold text-text-dim dark:bg-zinc-950">
            Support contact: {workspace.recoveryPlan.supportContact || 'None set'}.
          </p>
          {workspace.recoveryPlan.notes && (
            <p className="rounded-2xl bg-primary/10 p-4 text-sm font-semibold leading-relaxed text-primary">
              {workspace.recoveryPlan.notes}
            </p>
          )}
        </div>
      </section>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'milk':
        return renderMilk();
      case 'daycare':
        return renderDaycare();
      case 'milestones':
        return renderMilestones();
      case 'surfaces':
        return renderSurfaces();
      case 'assistant':
        return renderAssistant();
      case 'recovery':
        return renderRecovery();
      default:
        return renderCapture();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="sticky top-0 z-30 border-b border-border-gray bg-background/95 px-4 py-4 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray bg-surface text-primary shadow-sm dark:border-zinc-800"
            title="Back to dashboard"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-light">Competitive Feature Hub</p>
            <h1 className="truncate font-headline text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Care Expansion for {babyName}
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {renderMetric('Capture notes', `${workspace.captureEntries.length}`, 'Voice, text, and image review cards.', <Mic size={18} />)}
          {renderMetric('Milk available', `${milkTotals.available} ml`, 'Inventory ready for bottle prep.', <Droplets size={18} />)}
          {renderMetric('Daycare sheets', `${workspace.daycareUpdates.length}`, 'Away-parent daily updates.', <ClipboardList size={18} />)}
          {renderMetric('Quick surfaces', `${readyQuickActions}/${workspace.quickActions.length}`, 'Watch, lock-screen, and shortcut specs.', <Watch size={18} />)}
        </section>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                  : 'border-border-gray bg-surface text-text-dim dark:border-zinc-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {renderActiveTab()}
      </main>
    </div>
  );
}
