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
import { COUNTRIES } from '../../lib/countries';
import { resolveVaccinationSchedule } from '../../lib/vaccination-schedule-resolver';
import type { VaccinationRecord } from '../../types';
import type { VaccineSchedule } from '../../lib/vaccination-data';
import { createCareApprovalRequest } from '@/lib/care-advanced-api';
import { getCurrentUser } from '@/lib/supabase';

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
  aliases: string[];
  scheduleTag: string;
}

type ResolvedVaccineStatus = 'scheduled' | 'given' | 'overdue' | 'skipped';
type VaccineRecordWithMeta = VaccinationRecord & {
  isVirtual: boolean;
  source: 'template' | 'custom';
  templateNote?: string;
  scheduleTag?: string;
};

const MotionDiv = motion.div as any;
const DAY_MS = 24 * 60 * 60 * 1000;
const TEMPLATE_TAG_PREFIX = '[schedule-template:';

function decodeLegacyUtf8(value: string): string {
  if (!/[\u00C3\u00E2]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
}

function normalizeVaccineName(value: string): string {
  return value.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
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

function toWholeDays(value: number): number {
  return Math.max(0, Math.floor(value / DAY_MS));
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

function extractScheduleTag(notes?: string): string | undefined {
  if (!notes) return undefined;
  const start = notes.indexOf(TEMPLATE_TAG_PREFIX);
  if (start < 0) return undefined;
  const end = notes.indexOf(']', start);
  if (end < 0) return undefined;
  return notes.slice(start + TEMPLATE_TAG_PREFIX.length, end);
}

function withScheduleTag(notes: string | undefined, scheduleTag: string): string {
  const clean = (notes || '').trim();
  const tag = `${TEMPLATE_TAG_PREFIX}${scheduleTag}]`;
  if (clean.includes(tag)) return clean;
  return clean ? `${clean} ${tag}` : tag;
}

function scheduleDoseToOffsetDays(dose: VaccineSchedule['schedule'][number]): number {
  if (dose.ageYears && dose.ageYears > 0) return dose.ageYears * 365;
  if (dose.ageMonths && dose.ageMonths > 0) return dose.ageMonths * 30;
  if (dose.ageWeeks && dose.ageWeeks > 0) return dose.ageWeeks * 7;
  return 0;
}

function buildTemplates(schedules: VaccineSchedule[], scheduleCode: string): VaccineTemplate[] {
  return schedules.flatMap((vaccine) =>
    vaccine.schedule.map((dose) => {
      const hasMultiple = dose.doses > 1;
      const baseName = vaccine.name;
      const label = hasMultiple ? `${baseName} - Dose ${dose.doseNumber}` : baseName;
      const shortLabel = hasMultiple
        ? `${vaccine.shortName} Dose ${dose.doseNumber}`
        : vaccine.shortName;
      const scheduleTag = `${scheduleCode}:${vaccine.id}:dose-${dose.doseNumber}`;

      return {
        id: `${vaccine.id}-dose-${dose.doseNumber}`,
        name: label,
        dueOffsetDays: scheduleDoseToOffsetDays(dose),
        note: vaccine.descriptions.en,
        aliases: [label, shortLabel, `${baseName} Dose ${dose.doseNumber}`],
        scheduleTag,
      };
    }),
  );
}

function getCountryName(countryCode?: string): string {
  if (!countryCode) return 'Unknown';
  const matched = (COUNTRIES as Array<{ code: string; name: string }>).find(
    (country) => country.code === countryCode,
  );
  return decodeLegacyUtf8(matched?.name || countryCode);
}

async function shouldRequireParentApprovalForVaccinationEdit(): Promise<boolean> {
  const user = await getCurrentUser();
  const profileType = String(user?.user_metadata?.onboarding_profile_type || '').toLowerCase();
  return profileType === 'doctor' || profileType === 'caregiver';
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
  const [selectedTemplateTag, setSelectedTemplateTag] = useState<string | undefined>(undefined);

  const scheduleContext = useMemo(
    () => resolveVaccinationSchedule(currentBaby?.country),
    [currentBaby?.country],
  );

  const vaccineTemplates = useMemo(
    () => buildTemplates(scheduleContext.schedules, scheduleContext.scheduleCode),
    [scheduleContext.schedules, scheduleContext.scheduleCode],
  );

  const recordsWithMeta = useMemo<VaccineRecordWithMeta[]>(() => {
    if (!currentBaby) return [];

    const recordsByTag = new Map<string, VaccinationRecord>();
    const recordsByName = new Map<string, VaccinationRecord>();

    vaccinationRecords.forEach((record) => {
      const tag = extractScheduleTag(record.notes);
      if (tag) {
        recordsByTag.set(tag, record);
      }
      recordsByName.set(normalizeVaccineName(record.name), record);
    });

    const templateRecords: VaccineRecordWithMeta[] = vaccineTemplates.map((template) => {
      const taggedMatch = recordsByTag.get(template.scheduleTag);
      const aliasMatch = template.aliases
        .map((alias) => recordsByName.get(normalizeVaccineName(alias)))
        .find(Boolean);
      const existing = taggedMatch || aliasMatch;

      if (existing) {
        return {
          ...existing,
          isVirtual: false,
          source: 'template',
          templateNote: template.note,
          scheduleTag: template.scheduleTag,
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
        scheduleTag: template.scheduleTag,
      };
    });

    const templateTags = new Set(vaccineTemplates.map((template) => template.scheduleTag));
    const templateNameSet = new Set(
      vaccineTemplates.flatMap((template) => template.aliases.map((alias) => normalizeVaccineName(alias))),
    );

    const customRecords = vaccinationRecords
      .filter((record) => {
        const tag = extractScheduleTag(record.notes);
        if (tag && templateTags.has(tag)) return false;
        return !templateNameSet.has(normalizeVaccineName(record.name));
      })
      .map((record) => ({
        ...record,
        isVirtual: false,
        source: 'custom' as const,
      }));

    return [...templateRecords, ...customRecords].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }, [vaccinationRecords, currentBaby, vaccineTemplates]);

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

  const babyAgeDays = currentBaby
    ? toWholeDays(Date.now() - new Date(currentBaby.dateOfBirth).getTime())
    : 0;

  const catchUpPlan = resolved
    .filter((record) => record.resolvedStatus === 'overdue')
    .slice(0, 6)
    .map((record, index) => {
      const overdueDays = toWholeDays(Date.now() - new Date(record.dueDate).getTime());
      const suggestedDate = new Date(Date.now() + index * 14 * DAY_MS).toISOString();
      const priority = overdueDays > 120 ? 'high' : overdueDays > 45 ? 'medium' : 'normal';
      return {
        record,
        overdueDays,
        suggestedDate,
        priority,
      };
    });

  const openAddModal = () => {
    setEditingRecord(null);
    setSelectedTemplateTag(undefined);
    setName('');
    setDueDate(toDateInputValue(new Date()));
    setGivenDate(toDateInputValue(new Date()));
    setStatus('scheduled');
    setNotes('');
    setShowEditor(true);
  };

  const openEditModal = (record: VaccineRecordWithMeta) => {
    setEditingRecord(record.isVirtual ? null : record);
    setSelectedTemplateTag(record.scheduleTag);
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
    setSelectedTemplateTag(undefined);
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

    const needsApproval = await shouldRequireParentApprovalForVaccinationEdit();
    if (needsApproval) {
      try {
        await createCareApprovalRequest({
          babyId: currentBaby.id,
          requestType: 'vaccination_edit',
          targetTable: 'vaccination_records',
          targetRecordId: editingRecord?.id || null,
          requestedPayload: {
            name: name.trim(),
            dueDate: due.toISOString(),
            status,
            givenDate: status === 'given' ? given.toISOString() : null,
            notes,
            scheduleTag: selectedTemplateTag || null,
          },
          reason: 'Care team requested vaccine schedule update',
        });
        closeEditor();
        alert('Request submitted for parent approval.');
      } catch (error) {
        console.error('Failed to submit approval request:', error);
        alert('Failed to submit approval request.');
      }
      return;
    }

    const nextNotes = selectedTemplateTag ? withScheduleTag(notes, selectedTemplateTag) : notes.trim();

    const payload: VaccinationRecord = {
      id: editingRecord?.id || crypto.randomUUID(),
      babyId: currentBaby.id,
      name: name.trim(),
      dueDate: due.toISOString(),
      status: status === 'given' ? 'given' : status === 'skipped' ? 'skipped' : 'scheduled',
      givenDate: status === 'given' ? given.toISOString() : undefined,
      notes: nextNotes || undefined,
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

    const needsApproval = await shouldRequireParentApprovalForVaccinationEdit();
    if (needsApproval) {
      try {
        await createCareApprovalRequest({
          babyId: currentBaby.id,
          requestType: 'vaccination_edit',
          targetTable: 'vaccination_records',
          targetRecordId: record.isVirtual ? null : record.id,
          requestedPayload: {
            action: 'mark_given',
            name: record.name,
            dueDate: record.dueDate,
            scheduleTag: record.scheduleTag || null,
          },
          reason: 'Care team requested to mark vaccine as given',
        });
        alert('Marked as request. Parent approval is required.');
      } catch (error) {
        console.error('Failed to submit approval request:', error);
        alert('Failed to submit approval request.');
      }
      return;
    }

    const nextNotes = record.scheduleTag
      ? withScheduleTag(record.notes, record.scheduleTag)
      : record.notes;

    const payload: VaccinationRecord = {
      id: record.isVirtual ? crypto.randomUUID() : record.id,
      babyId: currentBaby.id,
      name: record.name,
      dueDate: record.dueDate,
      status: 'given',
      givenDate: new Date().toISOString(),
      notes: nextNotes,
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
              {completedCount} completed - {scheduledCount} upcoming
            </h2>

            <div className="mt-4 rounded-2xl border border-border-gray dark:border-zinc-800 bg-surface-gray dark:bg-zinc-900 p-4 space-y-1.5">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Schedule Context</p>
              <p className="text-sm font-black text-foreground">
                {getCountryName(currentBaby?.country)} ({scheduleContext.countryCode})
              </p>
              <p className="text-[11px] font-bold text-text-dim">
                Region: {scheduleContext.regionName} - Schedule: {scheduleContext.scheduleName}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                Source: {scheduleContext.source}
              </p>
            </div>

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

            <div className="mt-5 rounded-2xl border border-border-gray dark:border-zinc-800 bg-surface-gray dark:bg-zinc-900 p-4 space-y-2">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Country Catch-up Plan</p>
              <p className="text-[11px] font-bold text-text-dim">
                Baby age: {Math.floor(babyAgeDays / 30)} months ({babyAgeDays} days)
              </p>
              {catchUpPlan.length === 0 ? (
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Great progress. No overdue vaccines detected.
                </p>
              ) : (
                <div className="space-y-2">
                  {catchUpPlan.map((item) => (
                    <div
                      key={item.record.id}
                      className="rounded-xl border border-border-gray dark:border-zinc-800 bg-surface dark:bg-zinc-950 p-3"
                    >
                      <p className="text-xs font-black text-foreground">{item.record.name}</p>
                      <p className="text-[10px] font-bold text-text-dim mt-1">
                        {item.overdueDays} days overdue - Suggested catch-up by{' '}
                        {new Date(item.suggestedDate).toLocaleDateString()}
                      </p>
                      <p
                        className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                          item.priority === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : item.priority === 'medium'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Priority: {item.priority}
                      </p>
                    </div>
                  ))}
                  <p className="text-[10px] font-bold text-text-dim">
                    Confirm exact spacing with your local pediatrician or immunization clinic.
                  </p>
                </div>
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
                    placeholder="Example: MMR Dose 1"
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
