import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Pencil,
  Plus,
  ShieldCheck,
  Syringe,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import { addVaccinationRecord, deleteVaccinationRecord, updateVaccinationRecord } from '../../lib/supabase-storage';
import type { VaccinationRecord } from '../../types';

interface VaccinationCalendarProps {
  babyId?: string;
  babyName?: string;
  onBack?: () => void;
}

interface VaccineTemplate {
  id: string;
  name: string;
  dueOffsetDays: number;
  note: string;
}

type ResolvedVaccineStatus = 'scheduled' | 'given' | 'overdue' | 'skipped';
type VaccineRecordWithMeta = VaccinationRecord & {
  isVirtual: boolean;
  source: 'template' | 'custom';
  templateNote?: string;
};

const MotionDiv = motion.div as any;
const DAY_MS = 24 * 60 * 60 * 1000;

const GLOBAL_VACCINE_TEMPLATES: VaccineTemplate[] = [
  { id: 'birth-bcg', name: 'BCG', dueOffsetDays: 0, note: 'Birth dose' },
  { id: 'birth-hepb', name: 'Hepatitis B (Dose 1)', dueOffsetDays: 0, note: 'Birth dose' },
  { id: 'w6-dtap', name: 'DTaP (Dose 1)', dueOffsetDays: 42, note: 'Around 6 weeks' },
  { id: 'w6-polio', name: 'Polio (Dose 1)', dueOffsetDays: 42, note: 'Around 6 weeks' },
  { id: 'w10-dtap', name: 'DTaP (Dose 2)', dueOffsetDays: 70, note: 'Around 10 weeks' },
  { id: 'w10-polio', name: 'Polio (Dose 2)', dueOffsetDays: 70, note: 'Around 10 weeks' },
  { id: 'w14-dtap', name: 'DTaP (Dose 3)', dueOffsetDays: 98, note: 'Around 14 weeks' },
  { id: 'w14-polio', name: 'Polio (Dose 3)', dueOffsetDays: 98, note: 'Around 14 weeks' },
  { id: 'm6-flu', name: 'Influenza', dueOffsetDays: 180, note: 'Starting at 6 months' },
  { id: 'm9-measles', name: 'Measles', dueOffsetDays: 270, note: 'Around 9 months' },
  { id: 'm12-mmr', name: 'MMR', dueOffsetDays: 365, note: 'Around 12 months' },
  { id: 'm12-pcv', name: 'Pneumococcal Booster', dueOffsetDays: 365, note: 'Around 12 months' },
  { id: 'm15-varicella', name: 'Varicella', dueOffsetDays: 450, note: 'Around 15 months' },
  { id: 'm18-dtapb', name: 'DTaP Booster', dueOffsetDays: 540, note: 'Around 18 months' },
];

