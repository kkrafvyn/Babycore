import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  Droplets,
  Heart,
  Moon,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';

import {
  createParentWellnessEntry,
  deleteParentWellnessEntry,
  getParentWellnessEntries,
  getParentWellnessRecommendations,
  getParentWellnessSummary,
  type ParentRecoveryStatus,
  type ParentWellnessEntry,
  type ParentWellnessMood,
} from '@/lib/parent-wellness';

interface ParentWellnessProps {
  babyId: string;
  babyName: string;
  onBack: () => void;
}

interface WellnessFormState {
  caregiverName: string;
  mood: ParentWellnessMood;
  stressLevel: number;
  sleepHours: string;
  pumpingSessions: string;
  waterIntake: string;
  mealsCompleted: string;
  recoveryStatus: ParentRecoveryStatus;
  notes: string;
}

const moodOptions: Array<{ value: ParentWellnessMood; label: string; description: string }> = [
  { value: 'rested', label: 'Rested', description: 'Enough recovery to stay clear-headed.' },
  { value: 'steady', label: 'Steady', description: 'Managing the day without heavy strain.' },
  { value: 'hopeful', label: 'Hopeful', description: 'Feeling encouraged and supported.' },
  { value: 'drained', label: 'Drained', description: 'Running low on energy or patience.' },
  { value: 'overwhelmed', label: 'Overwhelmed', description: 'Needs extra support and handoff today.' },
];

const recoveryOptions: Array<{ value: ParentRecoveryStatus; label: string }> = [
  { value: 'recovering', label: 'Recovering' },
  { value: 'steady', label: 'Steady' },
  { value: 'strong', label: 'Strong' },
];

const createDefaultForm = (): WellnessFormState => ({
  caregiverName: 'Parent',
  mood: 'steady',
  stressLevel: 5,
  sleepHours: '',
  pumpingSessions: '',
  waterIntake: '',
  mealsCompleted: '',
  recoveryStatus: 'steady',
  notes: '',
});

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const moodLabelMap: Record<ParentWellnessMood, string> = {
  rested: 'Rested',
  steady: 'Steady',
  hopeful: 'Hopeful',
  drained: 'Drained',
  overwhelmed: 'Overwhelmed',
};

