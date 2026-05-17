import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Pill,
  PlusCircle,
  RefreshCw,
  Send,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  deleteClinicReportTemplate,
  getClinicReportTemplates,
  saveClinicReportTemplate,
  type ClinicReportTemplate,
} from '@/lib/care-advanced-api';
import {
  createDoctorAppointmentReminder,
  createDoctorDiagnosis,
  getDoctorAssignedBabies,
  getDoctorBabyDetails,
  getDoctorDashboard,
  getDoctorUpcomingAppointments,
  prescribeDoctorMedication,
  sendDoctorAppointmentReminderNotification,
  stopDoctorMedication,
  updateDoctorAppointmentReminderStatus,
  updateDoctorDiagnosis,
  type DoctorAssignedBaby,
  type DoctorBabyDetails,
  type DoctorDashboardData,
  type DoctorDiagnosis,
  type DoctorUpcomingAppointment,
} from '@/lib/doctor-api';
import {
  getSharedCareTasksForBabies,
  updateSharedCareTask,
  type SharedCareTask,
} from '@/lib/shared-care-tasks';
import { getDefaultAvatar } from '@/lib/baby-utils';
import { useAuthStore } from '@/app/AppContext';
import type { Baby } from '@/types';

interface ClinicDoctorPanelProps {
  onBack?: () => void;
}

type DiagnosisFormState = {
  diagnosisText: string;
  icd10Code: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate: string;
  notes: string;
};

type MedicationFormState = {
  medicationName: string;
  dosage: string;
  unit: 'ml' | 'mg' | 'tablet' | 'capsule' | 'drop' | 'spray' | 'injection';
  frequency:
    | 'as_needed'
    | 'once_daily'
    | 'twice_daily'
    | 'three_times_daily'
    | 'four_times_daily'
    | 'every_6_hours'
    | 'every_8_hours'
    | 'every_12_hours'
    | 'weekly'
    | 'monthly';
  startDate: string;
  endDate: string;
  reason: string;
  instructions: string;
  sideEffects: string;
  contraindications: string;
};

type AppointmentFormState = {
  appointmentType: string;
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
};

type DoctorSection = 'overview' | 'patients' | 'care' | 'appointments' | 'templates';

const doctorSections: Array<{ id: DoctorSection; label: string; helper: string }> = [
  { id: 'overview', label: 'Home', helper: 'Alerts' },
  { id: 'patients', label: 'Patients', helper: 'Roster' },
  { id: 'care', label: 'Care Plans', helper: 'Dx & meds' },
  { id: 'appointments', label: 'Reviews', helper: 'Schedule' },
  { id: 'templates', label: 'Reports', helper: 'Templates' },
];

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const buildDiagnosisForm = (): DiagnosisFormState => ({
  diagnosisText: '',
  icd10Code: '',
  severity: 'mild',
  onsetDate: todayIsoDate(),
  notes: '',
});

const buildMedicationForm = (): MedicationFormState => ({
  medicationName: '',
  dosage: '',
  unit: 'ml',
  frequency: 'once_daily',
  startDate: todayIsoDate(),
  endDate: '',
  reason: '',
  instructions: '',
  sideEffects: '',
  contraindications: '',
});

const buildAppointmentForm = (): AppointmentFormState => ({
  appointmentType: 'checkup',
  scheduledDate: '',
  scheduledTime: '',
  reason: '',
});

const formatDate = (value?: string | null) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const formatDateTime = (dateValue?: string | null, timeValue?: string | null) => {
  if (!dateValue) return 'Unscheduled';
  return `${formatDate(dateValue)}${timeValue ? ` at ${timeValue}` : ''}`;
};

const resolvePatientAvatar = (patient: DoctorAssignedBaby): string =>
  patient.babyPhotoUrl || getDefaultAvatar(undefined, patient.babyName);

const toBabyFromDoctorPatient = (patient: DoctorAssignedBaby): Baby => ({
  id: patient.babyId,
  name: patient.babyName,
  dateOfBirth: patient.babyDateOfBirth || patient.babyCreatedAt || new Date().toISOString(),
  gender:
    patient.babyGender === 'boy' || patient.babyGender === 'girl' || patient.babyGender === 'other'
      ? patient.babyGender
      : 'other',
  photoUrl: patient.babyPhotoUrl || undefined,
  country: patient.babyCountry || 'US',
  createdAt: patient.babyCreatedAt || new Date().toISOString(),
});

