import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Pill,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import {
  createDoctorVisitRecord,
  getHealthRecords,
  getAllergies,
  getDoctorVisitRecords,
  getMedications,
  getMedicationAdherenceByBaby,
  recordMedicationDose,
  deleteHealthRecord,
  HealthRecord,
  Allergy,
  DoctorVisitRecord,
  DoctorVisitStatus,
  DoctorVisitType,
  Medication,
  MedicationAdherence,
  updateDoctorVisitRecord,
} from '@/lib/health-records-service';
import {
  decideCareApprovalRequest,
  getCareApprovalRequests,
  getCareApprovalTimeline,
  getMedicationDoseLogs,
  getMedicationRefillAlerts,
  getMedicationSchedules,
  logMedicationDoseAdvanced,
  saveMedicationSchedule,
  type CareApprovalRequest,
  type CareApprovalTimelineEvent,
  type MedicationDoseLog,
  type MedicationSchedule,
  type RefillAlert,
} from '@/lib/care-advanced-api';
import { MedicalDisclaimerBanner } from './MedicalDisclaimerBanner';

interface HealthRecordsProps {
  babyId: string;
  babyName: string;
}

interface VisitFormState {
  title: string;
  dateRecorded: string;
  scheduledTime: string;
  appointmentType: DoctorVisitType;
  doctorName: string;
  clinic: string;
  status: DoctorVisitStatus;
  questions: string;
  followUpItems: string;
  notes: string;
}

interface MedicationPlanFormState {
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions: string;
  startDate: string;
  endDate: string;
  dosesPerDay: string;
  stockQuantity: string;
  stockUnit: string;
  refillThreshold: string;
  requiresConfirmation: boolean;
}