export function ParentWellness({ babyId, babyName, onBack }: ParentWellnessProps) {
  const [entries, setEntries] = useState<ParentWellnessEntry[]>(() => getParentWellnessEntries(babyId));
  const [form, setForm] = useState<WellnessFormState>(() => createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const summary = useMemo(() => getParentWellnessSummary(babyId), [babyId, entries]);
  const recommendations = useMemo(() => getParentWellnessRecommendations(summary), [summary]);

  const refreshEntries = () => {
    setRefreshing(true);
    setEntries(getParentWellnessEntries(babyId));
    setRefreshing(false);
  };

  const handleSave = async () => {
    const sleepHours = Number(form.sleepHours);
    if (!Number.isFinite(sleepHours) || sleepHours <= 0) {
      alert('Add the number of hours slept so the wellness check-in is useful.');
      return;
    }

    setSaving(true);
    try {
      createParentWellnessEntry({
        babyId,
        caregiverName: form.caregiverName,
        mood: form.mood,
        stressLevel: form.stressLevel,
        sleepHours,
        pumpingSessions: Number(form.pumpingSessions) || 0,
        waterIntake: Number(form.waterIntake) || 0,
        mealsCompleted: Number(form.mealsCompleted) || 0,
        recoveryStatus: form.recoveryStatus,
        notes: form.notes,
      });
      setEntries(getParentWellnessEntries(babyId));
      setForm((previous) => ({
        ...createDefaultForm(),
        caregiverName: previous.caregiverName,
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entryId: string) => {
    const confirmed = window.confirm('Remove this wellness check-in?');
    if (!confirmed) return;
    deleteParentWellnessEntry(entryId);
    setEntries(getParentWellnessEntries(babyId));
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-gray bg-background/85 px-3 backdrop-blur-xl dark:border-zinc-800/50 sm:h-20 sm:px-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="p-2 text-primary transition-all hover:scale-110 active:scale-95 dark:text-zinc-400"
          >
            <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
          </button>
          <span className="text-xl font-headline font-black tracking-tight text-foreground">
            Parent Wellness
          </span>
        </div>
        <button
          onClick={refreshEntries}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray bg-surface-gray text-foreground transition-all disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          title="Refresh wellness check-ins"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-3 pb-24 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Care For The Caregiver</p>
            <h2 className="mt-1 text-2xl font-headline font-black tracking-tight text-foreground">
              {babyName}'s support rhythm
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-text-dim">
              Track sleep, stress, hydration, pumping load, and recovery so hard stretches show up early instead of
              becoming invisible background strain.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <Moon className="h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Sleep</span>
              </div>
              <p className="mt-3 text-2xl font-headline font-black text-foreground">
                {summary.averageSleepHours ? `${summary.averageSleepHours}h` : '--'}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-text-dim">
                Avg nightly recovery
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <Heart className="h-5 w-5 text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Stress</span>
              </div>
              <p className="mt-3 text-2xl font-headline font-black text-foreground">
                {summary.averageStressLevel ? `${summary.averageStressLevel}/10` : '--'}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-text-dim">
                High-stress check-ins: {summary.highStressCount}
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <Droplets className="h-5 w-5 text-sky-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Hydration</span>
              </div>
              <p className="mt-3 text-2xl font-headline font-black text-foreground">
                {summary.averageWaterIntake ? `${summary.averageWaterIntake}` : '--'}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-text-dim">
                Avg glasses or bottles
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <Activity className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Load</span>
              </div>
              <p className="mt-3 text-2xl font-headline font-black text-foreground">
                {summary.totalPumpingSessions}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-text-dim">
                Total pumping sessions logged
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Daily Check-In</p>
                  <h3 className="mt-1 text-xl font-headline font-black text-foreground">Log today's recovery</h3>
                </div>
                <div className="rounded-full bg-surface-gray px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-dim dark:bg-zinc-900">
                  {summary.checkInCount} entries
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Caregiver</span>
                  <input
                    value={form.caregiverName}
                    onChange={(event) => setForm((previous) => ({ ...previous, caregiverName: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border-gray bg-surface-gray px-4 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="Parent or caregiver name"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Sleep Hours</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.sleepHours}
                    onChange={(event) => setForm((previous) => ({ ...previous, sleepHours: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border-gray bg-surface-gray px-4 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="6.5"
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Stress Level</span>
                  <span className="text-sm font-black text-foreground">{form.stressLevel}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.stressLevel}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, stressLevel: Number(event.target.value) }))
                  }
                  className="mt-3 h-2 w-full accent-secondary"
                />
              </div>

              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Mood</span>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {moodOptions.map((option) => {
                    const active = form.mood === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setForm((previous) => ({ ...previous, mood: option.value }))}
                        className={`rounded-2xl border p-3 text-left transition-all ${
                          active
                            ? 'border-secondary bg-secondary/10'
                            : 'border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900'
                        }`}
                      >
                        <p className="text-sm font-black text-foreground">{option.label}</p>
                        <p className="mt-1 text-[11px] font-semibold text-text-dim">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Pumping Sessions</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.pumpingSessions}
                    onChange={(event) => setForm((previous) => ({ ...previous, pumpingSessions: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border-gray bg-surface-gray px-4 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Water</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={form.waterIntake}
                    onChange={(event) => setForm((previous) => ({ ...previous, waterIntake: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border-gray bg-surface-gray px-4 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="5"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Meals</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={form.mealsCompleted}
                    onChange={(event) => setForm((previous) => ({ ...previous, mealsCompleted: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border-gray bg-surface-gray px-4 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="3"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Recovery Status</span>
                <div className="grid grid-cols-3 gap-2">
                  {recoveryOptions.map((option) => {
                    const active = form.recoveryStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setForm((previous) => ({ ...previous, recoveryStatus: option.value }))}
                        className={`h-11 rounded-2xl border text-[11px] font-black uppercase tracking-wider ${
                          active
                            ? 'border-secondary bg-secondary text-white'
                            : 'border-border-gray bg-surface-gray text-foreground dark:border-zinc-700 dark:bg-zinc-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-border-gray bg-surface-gray px-4 py-3 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Add anything that would help another caregiver support you today."
                />
              </label>

              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-black uppercase tracking-[0.18em] text-background transition-all hover:opacity-95 disabled:opacity-60"
              >
                {saving ? 'Saving Check-In' : 'Save Wellness Check-In'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Pattern Guidance</p>
                    <h3 className="mt-1 text-lg font-headline font-black text-foreground">What needs support</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {recommendations.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.4rem] border border-border-gray bg-surface-gray px-4 py-3 text-sm font-semibold text-text-dim dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    Sleep Debt
                  </p>
                  <p className="mt-1 text-lg font-headline font-black text-amber-900 dark:text-amber-100">
                    {summary.sleepDebtHours ? `${summary.sleepDebtHours}h to recover` : 'No meaningful debt logged'}
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Recent Check-Ins</p>
                <h3 className="mt-1 text-lg font-headline font-black text-foreground">Latest entries</h3>

                <div className="mt-4 space-y-3">
                  {entries.length === 0 && (
                    <div className="rounded-[1.4rem] border border-dashed border-border-gray px-4 py-6 text-sm font-semibold text-text-dim dark:border-zinc-700">
                      No wellness check-ins yet. Add the first one to start surfacing recovery patterns.
                    </div>
                  )}

                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[1.4rem] border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">
                            {entry.caregiverName} · {moodLabelMap[entry.mood]}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-text-dim">
                            {relativeTime(entry.loggedAt)} · Stress {entry.stressLevel}/10 · Sleep {entry.sleepHours}h
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="rounded-full p-2 text-text-light transition-all hover:bg-white dark:hover:bg-zinc-800"
                          title="Remove entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-semibold text-text-dim">
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">Water {entry.waterIntake}</div>
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">Meals {entry.mealsCompleted}</div>
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">Pump {entry.pumpingSessions}</div>
                      </div>

                      {entry.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary"
                            >
                              {tag.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {entry.notes && (
                        <p className="mt-3 text-sm font-semibold text-text-dim">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