function normalizeVaccineName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toDateInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function startOfTodayMs(): number {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value.getTime();
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

function resolveStatus(record: VaccinationRecord): ResolvedVaccineStatus {
  if (record.status === 'given' || record.status === 'skipped') {
    return record.status;
  }
  return new Date(record.dueDate).getTime() < startOfTodayMs() ? 'overdue' : 'scheduled';
}

function statusBadgeClass(status: ResolvedVaccineStatus): string {
  if (status === 'given') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20';
  if (status === 'overdue') return 'bg-red-50 text-red-600 dark:bg-red-900/20';
  if (status === 'skipped') return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20';
}

export const VaccinationCalendar: React.FC<VaccinationCalendarProps> = ({ onBack }) => {
  const { currentBaby, vaccinationRecords, refreshAllLogs } = useAppContext();
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState(toDateInputValue(new Date()));
  const [status, setStatus] = useState<'scheduled' | 'given' | 'skipped'>('scheduled');
  const [givenDate, setGivenDate] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState('');

  const recordsWithMeta = useMemo<VaccineRecordWithMeta[]>(() => {
    if (!currentBaby) return [];

    const byName = new Map<string, VaccinationRecord>();
    vaccinationRecords.forEach((record) => {
      byName.set(normalizeVaccineName(record.name), record);
    });

    const templateRecords: VaccineRecordWithMeta[] = GLOBAL_VACCINE_TEMPLATES.map((template) => {
      const existing = byName.get(normalizeVaccineName(template.name));
      if (existing) {
        return {
          ...existing,
          isVirtual: false,
          source: 'template',
          templateNote: template.note,
        };
      }

      return {
        id: `virtual-${template.id}`,
        babyId: currentBaby.id,
        name: template.name,
        dueDate: addDays(currentBaby.dateOfBirth, template.dueOffsetDays),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        isVirtual: true,
        source: 'template',
        templateNote: template.note,
      };
    });

    const templateNameSet = new Set(
      GLOBAL_VACCINE_TEMPLATES.map((template) => normalizeVaccineName(template.name)),
    );
    const customRecords = vaccinationRecords
      .filter((record) => !templateNameSet.has(normalizeVaccineName(record.name)))
      .map((record) => ({
        ...record,
        isVirtual: false,
        source: 'custom' as const,
      }));

    return [...templateRecords, ...customRecords].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }, [vaccinationRecords, currentBaby]);

  const resolved = useMemo(
    () =>
      recordsWithMeta.map((record) => ({
        ...record,
        resolvedStatus: resolveStatus(record),
      })),
    [recordsWithMeta],
  );

  const completedCount = resolved.filter((record) => record.resolvedStatus === 'given').length;
  const overdueCount = resolved.filter((record) => record.resolvedStatus === 'overdue').length;
  const scheduledCount = resolved.filter((record) => record.resolvedStatus === 'scheduled').length;

  const nextDue = resolved
    .filter((record) => record.resolvedStatus === 'scheduled' || record.resolvedStatus === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const openAddModal = () => {
    setEditingRecord(null);
    setName('');
    setDueDate(toDateInputValue(new Date()));
    setGivenDate(toDateInputValue(new Date()));
    setStatus('scheduled');
    setNotes('');
    setShowEditor(true);
  };

  const openEditModal = (record: VaccineRecordWithMeta) => {
    setEditingRecord(record.isVirtual ? null : record);
    setName(record.name);
    setDueDate(toDateInputValue(new Date(record.dueDate)));
    setStatus(record.status === 'given' || record.status === 'skipped' ? record.status : 'scheduled');
    setGivenDate(toDateInputValue(new Date(record.givenDate || new Date())));
    setNotes(record.notes || '');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingRecord(null);
  };

  const saveRecord = async () => {
    if (!currentBaby) return;
    if (!name.trim()) {
      alert('Please enter a vaccine name.');
      return;
    }

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      alert('Please enter a valid due date.');
      return;
    }

    const given = new Date(givenDate);
    if (status === 'given' && Number.isNaN(given.getTime())) {
      alert('Please enter a valid given date.');
      return;
    }

    const payload: VaccinationRecord = {
      id: editingRecord?.id || crypto.randomUUID(),
      babyId: currentBaby.id,
      name: name.trim(),
      dueDate: due.toISOString(),
      status: status === 'given' ? 'given' : status === 'skipped' ? 'skipped' : 'scheduled',
      givenDate: status === 'given' ? given.toISOString() : undefined,
      notes: notes.trim() || undefined,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (editingRecord) {
        await updateVaccinationRecord(payload);
      } else {
        await addVaccinationRecord(payload);
      }

      closeEditor();
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to save vaccination record:', error);
    } finally {
      setSaving(false);
    }
  };

  const markGiven = async (record: VaccineRecordWithMeta) => {
    if (!currentBaby) return;

    const payload: VaccinationRecord = {
      id: record.isVirtual ? crypto.randomUUID() : record.id,
      babyId: currentBaby.id,
      name: record.name,
      dueDate: record.dueDate,
      status: 'given',
      givenDate: new Date().toISOString(),
      notes: record.notes,
      createdAt: record.isVirtual ? new Date().toISOString() : record.createdAt,
    };

    try {
      if (record.isVirtual) {
        await addVaccinationRecord(payload);
      } else {
        await updateVaccinationRecord(payload);
      }
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to mark vaccine as given:', error);
    }
  };

  const removeRecord = async (record: VaccineRecordWithMeta) => {
    if (record.isVirtual) return;
    if (!window.confirm('Delete this vaccination record?')) return;

    try {
      await deleteVaccinationRecord(record.id);
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to delete vaccination record:', error);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Vaccines</span>
        </div>

        <button
          onClick={openAddModal}
          className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-14">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="bg-surface rounded-[3rem] p-8 border border-border-gray dark:border-zinc-800 shadow-sm">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Immunization Overview</p>
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tight mt-3">
              {completedCount} completed • {scheduledCount} upcoming
            </h2>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="bg-surface-gray dark:bg-zinc-900 p-4 rounded-2xl border border-border-gray dark:border-zinc-800 text-center">
                <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Given</p>
                <p className="text-lg font-headline font-black text-foreground">{completedCount}</p>
              </div>
              <div className="bg-surface-gray dark:bg-zinc-900 p-4 rounded-2xl border border-border-gray dark:border-zinc-800 text-center">
                <Clock3 size={18} className="mx-auto text-amber-500 mb-2" />
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Due</p>
                <p className="text-lg font-headline font-black text-foreground">{scheduledCount}</p>
              </div>
              <div className="bg-surface-gray dark:bg-zinc-900 p-4 rounded-2xl border border-border-gray dark:border-zinc-800 text-center">
                <AlertTriangle size={18} className="mx-auto text-red-500 mb-2" />
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Overdue</p>
                <p className="text-lg font-headline font-black text-foreground">{overdueCount}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border-gray dark:border-zinc-800 bg-surface-gray dark:bg-zinc-900 p-4">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Next Vaccine</p>
              {nextDue ? (
                <>
                  <p className="text-lg font-headline font-black text-foreground mt-1">{nextDue.name}</p>
                  <p className="text-[11px] font-bold text-text-dim mt-1">
                    Due {new Date(nextDue.dueDate).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-text-dim mt-1">No upcoming vaccines.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-headline font-black text-foreground tracking-tighter">Schedule</h2>
              <button onClick={openAddModal} className="text-[10px] font-black uppercase tracking-widest text-secondary">
                Add Vaccine
              </button>
            </div>

            {resolved.length === 0 ? (
              <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-8 text-center">
                <p className="text-sm font-bold text-text-light">No vaccination records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resolved.map((record) => (
                  <div
                    key={record.id}
                    className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                          {record.resolvedStatus === 'given' ? (
                            <CheckCircle2 size={18} />
                          ) : record.resolvedStatus === 'overdue' ? (
                            <AlertTriangle size={18} />
                          ) : (
                            <Syringe size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-headline font-black text-foreground truncate">{record.name}</p>
                          <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-1">
                            Due {new Date(record.dueDate).toLocaleDateString()}
                          </p>
                          {record.givenDate && (
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                              Given {new Date(record.givenDate).toLocaleDateString()}
                            </p>
                          )}
                          {record.templateNote && (
                            <p className="text-[10px] font-bold text-text-dim mt-1">{record.templateNote}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${statusBadgeClass(
                          record.resolvedStatus,
                        )}`}
                      >
                        {record.resolvedStatus}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openEditModal(record)}
                        className="h-9 px-3 rounded-xl bg-surface-gray dark:bg-zinc-900 border border-border-gray dark:border-zinc-800 text-[9px] font-black uppercase tracking-widest text-text-light flex items-center gap-1.5"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>

                      <div className="flex items-center gap-2">
                        {record.resolvedStatus !== 'given' && record.resolvedStatus !== 'skipped' && (
                          <button
                            onClick={() => markGiven(record)}
                            className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                          >
                            <ShieldCheck size={13} />
                            Mark Given
                          </button>
                        )}

                        {!record.isVirtual && (
                          <button
                            onClick={() => removeRecord(record)}
                            className="h-9 w-9 rounded-xl bg-surface-gray dark:bg-zinc-900 border border-border-gray dark:border-zinc-800 text-text-light flex items-center justify-center"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showEditor && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 90 }}
              animate={{ y: 0 }}
              exit={{ y: 90 }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full max-w-md bg-surface rounded-[2.6rem] border border-border-gray dark:border-zinc-800 p-7 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-headline font-black text-foreground tracking-tight">
                  {editingRecord ? 'Edit Vaccine' : 'Add Vaccine'}
                </h3>
                <button
                  onClick={closeEditor}
                  className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-900 text-text-light flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Vaccine Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Example: MMR"
                    className="input-onboarding"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="input-onboarding"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'scheduled' | 'given' | 'skipped')}
                    className="input-onboarding"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="given">Given</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                {status === 'given' && (
                  <div>
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                      Given Date
                    </label>
                    <input
                      type="date"
                      value={givenDate}
                      onChange={(event) => setGivenDate(event.target.value)}
                      className="input-onboarding"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes"
                    className="w-full h-24 bg-surface-gray dark:bg-zinc-900 rounded-[1.4rem] p-4 text-sm font-bold text-foreground outline-none resize-none border border-border-gray dark:border-zinc-800"
                  />
                </div>
              </div>

              <button
                onClick={saveRecord}
                disabled={saving}
                className="w-full h-14 rounded-[1.6rem] bg-secondary text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-[0.24em] flex items-center justify-center gap-2 shadow-lg"
              >
                <CalendarClock size={14} />
                {saving ? 'Saving...' : editingRecord ? 'Update Vaccine' : 'Save Vaccine'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