export function HealthRecords({ babyId, babyName }: HealthRecordsProps) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisitRecord[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<MedicationAdherence[]>([]);
  const [medicationSchedules, setMedicationSchedules] = useState<MedicationSchedule[]>([]);
  const [advancedDoseLogs, setAdvancedDoseLogs] = useState<MedicationDoseLog[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<RefillAlert[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<CareApprovalRequest[]>([]);
  const [approvalTimeline, setApprovalTimeline] = useState<CareApprovalTimelineEvent[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  >('all');
  const [canDecideApprovals, setCanDecideApprovals] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState<VisitFormState>({
    title: '',
    dateRecorded: new Date().toISOString().split('T')[0],
    scheduledTime: '',
    appointmentType: 'wellness' as DoctorVisitType,
    doctorName: '',
    clinic: '',
    status: 'scheduled' as const,
    questions: '',
    followUpItems: '',
    notes: '',
  });
  const visitPrepTemplates: Record<
    DoctorVisitType,
    { questions: string[]; followUpItems: string[]; title: string }
  > = {
    wellness: {
      title: 'Wellness Visit',
      questions: ['How is growth tracking trending?', 'Are sleep and feeding patterns on target?'],
      followUpItems: ['Update growth chart after the visit', 'Log new guidance from the doctor'],
    },
    sick: {
      title: 'Sick Visit',
      questions: ['What symptoms need urgent follow-up?', 'What home care steps should we monitor closely?'],
      followUpItems: ['Track temperature and symptoms for 48 hours', 'Log prescribed medication schedule'],
    },
    vaccination: {
      title: 'Vaccination Visit',
      questions: ['Which vaccines are due today?', 'What side effects should we watch for?'],
      followUpItems: ['Set reminders for the next dose', 'Note any post-shot symptoms'],
    },
    specialist: {
      title: 'Specialist Visit',
      questions: ['What tests or referrals are needed next?', 'What changes should we make at home?'],
      followUpItems: ['Upload specialist notes', 'Share recommendations with caregivers'],
    },
    follow_up: {
      title: 'Follow-up Visit',
      questions: ['What has improved since the last visit?', 'Do we need another review date?'],
      followUpItems: ['Confirm next review date', 'Update care team with changes'],
    },
    therapy: {
      title: 'Therapy Visit',
      questions: ['Which exercises should continue at home?', 'How should we measure progress?'],
      followUpItems: ['Schedule home practice reminders', 'Record therapist recommendations'],
    },
    other: {
      title: 'Care Visit',
      questions: ['What should we monitor before the next check-in?'],
      followUpItems: ['Log key takeaways from the visit'],
    },
  };
  const today = new Date();
  const toIsoDate = (date: Date) => date.toISOString().split('T')[0];
  const addDays = (baseDate: Date, days: number) => {
    const copy = new Date(baseDate);
    copy.setDate(copy.getDate() + days);
    return copy;
  };
  const createDefaultScheduleForm = (): MedicationPlanFormState => ({
    medicationName: '',
    dosage: '',
    frequency: '',
    route: '',
    instructions: '',
    startDate: toIsoDate(today),
    endDate: '',
    dosesPerDay: '',
    stockQuantity: '',
    stockUnit: 'mL',
    refillThreshold: '',
    requiresConfirmation: true,
  });
  const medicationPlanTemplates = {
    antibiotic: {
      label: 'Antibiotic Course',
      defaults: {
        frequency: 'Twice daily',
        route: 'By mouth',
        instructions: 'Finish the full course and log any side effects or missed doses.',
        startDate: toIsoDate(today),
        endDate: toIsoDate(addDays(today, 7)),
        dosesPerDay: '2',
        stockUnit: 'mL',
      },
    },
    fever: {
      label: 'Fever Support',
      defaults: {
        frequency: 'Every 6 hours as needed',
        route: 'By mouth',
        instructions: 'Log temperature before each dose and note how symptoms respond.',
        startDate: toIsoDate(today),
        dosesPerDay: '4',
        stockUnit: 'mL',
      },
    },
    vitamin: {
      label: 'Daily Vitamin',
      defaults: {
        frequency: 'Once daily',
        route: 'By mouth',
        instructions: 'Give at the same time each day for steady routine tracking.',
        startDate: toIsoDate(today),
        dosesPerDay: '1',
        stockUnit: 'mL',
      },
    },
    inhaler: {
      label: 'Inhaler / Breathing',
      defaults: {
        frequency: 'As directed',
        route: 'Inhaled',
        instructions: 'Track symptoms before and after each treatment session.',
        startDate: toIsoDate(today),
        dosesPerDay: '2',
        stockUnit: 'puffs',
      },
    },
  } satisfies Record<
    string,
    { label: string; defaults: Partial<MedicationPlanFormState> }
  >;
  const [scheduleForm, setScheduleForm] = useState<MedicationPlanFormState>(createDefaultScheduleForm());
  const [recordingMedicationId, setRecordingMedicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
  }, [babyId, approvalFilter]);

  const loadHealthData = async () => {
    setLoading(true);
    const [
      healthRecords,
      doctorVisitData,
      allergyData,
      medicationData,
      adherenceData,
      scheduleData,
      doseLogData,
      refillAlertData,
      approvalData,
      approvalTimelineData,
    ] = await Promise.all([
      getHealthRecords(babyId),
      getDoctorVisitRecords(babyId),
      getAllergies(babyId),
      getMedications(babyId),
      getMedicationAdherenceByBaby(babyId),
      getMedicationSchedules(babyId).catch(() => []),
      getMedicationDoseLogs(babyId).catch(() => []),
      getMedicationRefillAlerts(babyId).catch(() => []),
      getCareApprovalRequests(babyId, approvalFilter).catch(() => ({ requests: [], canDecide: false })),
      getCareApprovalTimeline(babyId).catch(() => []),
    ]);

    setRecords(healthRecords);
    setDoctorVisits(doctorVisitData);
    setAllergies(allergyData);
    setMedications(medicationData);
    setAdherenceRecords(adherenceData);
    setMedicationSchedules(scheduleData);
    setAdvancedDoseLogs(doseLogData);
    setRefillAlerts(refillAlertData);
    setApprovalRequests(approvalData.requests);
    setApprovalTimeline(approvalTimelineData);
    setCanDecideApprovals(approvalData.canDecide);
    setLoading(false);
  };

  const splitMultilineList = (value: string): string[] =>
    value
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);

  const handleSaveVisit = async () => {
    if (!visitForm.title.trim()) {
      alert('Visit title is required.');
      return;
    }

    if (!visitForm.dateRecorded) {
      alert('Visit date is required.');
      return;
    }

    setSavingVisit(true);
    try {
      const payload = {
        title: visitForm.title,
        dateRecorded: visitForm.dateRecorded,
        scheduledTime: visitForm.scheduledTime || undefined,
        appointmentType: visitForm.appointmentType,
        doctorName: visitForm.doctorName || undefined,
        clinic: visitForm.clinic || undefined,
        status: visitForm.status,
        questions: splitMultilineList(visitForm.questions),
        followUpItems: splitMultilineList(visitForm.followUpItems),
        notes: visitForm.notes || undefined,
      };

      const saved = editingVisitId
        ? await updateDoctorVisitRecord(editingVisitId, payload)
        : await createDoctorVisitRecord(babyId, payload);

      if (!saved) {
        alert('Unable to save visit right now.');
        return;
      }

      resetVisitForm();
      await loadHealthData();
    } finally {
      setSavingVisit(false);
    }
  };

  const handleEditVisit = (visit: DoctorVisitRecord) => {
    setEditingVisitId(visit.id);
    setVisitForm({
      title: visit.title,
      dateRecorded: visit.dateRecorded,
      scheduledTime: visit.scheduledTime || '',
      appointmentType: visit.appointmentType,
      doctorName: visit.doctorName || '',
      clinic: visit.clinic || '',
      status: visit.status,
      questions: visit.questions.join('\n'),
      followUpItems: visit.followUpItems.join('\n'),
      notes: visit.notes || '',
    });
  };

  const handleApplyVisitTemplate = (type: DoctorVisitType) => {
    const template = visitPrepTemplates[type];
    setVisitForm((prev) => ({
      ...prev,
      appointmentType: type,
      title: prev.title.trim() ? prev.title : template.title,
      questions: template.questions.join('\n'),
      followUpItems: template.followUpItems.join('\n'),
    }));
  };

  const handleMarkVisitCompleted = async (visit: DoctorVisitRecord) => {
    const updated = await updateDoctorVisitRecord(visit.id, {
      title: visit.title,
      dateRecorded: visit.dateRecorded,
      scheduledTime: visit.scheduledTime,
      appointmentType: visit.appointmentType,
      doctorName: visit.doctorName,
      clinic: visit.clinic,
      status: 'completed',
      questions: visit.questions,
      followUpItems: visit.followUpItems,
      notes: visit.notes,
    });

    if (updated) {
      await loadHealthData();
    }
  };

  const resetVisitForm = () => {
    setEditingVisitId(null);
    setVisitForm({
      title: '',
      dateRecorded: new Date().toISOString().split('T')[0],
      scheduledTime: '',
      appointmentType: 'wellness',
      doctorName: '',
      clinic: '',
      status: 'scheduled',
      questions: '',
      followUpItems: '',
      notes: '',
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm(createDefaultScheduleForm());
  };

  const handleApplyMedicationTemplate = (
    templateKey: keyof typeof medicationPlanTemplates,
  ) => {
    const template = medicationPlanTemplates[templateKey];
    setScheduleForm((prev) => ({
      ...prev,
      ...template.defaults,
      medicationName: prev.medicationName || template.label,
    }));
  };

  const formatDateLabel = (value?: string | null) => {
    if (!value) return 'Not set';
    return new Date(`${value}T00:00:00`).toLocaleDateString();
  };

  const getDaysUntil = (value?: string | null) => {
    if (!value) return null;
    const target = new Date(`${value}T00:00:00`);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);
  };

  const getTreatmentCourseLabel = (schedule: MedicationSchedule) => {
    if (schedule.status === 'completed') return 'Course completed';
    const daysUntilEnd = getDaysUntil(schedule.end_date);
    if (daysUntilEnd === 0) return 'Course ends today';
    if (daysUntilEnd !== null && daysUntilEnd > 0) {
      return `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} remaining`;
    }
    if (daysUntilEnd !== null && daysUntilEnd < 0) return 'Course end date passed';
    if (schedule.start_date) return `Started ${formatDateLabel(schedule.start_date)}`;
    return 'Start date not set';
  };

  const handleDeleteRecord = async (recordId: string, storageKey?: string) => {
    if (!confirm('Delete this record?')) return;

    const success = await deleteHealthRecord(recordId, storageKey);
    if (success) {
      await loadHealthData();
    }
  };

  const handleRecordDose = async (medicationId: string) => {
    const notes = window.prompt('Optional dose notes (symptoms, side effects, etc.)') || undefined;
    setRecordingMedicationId(medicationId);
    const created = await recordMedicationDose(medicationId, notes);
    if (created) {
      const refreshedAdherence = await getMedicationAdherenceByBaby(babyId);
      setAdherenceRecords(refreshedAdherence);
    }
    setRecordingMedicationId(null);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.medicationName.trim()) {
      alert('Please enter medication name.');
      return;
    }

    const dosesPerDay =
      scheduleForm.dosesPerDay.trim() === '' ? null : Number(scheduleForm.dosesPerDay.trim());
    const stockQuantity =
      scheduleForm.stockQuantity.trim() === '' ? null : Number(scheduleForm.stockQuantity.trim());
    const refillThreshold =
      scheduleForm.refillThreshold.trim() === '' ? 0 : Number(scheduleForm.refillThreshold.trim());

    if (dosesPerDay !== null && Number.isNaN(dosesPerDay)) {
      alert('Doses per day must be a number.');
      return;
    }

    if (stockQuantity !== null && Number.isNaN(stockQuantity)) {
      alert('Stock quantity must be a number.');
      return;
    }

    if (Number.isNaN(refillThreshold)) {
      alert('Refill threshold must be a number.');
      return;
    }

    if (
      scheduleForm.startDate &&
      scheduleForm.endDate &&
      scheduleForm.endDate < scheduleForm.startDate
    ) {
      alert('End date must be on or after the start date.');
      return;
    }

    setSavingSchedule(true);
    try {
      const result = await saveMedicationSchedule({
        babyId,
        medicationName: scheduleForm.medicationName.trim(),
        dosage: scheduleForm.dosage.trim() || null,
        frequency: scheduleForm.frequency.trim() || null,
        route: scheduleForm.route.trim() || null,
        instructions: scheduleForm.instructions.trim() || null,
        startDate: scheduleForm.startDate || null,
        endDate: scheduleForm.endDate || null,
        dosesPerDay,
        stockQuantity,
        stockUnit: scheduleForm.stockUnit.trim() || null,
        refillThreshold,
        requiresConfirmation: scheduleForm.requiresConfirmation,
      });

      resetScheduleForm();

      if (result.requiresApproval) {
        alert(result.message || 'Submitted for parent approval.');
      }
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to save schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAdvancedDoseLog = async (
    scheduleId: string,
    doseStatus: 'taken' | 'missed' | 'skipped',
  ) => {
    const quantityPrompt = window.prompt(
      doseStatus === 'taken' ? 'Quantity used (optional)' : 'Quantity used (leave blank for none)',
      '',
    );
    const notes = window.prompt('Notes (optional)', '') || undefined;
    const quantityUsed = quantityPrompt?.trim() ? Number(quantityPrompt.trim()) : undefined;

    if (quantityUsed !== undefined && Number.isNaN(quantityUsed)) {
      alert('Quantity must be a number.');
      return;
    }

    try {
      await logMedicationDoseAdvanced(scheduleId, {
        doseStatus,
        quantityUsed,
        notes,
      });
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to save dose log.');
    }
  };

  const handleApprovalDecision = async (
    approvalId: string,
    decision: 'approved' | 'rejected' | 'cancelled',
  ) => {
    const notes = window.prompt('Decision note (optional)', '') || undefined;
    setPendingDecisionId(approvalId);

    try {
      await decideCareApprovalRequest(approvalId, decision, notes);
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to update approval request.');
    } finally {
      setPendingDecisionId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading health records...</div>;
  }

  const activeMedicationPlans = medicationSchedules.filter((schedule) => schedule.status === 'active');
  const refillAttentionCount = refillAlerts.filter((alert) => alert.shouldAlert).length;
  const coursesEndingSoonCount = medicationSchedules.filter((schedule) => {
    const daysUntilEnd = getDaysUntil(schedule.end_date);
    return (
      schedule.status === 'active' &&
      daysUntilEnd !== null &&
      daysUntilEnd >= 0 &&
      daysUntilEnd <= 3
    );
  }).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Health Records
        </CardTitle>
        <CardDescription>Track medical history for {babyName}</CardDescription>
      </CardHeader>
      <CardContent>
        <MedicalDisclaimerBanner className="mb-4" />
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="medications">Meds</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {allergies.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Known Allergies ({allergies.length})
                </h4>
                {allergies.map((allergy) => (
                  <Card key={allergy.id} className="bg-red-50 dark:bg-red-900/10 border-red-200">
                    <CardContent className="pt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{allergy.allergen}</div>
                          <div className="text-xs text-red-700 dark:text-red-300 capitalize">
                            Severity: {allergy.severity}
                          </div>
                          {allergy.reaction_description && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {allergy.reaction_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {medications.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-500" />
                  Current Medications ({medications.length})
                </h4>
                {medications.map((med) => (
                  <Card key={med.id}>
                    <CardContent className="pt-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{med.medication_name}</div>
                        {med.dosage && <div className="text-xs text-gray-600 dark:text-gray-400">Dose: {med.dosage}</div>}
                        {med.frequency && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">Freq: {med.frequency}</div>
                        )}
                        {med.reason && <div className="text-xs text-gray-600 dark:text-gray-400">Reason: {med.reason}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {doctorVisits.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-violet-500" />
                  Visit Planner ({doctorVisits.length})
                </h4>
                {doctorVisits
                  .slice()
                  .sort((a, b) => `${a.dateRecorded}T${a.scheduledTime || '00:00'}`.localeCompare(`${b.dateRecorded}T${b.scheduledTime || '00:00'}`))
                  .slice(0, 3)
                  .map((visit) => (
                    <Card key={visit.id} className="bg-violet-50 dark:bg-violet-900/10 border-violet-200">
                      <CardContent className="pt-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">{visit.title}</div>
                          <div className="text-xs text-violet-700 dark:text-violet-300">
                            {visit.dateRecorded}
                            {visit.scheduledTime ? ` at ${visit.scheduledTime}` : ''}
                            {visit.doctorName ? ` • ${visit.doctorName}` : ''}
                          </div>
                          {visit.clinic && (
                            <div className="text-xs text-violet-600 dark:text-violet-400">{visit.clinic}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {allergies.length === 0 && medications.length === 0 && doctorVisits.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No allergies, medications, or visits recorded yet.</p>
            )}
          </TabsContent>

          <TabsContent value="allergies">
            <div className="space-y-2">
              {allergies.map((allergy) => (
                <Card key={allergy.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{allergy.allergen}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {allergy.severity} severity
                      </div>
                      {allergy.reaction_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{allergy.reaction_description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allergies.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No allergies recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="medications">
            <div className="space-y-2">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{med.medication_name}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {med.dosage && <div>Dose: {med.dosage}</div>}
                        {med.frequency && <div>Freq: {med.frequency}</div>}
                      </div>
                      {med.effectiveness_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{med.effectiveness_notes}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            const latestDose = adherenceRecords.find((entry) => entry.medication_id === med.id);
                            if (!latestDose) return 'No dose logged yet';
                            return `Last dose: ${new Date(latestDose.given_at).toLocaleString()}`;
                          })()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRecordDose(med.id)}
                          disabled={recordingMedicationId === med.id}
                        >
                          {recordingMedicationId === med.id ? 'Saving...' : 'Log Dose'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No medications recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="adherence">
            <div className="space-y-2">
              {adherenceRecords.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {entry.dose_taken ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {entry.medication_name || 'Medication'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(entry.given_at).toLocaleString()}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {adherenceRecords.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No medication doses logged yet.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="visits">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-sm">Plan a doctor visit</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Keep the appointment details, questions, and follow-up tasks in one place.
                      </p>
                    </div>
                    {editingVisitId && (
                      <Button size="sm" variant="outline" onClick={resetVisitForm}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                      Visit template
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(visitPrepTemplates) as DoctorVisitType[]).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant={visitForm.appointmentType === type ? 'default' : 'outline'}
                          onClick={() => handleApplyVisitTemplate(type)}
                        >
                          {type.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Visit title
                      </label>
                      <input
                        value={visitForm.title}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="Wellness Visit"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Visit type
                      </label>
                      <select
                        value={visitForm.appointmentType}
                        onChange={(event) =>
                          setVisitForm((prev) => ({
                            ...prev,
                            appointmentType: event.target.value as DoctorVisitType,
                          }))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                      >
                        <option value="wellness">Wellness</option>
                        <option value="sick">Sick</option>
                        <option value="vaccination">Vaccination</option>
                        <option value="specialist">Specialist</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="therapy">Therapy</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Visit date
                      </label>
                      <input
                        type="date"
                        value={visitForm.dateRecorded}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, dateRecorded: event.target.value }))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Scheduled time
                      </label>
                      <input
                        type="time"
                        value={visitForm.scheduledTime}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, scheduledTime: event.target.value }))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Doctor or provider
                      </label>
                      <input
                        value={visitForm.doctorName}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, doctorName: event.target.value }))
                        }
                        placeholder="Dr. Rivera"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Clinic or location
                      </label>
                      <input
                        value={visitForm.clinic}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, clinic: event.target.value }))
                        }
                        placeholder="Sunrise Pediatrics"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Status
                      </label>
                      <select
                        value={visitForm.status}
                        onChange={(event) =>
                          setVisitForm((prev) => ({
                            ...prev,
                            status: event.target.value as 'scheduled' | 'completed',
                          }))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Questions to ask
                      </label>
                      <textarea
                        value={visitForm.questions}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, questions: event.target.value }))
                        }
                        placeholder="One question per line"
                        rows={4}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Follow-up tasks
                      </label>
                      <textarea
                        value={visitForm.followUpItems}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, followUpItems: event.target.value }))
                        }
                        placeholder="One task per line"
                        rows={4}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Notes
                      </label>
                      <textarea
                        value={visitForm.notes}
                        onChange={(event) =>
                          setVisitForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        placeholder="Symptoms, prep details, or key instructions"
                        rows={3}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSaveVisit} disabled={savingVisit}>
                      {savingVisit
                        ? 'Saving...'
                        : editingVisitId
                          ? 'Update Visit'
                          : 'Save Visit'}
                    </Button>
                    <Button variant="outline" onClick={resetVisitForm} disabled={savingVisit}>
                      Reset Form
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">Upcoming and recent visits</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Keep the care plan ready before and after each appointment.
                        </p>
                      </div>
                      <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
                        {doctorVisits.length} total
                      </div>
                    </div>

                    {doctorVisits.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">
                        No doctor visits planned yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {doctorVisits
                          .slice()
                          .sort((a, b) =>
                            `${a.dateRecorded}T${a.scheduledTime || '00:00'}`.localeCompare(
                              `${b.dateRecorded}T${b.scheduledTime || '00:00'}`,
                            ),
                          )
                          .map((visit) => (
                            <Card key={visit.id} className="border-violet-100 dark:border-violet-900/40">
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold text-sm">{visit.title}</p>
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {visit.appointmentType.replace(/_/g, ' ')}
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                          visit.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200'
                                        }`}
                                      >
                                        {visit.status}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        {visit.dateRecorded}
                                        {visit.scheduledTime ? ` at ${visit.scheduledTime}` : ''}
                                      </span>
                                      {visit.doctorName && (
                                        <span className="inline-flex items-center gap-1">
                                          <Stethoscope className="h-3.5 w-3.5" />
                                          {visit.doctorName}
                                        </span>
                                      )}
                                      {visit.clinic && (
                                        <span className="inline-flex items-center gap-1">
                                          <MapPin className="h-3.5 w-3.5" />
                                          {visit.clinic}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleEditVisit(visit)}>
                                      Edit
                                    </Button>
                                    {visit.status !== 'completed' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMarkVisitCompleted(visit)}
                                      >
                                        Mark Completed
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteRecord(visit.id, visit.storageKey)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>

                                {(visit.questions.length > 0 || visit.followUpItems.length > 0 || visit.notes) && (
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                        Questions
                                      </p>
                                      {visit.questions.length > 0 ? (
                                        <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                          {visit.questions.map((question, index) => (
                                            <li key={`${visit.id}-question-${index}`}>{question}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                          No questions added yet.
                                        </p>
                                      )}
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                        Follow-up
                                      </p>
                                      {visit.followUpItems.length > 0 ? (
                                        <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                          {visit.followUpItems.map((item, index) => (
                                            <li key={`${visit.id}-followup-${index}`}>{item}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                          No follow-up tasks added yet.
                                        </p>
                                      )}
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                        Notes
                                      </p>
                                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                        {visit.notes || 'No notes saved yet.'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <p className="font-semibold text-sm">Visit prep snapshot</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-lg border bg-violet-50 p-3 dark:border-violet-900/40 dark:bg-violet-900/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                          Upcoming
                        </p>
                        <p className="mt-2 text-2xl font-bold text-violet-900 dark:text-violet-100">
                          {doctorVisits.filter((visit) => visit.status === 'scheduled').length}
                        </p>
                        <p className="mt-1 text-xs text-violet-700 dark:text-violet-200">
                          Scheduled visits still on the care plan.
                        </p>
                      </div>

                      <div className="rounded-lg border bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                          Completed
                        </p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                          {doctorVisits.filter((visit) => visit.status === 'completed').length}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">
                          Visits already logged into the record.
                        </p>
                      </div>

                      <div className="rounded-lg border bg-slate-50 p-3 sm:col-span-2 xl:col-span-1 dark:border-slate-800 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Quick checklist
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                          <li>Confirm the appointment time and location.</li>
                          <li>Add your top questions before the visit starts.</li>
                          <li>Log the care plan and follow-up tasks right after the visit.</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracker">
            <div className="space-y-3">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-semibold text-sm">Build a treatment plan</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Capture the course, refill needs, and caregiver instructions in one place.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                      Quick template
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(medicationPlanTemplates) as Array<keyof typeof medicationPlanTemplates>).map(
                        (templateKey) => (
                          <Button
                            key={templateKey}
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyMedicationTemplate(templateKey)}
                          >
                            {medicationPlanTemplates[templateKey].label}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={scheduleForm.medicationName}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, medicationName: event.target.value }))
                      }
                      placeholder="Medication name"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.dosage}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, dosage: event.target.value }))
                      }
                      placeholder="Dosage"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.frequency}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, frequency: event.target.value }))
                      }
                      placeholder="Frequency"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.route}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, route: event.target.value }))
                      }
                      placeholder="Route (e.g. by mouth)"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={scheduleForm.endDate}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, endDate: event.target.value }))
                      }
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.dosesPerDay}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, dosesPerDay: event.target.value }))
                      }
                      placeholder="Doses per day"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.stockQuantity}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                      }
                      placeholder="Stock quantity"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.stockUnit}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, stockUnit: event.target.value }))
                      }
                      placeholder="Stock unit"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      value={scheduleForm.refillThreshold}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, refillThreshold: event.target.value }))
                      }
                      placeholder="Refill threshold"
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <textarea
                      value={scheduleForm.instructions}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, instructions: event.target.value }))
                      }
                      placeholder="Instructions for parents and caregivers"
                      rows={3}
                      className="rounded-md border px-3 py-2 text-sm md:col-span-2"
                    />
                    <label className="text-sm flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={scheduleForm.requiresConfirmation}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            requiresConfirmation: event.target.checked,
                          }))
                        }
                      />
                      Require parent approval before caregivers log doses
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleSaveSchedule} disabled={savingSchedule}>
                      {savingSchedule ? 'Saving...' : 'Save Treatment Plan'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetScheduleForm} disabled={savingSchedule}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <p className="font-semibold text-sm">Medication snapshot</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                        Active plans
                      </p>
                      <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {activeMedicationPlans.length}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                        Refill attention
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
                        {refillAttentionCount}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                        Ending soon
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        {coursesEndingSoonCount}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Suggested workflow
                    </p>
                    <ul className="mt-2 space-y-2">
                      <li>Save the treatment plan before the first dose is given.</li>
                      <li>Use dose logs to capture missed and skipped doses, not just taken ones.</li>
                      <li>Update refill thresholds before stock gets low so the care team stays ahead.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {refillAlerts.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Refill Alerts
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {refillAlerts.map((alert) => (
                        <div
                          key={alert.scheduleId}
                          className="rounded-lg border border-amber-200 bg-white/80 px-3 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-black/10 dark:text-amber-200"
                        >
                          <div className="font-semibold">{alert.medicationName}</div>
                          <div className="mt-1">
                            Remaining: {alert.stockQuantity ?? '-'} {alert.stockUnit || ''}
                          </div>
                          <div className="mt-1">
                            Reason: {alert.reason === 'refill_due' ? 'Refill due' : 'Low stock'}
                          </div>
                          {alert.nextRefillDueDate && (
                            <div className="mt-1">
                              Due: {formatDateLabel(alert.nextRefillDueDate)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {medicationSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{schedule.medication_name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {schedule.status}
                            </span>
                            {schedule.requires_confirmation && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                approval
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.dosage || 'No dosage'} {schedule.frequency ? `• ${schedule.frequency}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Stock: {schedule.stock_quantity ?? '-'} {schedule.stock_unit || ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.route || 'Route not set'}
                            {schedule.doses_per_day ? ` | ${schedule.doses_per_day} doses/day` : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getTreatmentCourseLabel(schedule)}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Updated {new Date(schedule.updated_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            Course window
                          </p>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                            Start: {formatDateLabel(schedule.start_date)}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            End: {formatDateLabel(schedule.end_date)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            Refill
                          </p>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                            Threshold: {schedule.refill_threshold ?? 0} {schedule.stock_unit || ''}
                          </p>
                          {schedule.next_refill_due_date && (
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              Due: {formatDateLabel(schedule.next_refill_due_date)}
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            Instructions
                          </p>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                            {schedule.instructions || 'No special instructions saved yet.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'taken')}
                        >
                          Log Taken
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'missed')}
                        >
                          Log Missed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'skipped')}
                        >
                          Log Skipped
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {medicationSchedules.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No medication schedules yet.</p>
                )}
              </div>

              {advancedDoseLogs.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold">Recent Dose Logs</p>
                    {advancedDoseLogs.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="text-xs border rounded px-3 py-3">
                        <div className="font-semibold">{entry.medication_name}</div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {entry.dose_status.toUpperCase()} • {new Date(entry.logged_at).toLocaleString()}
                        </div>
                        {entry.quantity_used !== null && entry.quantity_used !== undefined && (
                          <div className="mt-1 text-gray-500 dark:text-gray-400">
                            Quantity used: {entry.quantity_used}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="mt-1 text-gray-600 dark:text-gray-300">{entry.notes}</div>
                        )}
                        {entry.approval_required && (
                          <div className="text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            Waiting for parent approval
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={approvalFilter === status ? 'default' : 'outline'}
                    onClick={() => setApprovalFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              {approvalRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                          {request.request_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By {request.requested_by_role || 'care team'} •{' '}
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                        {request.reason && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{request.reason}</p>
                        )}
                        {request.decided_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Decision: {request.status} at {new Date(request.decided_at).toLocaleString()}
                            {request.decided_by ? ` by ${request.decided_by.slice(0, 8)}...` : ''}
                          </p>
                        )}
                        {request.decision_notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Note: {request.decision_notes}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        {request.status}
                      </span>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        {canDecideApprovals && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprovalDecision(request.id, 'approved')}
                              disabled={pendingDecisionId === request.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalDecision(request.id, 'rejected')}
                              disabled={pendingDecisionId === request.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprovalDecision(request.id, 'cancelled')}
                          disabled={pendingDecisionId === request.id}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {approvalRequests.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No approval requests.</p>
              )}

              {approvalTimeline.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold">Audit Timeline</p>
                    {approvalTimeline.slice(0, 20).map((event) => (
                      <div key={event.id} className="rounded border p-2 text-xs">
                        <div className="font-semibold">
                          {event.action.toUpperCase()} • {event.requestType?.replace(/_/g, ' ') || 'approval'}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                        {event.actorRole && (
                          <div className="text-gray-500 dark:text-gray-400">Role: {event.actorRole}</div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start justify-between p-2 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{record.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {record.record_type}
                    </div>
                    {record.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{record.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{record.date_recorded}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRecord(record.id, record.storage_key)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {records.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No health records.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