const diagnosisStatusLabel = (diagnosis: DoctorDiagnosis) =>
  diagnosis.status.replace(/_/g, ' ');

export function ClinicDoctorPanel({ onBack }: ClinicDoctorPanelProps) {
  const { babies, currentBaby, setCurrentBaby } = useAuthStore();
  const [activeSection, setActiveSection] = useState<DoctorSection>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(currentBaby?.id || null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<DoctorBabyDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null);
  const [patients, setPatients] = useState<DoctorAssignedBaby[]>([]);
  const [appointments, setAppointments] = useState<DoctorUpcomingAppointment[]>([]);
  const [templates, setTemplates] = useState<ClinicReportTemplate[]>([]);
  const [careTasks, setCareTasks] = useState<SharedCareTask[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [submittingDiagnosis, setSubmittingDiagnosis] = useState(false);
  const [submittingMedication, setSubmittingMedication] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const [busyDiagnosisId, setBusyDiagnosisId] = useState<string | null>(null);
  const [busyMedicationId, setBusyMedicationId] = useState<string | null>(null);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisFormState>(buildDiagnosisForm);
  const [medicationForm, setMedicationForm] = useState<MedicationFormState>(buildMedicationForm);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>(buildAppointmentForm);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    reportType: 'health_summary',
    includeData: 'sleep,feeding,diaper,growth,vaccinations,health',
    promptNotes: '',
  });

  const selectedPatient = patients.find((patient) => patient.babyId === selectedPatientId) || null;
  const doctorTasks = careTasks.filter((task) => task.assignedRole === 'doctor' && task.status === 'open');
  const urgentDoctorTasks = doctorTasks.filter((task) => task.priority === 'urgent');
  const activeDiagnoses = dashboard?.recentDiagnoses?.filter((diagnosis) => diagnosis.status === 'active') || [];
  const selectedActiveMedications =
    selectedPatientDetails?.medications?.filter((medication) => medication.status === 'active') || [];
  const vaccineNeedsReview =
    selectedPatient &&
    (!selectedPatientDetails?.medicalHistory?.immunization_status ||
      selectedPatientDetails.medicalHistory.immunization_status.toLowerCase().includes('unknown') ||
      selectedPatientDetails.medicalHistory.immunization_status.toLowerCase().includes('not recorded'));
  const activeDiagnosisCount = activeDiagnoses.length;
  const doctorPriorityCards = [
    {
      label: 'Assigned patients',
      value: dashboard?.patientCount || patients.length,
      helper: patients.length === 0 ? 'Accept patient shares to begin.' : 'Ready for review.',
      Icon: Users,
    },
    {
      label: 'Upcoming reviews',
      value: appointments.length,
      helper: appointments.length === 0 ? 'No appointments in the next 14 days.' : 'Appointment reminders active.',
      Icon: CalendarDays,
    },
    {
      label: 'Open follow-ups',
      value: doctorTasks.length,
      helper:
        urgentDoctorTasks.length > 0
          ? `${urgentDoctorTasks.length} urgent task${urgentDoctorTasks.length === 1 ? '' : 's'} need attention.`
          : 'No urgent follow-ups.',
      Icon: AlertTriangle,
    },
  ];
  const clinicalAlerts = [
    ...urgentDoctorTasks.slice(0, 3).map((task) => ({
      id: `task-${task.id}`,
      label: 'Urgent follow-up',
      title: task.title,
      detail: task.dueDate ? `Due ${task.dueDate}` : task.details || 'Needs clinical review.',
      tone: 'text-rose-600 dark:text-rose-300',
    })),
    ...appointments.slice(0, 3).map((appointment) => ({
      id: `appointment-${appointment.appointment_id}`,
      label: 'Upcoming review',
      title: `${appointment.baby_name} - ${appointment.appointment_type}`,
      detail: formatDateTime(appointment.scheduled_date, appointment.scheduled_time),
      tone: 'text-sky-600 dark:text-sky-300',
    })),
    ...activeDiagnoses.slice(0, 3).map((diagnosis) => ({
      id: `diagnosis-${diagnosis.id}`,
      label: 'Active diagnosis',
      title: diagnosis.diagnosis_text,
      detail: `${diagnosis.severity || 'Unspecified'} severity - onset ${formatDate(diagnosis.onset_date)}`,
      tone: 'text-amber-600 dark:text-amber-300',
    })),
    ...selectedActiveMedications.slice(0, 2).map((medication) => ({
      id: `medication-${medication.medication_id}`,
      label: 'Active medication',
      title: medication.medication_name,
      detail: `${medication.dosage} - ${medication.frequency}`,
      tone: 'text-emerald-600 dark:text-emerald-300',
    })),
    ...(vaccineNeedsReview
      ? [
          {
            id: 'vaccine-review',
            label: 'Vaccine records',
            title: `${selectedPatient.babyName} needs immunization review`,
            detail: 'Medical history does not show a current vaccine status.',
            tone: 'text-violet-600 dark:text-violet-300',
          },
        ]
      : []),
  ];

  const loadDoctorWorkspace = async (options?: { silent?: boolean; preferredPatientId?: string | null }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      const [dashboardData, assignedPatients, upcomingAppointments, reportTemplates] = await Promise.all([
        getDoctorDashboard(),
        getDoctorAssignedBabies(),
        getDoctorUpcomingAppointments(14),
        getClinicReportTemplates(),
      ]);

      setDashboard(dashboardData);
      setPatients(assignedPatients);
      setAppointments(upcomingAppointments);
      setTemplates(reportTemplates);
      setCareTasks(getSharedCareTasksForBabies(assignedPatients.map((patient) => patient.babyId)));

      const nextSelectedId =
        options?.preferredPatientId ||
        selectedPatientId ||
        currentBaby?.id ||
        assignedPatients[0]?.babyId ||
        null;

      if (nextSelectedId && assignedPatients.some((patient) => patient.babyId === nextSelectedId)) {
        setSelectedPatientId(nextSelectedId);
      } else {
        setSelectedPatientId(assignedPatients[0]?.babyId || null);
      }
    } catch (error: any) {
      console.error('Failed to load doctor workspace:', error);
      setErrorMessage(error?.message || 'Failed to load the doctor workspace.');
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const loadSelectedPatientDetails = async (patientId: string) => {
    setDetailsLoading(true);

    try {
      const details = await getDoctorBabyDetails(patientId);
      setSelectedPatientDetails(details);
    } catch (error: any) {
      console.error('Failed to load doctor patient details:', error);
      setSelectedPatientDetails(null);
      setErrorMessage(error?.message || 'Failed to load patient details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadDoctorWorkspace();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedPatientDetails(null);
      return;
    }

    void loadSelectedPatientDetails(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!currentBaby?.id) {
      return;
    }

    if (patients.some((patient) => patient.babyId === currentBaby.id)) {
      setSelectedPatientId(currentBaby.id);
    }
  }, [currentBaby?.id, patients]);

  const selectPatient = (patient: DoctorAssignedBaby) => {
    const matchedBaby = babies.find((baby) => baby.id === patient.babyId);
    setCurrentBaby(matchedBaby || toBabyFromDoctorPatient(patient));
    setSelectedPatientId(patient.babyId);
    setStatusMessage(`${patient.babyName} is now the active patient.`);
    setErrorMessage(null);
  };

  const handleTaskCompletion = (taskId: string) => {
    updateSharedCareTask(taskId, { status: 'completed' });
    setCareTasks((previous) => previous.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task)));
  };

  const refreshAfterClinicalChange = async (message: string) => {
    await loadDoctorWorkspace({ silent: true, preferredPatientId: selectedPatientId });
    if (selectedPatientId) {
      await loadSelectedPatientDetails(selectedPatientId);
    }
    setStatusMessage(message);
    setErrorMessage(null);
  };

  const handleCreateDiagnosis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Select a patient before recording a diagnosis.');
      return;
    }

    setSubmittingDiagnosis(true);
    try {
      await createDoctorDiagnosis({
        babyId: selectedPatient.babyId,
        diagnosisText: diagnosisForm.diagnosisText.trim(),
        icd10Code: diagnosisForm.icd10Code.trim() || undefined,
        severity: diagnosisForm.severity,
        onsetDate: diagnosisForm.onsetDate,
        notes: diagnosisForm.notes.trim() || undefined,
      });
      setDiagnosisForm(buildDiagnosisForm());
      await refreshAfterClinicalChange('Diagnosis recorded successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to record the diagnosis.');
    } finally {
      setSubmittingDiagnosis(false);
    }
  };

  const handleUpdateDiagnosisStatus = async (
    diagnosisId: string,
    status: 'active' | 'resolved' | 'under_investigation',
    notes?: string | null,
  ) => {
    setBusyDiagnosisId(diagnosisId);
    try {
      await updateDoctorDiagnosis(diagnosisId, {
        status,
        notes: notes || undefined,
      });
      await refreshAfterClinicalChange(`Diagnosis marked ${status.replace(/_/g, ' ')}.`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update the diagnosis.');
    } finally {
      setBusyDiagnosisId(null);
    }
  };

  const handlePrescribeMedication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Select a patient before prescribing medication.');
      return;
    }

    setSubmittingMedication(true);
    try {
      await prescribeDoctorMedication({
        babyId: selectedPatient.babyId,
        medicationName: medicationForm.medicationName.trim(),
        dosage: medicationForm.dosage.trim(),
        unit: medicationForm.unit,
        frequency: medicationForm.frequency,
        startDate: medicationForm.startDate,
        endDate: medicationForm.endDate || undefined,
        reason: medicationForm.reason.trim() || undefined,
        instructions: medicationForm.instructions.trim() || undefined,
        sideEffects: medicationForm.sideEffects.trim() || undefined,
        contraindications: medicationForm.contraindications.trim() || undefined,
      });
      setMedicationForm(buildMedicationForm());
      await refreshAfterClinicalChange('Medication prescribed successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to prescribe medication.');
    } finally {
      setSubmittingMedication(false);
    }
  };

  const handleStopMedication = async (medicationId: string) => {
    setBusyMedicationId(medicationId);
    try {
      await stopDoctorMedication(medicationId, 'Stopped from clinic panel');
      await refreshAfterClinicalChange('Medication stopped successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to stop the medication.');
    } finally {
      setBusyMedicationId(null);
    }
  };

  const handleCreateAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Select a patient before creating an appointment reminder.');
      return;
    }

    if (!selectedPatient.parentId) {
      setErrorMessage('This patient is missing the parent assignment needed for appointment reminders.');
      return;
    }

    setSubmittingAppointment(true);
    try {
      await createDoctorAppointmentReminder({
        babyId: selectedPatient.babyId,
        parentId: selectedPatient.parentId,
        appointmentType: appointmentForm.appointmentType.trim(),
        scheduledDate: appointmentForm.scheduledDate,
        scheduledTime: appointmentForm.scheduledTime || undefined,
        reason: appointmentForm.reason.trim() || undefined,
      });
      setAppointmentForm(buildAppointmentForm());
      await refreshAfterClinicalChange('Appointment reminder created successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to create the appointment reminder.');
    } finally {
      setSubmittingAppointment(false);
    }
  };

  const handleAppointmentStatus = async (
    reminderId: string,
    action: 'reminded' | 'completed' | 'cancelled',
  ) => {
    setBusyAppointmentId(reminderId);
    try {
      await updateDoctorAppointmentReminderStatus(reminderId, action);
      await refreshAfterClinicalChange(`Appointment marked ${action}.`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update the appointment status.');
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const handleSendAppointmentReminder = async (reminderId: string) => {
    setBusyAppointmentId(reminderId);
    try {
      await sendDoctorAppointmentReminderNotification(reminderId);
      await refreshAfterClinicalChange('Appointment reminder sent successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to send the appointment reminder.');
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      setErrorMessage('Template name is required.');
      return;
    }

    setSavingTemplate(true);
    try {
      await saveClinicReportTemplate({
        name: templateForm.name.trim(),
        reportType: templateForm.reportType.trim(),
        includeData: templateForm.includeData
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        promptNotes: templateForm.promptNotes.trim() || null,
      });
      setTemplateForm({
        name: '',
        reportType: 'health_summary',
        includeData: 'sleep,feeding,diaper,growth,vaccinations,health',
        promptNotes: '',
      });
      await loadDoctorWorkspace({ silent: true, preferredPatientId: selectedPatientId });
      setStatusMessage('Report template saved.');
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to save the report template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Delete this template?')) {
      return;
    }

    try {
      await deleteClinicReportTemplate(templateId);
      await loadDoctorWorkspace({ silent: true, preferredPatientId: selectedPatientId });
      setStatusMessage('Report template deleted.');
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to delete the report template.');
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-sm font-semibold text-text-light">Loading clinic panel...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/85 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-blue-200/70 blur-3xl dark:bg-blue-500/10" />
        <CardHeader className="relative space-y-6 p-6 sm:p-8">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-fit px-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <div className="grid gap-6 lg:grid-cols-[1.15fr,0.95fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
                <Stethoscope className="h-4 w-4" />
                Doctor home
              </div>
              <CardTitle className="max-w-2xl text-3xl font-headline font-black tracking-[-0.05em] text-foreground sm:text-4xl">
                Clinic/Doctor Panel
              </CardTitle>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-text-dim">
                This workspace is wired to the dedicated doctor backend for assigned patients, diagnoses, medications,
                and appointment reminders.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {doctorPriorityCards.map(({ Icon, ...item }) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">{item.label}</p>
                      <p className="mt-2 text-2xl font-headline font-black text-foreground">{item.value}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-text-dim">{item.helper}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200">
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => loadDoctorWorkspace()} className="rounded-2xl">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh clinic data
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {statusMessage && (
        <Card className="border border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30">
          <CardContent className="py-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="border border-rose-500/30 bg-rose-500/5 dark:border-rose-400/30">
          <CardContent className="py-4 text-sm font-medium text-rose-700 dark:text-rose-300">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      <div className="rounded-[2rem] border border-white/70 bg-white/80 p-2 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70">
        <div className="grid gap-2 sm:grid-cols-5">
          {doctorSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-[1.35rem] px-4 py-3 text-left transition-all ${
                activeSection === section.id
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-zinc-950'
                  : 'text-text-dim hover:bg-surface-gray dark:hover:bg-white/5'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.18em]">{section.label}</span>
              <span className="mt-1 block text-[11px] font-semibold opacity-70">{section.helper}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'overview' && (
      <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="mx-auto h-4 w-4 text-blue-500" />
            <p className="mt-2 text-lg font-black">{dashboard?.patientCount || 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CalendarDays className="mx-auto h-4 w-4 text-emerald-500" />
            <p className="mt-2 text-lg font-black">{appointments.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <FileText className="mx-auto h-4 w-4 text-rose-500" />
            <p className="mt-2 text-lg font-black">{activeDiagnosisCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Active Dx</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="mx-auto h-4 w-4 text-violet-500" />
            <p className="mt-2 text-lg font-black">{doctorTasks.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.35rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Clinical Alert Queue
          </CardTitle>
          <p className="text-sm font-semibold text-text-light">
            Overdue care, active diagnoses, medications, urgent tasks, and upcoming reviews in one doctor-first queue.
          </p>
        </CardHeader>
        <CardContent>
          {clinicalAlerts.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border-gray bg-surface/70 p-6 text-center dark:border-zinc-800">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
              <p className="mt-3 text-sm font-headline font-black text-foreground">No clinical alerts right now.</p>
              <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                New urgent tasks, upcoming appointments, active medications, and diagnosis follow-ups will surface here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {clinicalAlerts.slice(0, 8).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[1.35rem] border border-border-gray bg-surface-gray p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${alert.tone}`}>
                    {alert.label}
                  </p>
                  <p className="mt-2 text-sm font-headline font-black text-foreground">{alert.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-text-light">{alert.detail}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {activeSection === 'patients' && (
      <div className="grid gap-4 lg:grid-cols-[0.95fr,1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patients.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-sky-300/70 bg-sky-50/70 p-6 text-center dark:border-sky-400/20 dark:bg-sky-950/20">
                <Users className="mx-auto h-7 w-7 text-sky-600 dark:text-sky-300" />
                <p className="mt-3 text-sm font-headline font-black text-foreground">No active patients assigned yet.</p>
                <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                  Accepted doctor shares will appear here as patient cards with parent context.
                </p>
              </div>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.babyId}
                  type="button"
                  onClick={() => selectPatient(patient)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all ${
                    selectedPatientId === patient.babyId
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border-gray hover:border-primary/30'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900">
                      <img
                        src={resolvePatientAvatar(patient)}
                        alt={`${patient.babyName} avatar`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = getDefaultAvatar(undefined, patient.babyName);
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{patient.babyName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(patient.babyDateOfBirth)}
                        {patient.parentEmail ? ` · ${patient.parentEmail}` : ''}
                      </p>
                    </div>
                  </div>
                  {selectedPatientId === patient.babyId && (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Patient Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPatient ? (
              <div className="rounded-[2rem] border border-dashed border-border-gray bg-surface/70 p-6 text-center dark:border-zinc-800">
                <Stethoscope className="mx-auto h-7 w-7 text-text-light" />
                <p className="mt-3 text-sm font-headline font-black text-foreground">Select a patient to begin.</p>
                <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                  Diagnoses, medications, history, and reminders appear after a patient is selected.
                </p>
              </div>
            ) : detailsLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading patient details...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900">
                    <img
                      src={resolvePatientAvatar(selectedPatient)}
                      alt={`${selectedPatient.babyName} avatar`}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = getDefaultAvatar(undefined, selectedPatient.babyName);
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black">{selectedPatient.babyName}</p>
                    <p className="text-sm text-text-light">
                      DOB {formatDate(selectedPatient.babyDateOfBirth)} · {selectedPatient.babyCountry || 'US'}
                    </p>
                    {selectedPatient.assignmentReason && (
                      <p className="text-xs text-text-light">{selectedPatient.assignmentReason}</p>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="diagnoses" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagnoses" className="mt-4 space-y-3">
                    {(selectedPatientDetails?.diagnoses || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No diagnoses recorded yet.</p>
                    ) : (
                      selectedPatientDetails?.diagnoses.map((diagnosis) => (
                        <div key={diagnosis.id} className="rounded-2xl border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{diagnosis.diagnosis_text}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {diagnosis.severity || 'Unspecified'} · onset {formatDate(diagnosis.onset_date)}
                              </p>
                              {diagnosis.notes && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{diagnosis.notes}</p>
                              )}
                            </div>
                            <Badge variant="outline">{diagnosisStatusLabel(diagnosis)}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyDiagnosisId === diagnosis.id || diagnosis.status === 'under_investigation'}
                              onClick={() =>
                                handleUpdateDiagnosisStatus(diagnosis.id, 'under_investigation', diagnosis.notes)
                              }
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyDiagnosisId === diagnosis.id || diagnosis.status === 'resolved'}
                              onClick={() => handleUpdateDiagnosisStatus(diagnosis.id, 'resolved', diagnosis.notes)}
                            >
                              Resolve
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="medications" className="mt-4 space-y-3">
                    {(selectedPatientDetails?.medications || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No active medications recorded.</p>
                    ) : (
                      selectedPatientDetails?.medications.map((medication) => (
                        <div key={medication.medication_id} className="rounded-2xl border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{medication.medication_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {medication.dosage} · {medication.frequency}
                              </p>
                              {medication.doctor_name && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Prescribed by {medication.doctor_name}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{medication.status}</Badge>
                          </div>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyMedicationId === medication.medication_id}
                              onClick={() => handleStopMedication(medication.medication_id)}
                            >
                              Stop Medication
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-4 space-y-3">
                    {!selectedPatientDetails?.medicalHistory ? (
                      <p className="text-sm text-gray-500">No medical history summary is available yet.</p>
                    ) : (
                      <div className="space-y-3 rounded-2xl border p-3 text-sm">
                        <p>
                          <span className="font-semibold">Allergies:</span>{' '}
                          {(selectedPatientDetails.medicalHistory.allergies || []).join(', ') || 'None recorded'}
                        </p>
                        <p>
                          <span className="font-semibold">Chronic conditions:</span>{' '}
                          {(selectedPatientDetails.medicalHistory.chronic_conditions || []).join(', ') ||
                            'None recorded'}
                        </p>
                        <p>
                          <span className="font-semibold">Current medications:</span>{' '}
                          {(selectedPatientDetails.medicalHistory.current_medications || []).join(', ') ||
                            'None recorded'}
                        </p>
                        <p>
                          <span className="font-semibold">Immunization status:</span>{' '}
                          {selectedPatientDetails.medicalHistory.immunization_status || 'Not recorded'}
                        </p>
                        <p>
                          <span className="font-semibold">Last checkup:</span>{' '}
                          {formatDate(selectedPatientDetails.medicalHistory.last_checkup_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Next scheduled checkup:</span>{' '}
                          {formatDate(selectedPatientDetails.medicalHistory.next_scheduled_checkup)}
                        </p>
                        {selectedPatientDetails.medicalHistory.notes && (
                          <p>
                            <span className="font-semibold">Notes:</span>{' '}
                            {selectedPatientDetails.medicalHistory.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {(activeSection === 'care' || activeSection === 'appointments') && (
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className={activeSection !== 'care' ? 'hidden' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Record Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDiagnosis} className="space-y-3">
              <Input
                value={diagnosisForm.diagnosisText}
                onChange={(event) =>
                  setDiagnosisForm((previous) => ({ ...previous, diagnosisText: event.target.value }))
                }
                placeholder="Diagnosis"
              />
              <Input
                value={diagnosisForm.icd10Code}
                onChange={(event) =>
                  setDiagnosisForm((previous) => ({ ...previous, icd10Code: event.target.value }))
                }
                placeholder="ICD-10 code"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={diagnosisForm.severity}
                  onChange={(event) =>
                    setDiagnosisForm((previous) => ({
                      ...previous,
                      severity: event.target.value as DiagnosisFormState['severity'],
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
                <Input
                  type="date"
                  value={diagnosisForm.onsetDate}
                  onChange={(event) =>
                    setDiagnosisForm((previous) => ({ ...previous, onsetDate: event.target.value }))
                  }
                />
              </div>
              <Textarea
                value={diagnosisForm.notes}
                onChange={(event) =>
                  setDiagnosisForm((previous) => ({ ...previous, notes: event.target.value }))
                }
                placeholder="Clinical notes"
              />
              <Button type="submit" disabled={submittingDiagnosis || !selectedPatient}>
                {submittingDiagnosis ? 'Saving...' : 'Save Diagnosis'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={activeSection !== 'care' ? 'hidden' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4" />
              Prescribe Medication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePrescribeMedication} className="space-y-3">
              <Input
                value={medicationForm.medicationName}
                onChange={(event) =>
                  setMedicationForm((previous) => ({ ...previous, medicationName: event.target.value }))
                }
                placeholder="Medication name"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={medicationForm.dosage}
                  onChange={(event) =>
                    setMedicationForm((previous) => ({ ...previous, dosage: event.target.value }))
                  }
                  placeholder="Dosage"
                />
                <select
                  value={medicationForm.unit}
                  onChange={(event) =>
                    setMedicationForm((previous) => ({
                      ...previous,
                      unit: event.target.value as MedicationFormState['unit'],
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ml">ml</option>
                  <option value="mg">mg</option>
                  <option value="tablet">tablet</option>
                  <option value="capsule">capsule</option>
                  <option value="drop">drop</option>
                  <option value="spray">spray</option>
                  <option value="injection">injection</option>
                </select>
              </div>
              <select
                value={medicationForm.frequency}
                onChange={(event) =>
                  setMedicationForm((previous) => ({
                    ...previous,
                    frequency: event.target.value as MedicationFormState['frequency'],
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="once_daily">Once daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="three_times_daily">Three times daily</option>
                <option value="four_times_daily">Four times daily</option>
                <option value="every_6_hours">Every 6 hours</option>
                <option value="every_8_hours">Every 8 hours</option>
                <option value="every_12_hours">Every 12 hours</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="as_needed">As needed</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={medicationForm.startDate}
                  onChange={(event) =>
                    setMedicationForm((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={medicationForm.endDate}
                  onChange={(event) =>
                    setMedicationForm((previous) => ({ ...previous, endDate: event.target.value }))
                  }
                />
              </div>
              <Input
                value={medicationForm.reason}
                onChange={(event) =>
                  setMedicationForm((previous) => ({ ...previous, reason: event.target.value }))
                }
                placeholder="Reason for prescription"
              />
              <Textarea
                value={medicationForm.instructions}
                onChange={(event) =>
                  setMedicationForm((previous) => ({ ...previous, instructions: event.target.value }))
                }
                placeholder="Instructions"
              />
              <Textarea
                value={medicationForm.sideEffects}
                onChange={(event) =>
                  setMedicationForm((previous) => ({ ...previous, sideEffects: event.target.value }))
                }
                placeholder="Possible side effects"
              />
              <Textarea
                value={medicationForm.contraindications}
                onChange={(event) =>
                  setMedicationForm((previous) => ({ ...previous, contraindications: event.target.value }))
                }
                placeholder="Contraindications"
              />
              <Button type="submit" disabled={submittingMedication || !selectedPatient}>
                {submittingMedication ? 'Saving...' : 'Save Prescription'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={activeSection !== 'appointments' ? 'hidden' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4" />
              Schedule Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAppointment} className="space-y-3">
              <Input
                value={appointmentForm.appointmentType}
                onChange={(event) =>
                  setAppointmentForm((previous) => ({ ...previous, appointmentType: event.target.value }))
                }
                placeholder="Appointment type"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={appointmentForm.scheduledDate}
                  onChange={(event) =>
                    setAppointmentForm((previous) => ({ ...previous, scheduledDate: event.target.value }))
                  }
                />
                <Input
                  type="time"
                  value={appointmentForm.scheduledTime}
                  onChange={(event) =>
                    setAppointmentForm((previous) => ({ ...previous, scheduledTime: event.target.value }))
                  }
                />
              </div>
              <Textarea
                value={appointmentForm.reason}
                onChange={(event) =>
                  setAppointmentForm((previous) => ({ ...previous, reason: event.target.value }))
                }
                placeholder="Reason for appointment"
              />
              <Button type="submit" disabled={submittingAppointment || !selectedPatient}>
                {submittingAppointment ? 'Saving...' : 'Create Reminder'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      )}

      {activeSection === 'appointments' && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No upcoming appointments scheduled.</p>
          ) : (
            appointments.map((appointment) => (
              <div key={appointment.appointment_id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{appointment.baby_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {appointment.appointment_type} · {formatDateTime(appointment.scheduled_date, appointment.scheduled_time)}
                    </p>
                  </div>
                  <Badge variant="outline">{appointment.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAppointmentId === appointment.appointment_id || appointment.status !== 'pending'}
                    onClick={() => handleSendAppointmentReminder(appointment.appointment_id)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Reminder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAppointmentId === appointment.appointment_id || appointment.status === 'completed'}
                    onClick={() => handleAppointmentStatus(appointment.appointment_id, 'completed')}
                  >
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAppointmentId === appointment.appointment_id || appointment.status === 'cancelled'}
                    onClick={() => handleAppointmentStatus(appointment.appointment_id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeSection === 'care' && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor Follow-up Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {doctorTasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No doctor follow-up tasks assigned right now.</p>
          ) : (
            doctorTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.priority} priority · {task.category}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Due {task.dueDate}</p>
                    )}
                    {task.details && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{task.details}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleTaskCompletion(task.id)}>
                    Done
                  </Button>
                </div>
              </div>
            ))
          )}
          {urgentDoctorTasks.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              {urgentDoctorTasks.length} urgent follow-up task{urgentDoctorTasks.length === 1 ? '' : 's'} need attention.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {activeSection === 'templates' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlusCircle className="h-4 w-4" />
            Report Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={templateForm.name}
              onChange={(event) => setTemplateForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Template name"
            />
            <Input
              value={templateForm.reportType}
              onChange={(event) =>
                setTemplateForm((previous) => ({ ...previous, reportType: event.target.value }))
              }
              placeholder="Report type"
            />
            <Input
              value={templateForm.includeData}
              onChange={(event) =>
                setTemplateForm((previous) => ({ ...previous, includeData: event.target.value }))
              }
              className="col-span-2"
              placeholder="sleep,feeding,diaper,growth,vaccinations,health"
            />
            <Textarea
              value={templateForm.promptNotes}
              onChange={(event) =>
                setTemplateForm((previous) => ({ ...previous, promptNotes: event.target.value }))
              }
              className="col-span-2 min-h-[80px]"
              placeholder="Optional notes or instructions"
            />
          </div>
          <Button size="sm" onClick={handleCreateTemplate} disabled={savingTemplate}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </Button>

          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{template.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{template.report_type}</p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {(template.include_data || []).join(', ')}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">No templates yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
