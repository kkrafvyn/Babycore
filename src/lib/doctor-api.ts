import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string;
  license_number: string;
  medical_board?: string | null;
  qualification?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  clinic_email?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  is_verified?: boolean | null;
  verified_at?: string | null;
  verified_by?: string | null;
  years_of_experience?: number | null;
  languages_spoken?: string[] | null;
  consultation_fee?: number | null;
  availability_hours?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorAssignedBaby {
  babyId: string;
  babyName: string;
  babyDateOfBirth?: string | null;
  babyGender?: 'boy' | 'girl' | 'other' | string | null;
  babyPhotoUrl?: string | null;
  babyCountry?: string | null;
  babyCreatedAt?: string | null;
  parentId?: string | null;
  parentEmail?: string | null;
  status: string;
  assignmentReason?: string | null;
}

export interface DoctorDiagnosis {
  id: string;
  baby_id: string;
  doctor_id: string;
  diagnosis_text: string;
  icd10_code?: string | null;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical' | null;
  onset_date: string;
  status: 'active' | 'resolved' | 'under_investigation';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorMedicationSummary {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  doctor_name?: string | null;
  prescribed_at?: string | null;
  status: string;
}

export interface DoctorBabyDetails {
  baby: {
    id: string;
    name: string;
    date_of_birth: string;
    gender?: 'boy' | 'girl' | 'other' | string | null;
    photo_url?: string | null;
    country?: string | null;
    created_at?: string | null;
  } | null;
  diagnoses: DoctorDiagnosis[];
  medications: DoctorMedicationSummary[];
  medicalHistory?: {
    allergies?: string[] | null;
    chronic_conditions?: string[] | null;
    current_medications?: string[] | null;
    family_medical_history?: string | null;
    immunization_status?: string | null;
    last_checkup_date?: string | null;
    next_scheduled_checkup?: string | null;
    notes?: string | null;
  } | null;
}

export interface DoctorUpcomingAppointment {
  appointment_id: string;
  baby_id: string;
  baby_name: string;
  parent_id?: string | null;
  scheduled_date: string;
  scheduled_time?: string | null;
  appointment_type: string;
  status: 'pending' | 'reminded' | 'completed' | 'cancelled' | 'no_show';
}

export interface DoctorDashboardData {
  patientCount: number;
  upcomingAppointments: DoctorUpcomingAppointment[];
  recentDiagnoses: DoctorDiagnosis[];
}

export interface SaveDoctorProfileInput {
  fullName: string;
  specialization: string;
  licenseNumber: string;
  qualification: string;
  medicalBoard?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  bio?: string;
  yearsOfExperience?: number | null;
  languagesSpoken?: string[];
  consultationFee?: number | null;
  availabilityHours?: Record<string, string | null> | null;
}

export interface CreateDoctorDiagnosisInput {
  babyId: string;
  diagnosisText: string;
  icd10Code?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate: string;
  notes?: string;
}

export interface UpdateDoctorDiagnosisInput {
  status: 'active' | 'resolved' | 'under_investigation';
  notes?: string;
}

export interface PrescribeDoctorMedicationInput {
  babyId: string;
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
  endDate?: string;
  reason?: string;
  instructions?: string;
  sideEffects?: string;
  contraindications?: string;
}

export interface CreateDoctorAppointmentReminderInput {
  babyId: string;
  parentId: string;
  appointmentType: string;
  scheduledDate: string;
  scheduledTime?: string;
  reason?: string;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();
  const accessToken: string | undefined = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

const requestDoctorJson = async <T>(
  path: string,
  init?: RequestInit,
  options?: { allowNotFound?: boolean },
): Promise<T | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (options?.allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload as T;
};

export const getOwnDoctorProfile = async (): Promise<DoctorProfile | null> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorProfile }>(
    '/doctor/profile',
    { method: 'GET' },
    { allowNotFound: true },
  );
  return payload?.data || null;
};

export const saveDoctorProfile = async (
  input: SaveDoctorProfileInput,
): Promise<DoctorProfile> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorProfile }>(
    '/doctor/profile',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!payload?.data) {
    throw new Error('Doctor profile was not returned by the server.');
  }

  return payload.data;
};

export const getDoctorAssignedBabies = async (): Promise<DoctorAssignedBaby[]> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorAssignedBaby[] }>(
    '/doctor/babies',
    { method: 'GET' },
  );
  return payload?.data || [];
};

export const getDoctorBabyDetails = async (babyId: string): Promise<DoctorBabyDetails> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorBabyDetails }>(
    `/doctor/babies/${encodeURIComponent(babyId)}/details`,
    { method: 'GET' },
  );

  if (!payload?.data) {
    throw new Error('Doctor baby details were not returned by the server.');
  }

  return payload.data;
};

export const createDoctorDiagnosis = async (
  input: CreateDoctorDiagnosisInput,
): Promise<DoctorDiagnosis> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorDiagnosis }>(
    '/doctor/diagnoses',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!payload?.data) {
    throw new Error('Diagnosis was not returned by the server.');
  }

  return payload.data;
};

export const getDoctorDiagnoses = async (babyId: string): Promise<DoctorDiagnosis[]> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorDiagnosis[] }>(
    `/doctor/diagnoses/${encodeURIComponent(babyId)}`,
    { method: 'GET' },
  );
  return payload?.data || [];
};

export const updateDoctorDiagnosis = async (
  diagnosisId: string,
  input: UpdateDoctorDiagnosisInput,
): Promise<DoctorDiagnosis> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorDiagnosis }>(
    `/doctor/diagnoses/${encodeURIComponent(diagnosisId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );

  if (!payload?.data) {
    throw new Error('Updated diagnosis was not returned by the server.');
  }

  return payload.data;
};

export const prescribeDoctorMedication = async (
  input: PrescribeDoctorMedicationInput,
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    '/doctor/medications',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!payload?.data) {
    throw new Error('Medication was not returned by the server.');
  }

  return payload.data;
};

export const getDoctorMedications = async (babyId: string): Promise<DoctorMedicationSummary[]> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorMedicationSummary[] }>(
    `/doctor/medications/${encodeURIComponent(babyId)}`,
    { method: 'GET' },
  );
  return payload?.data || [];
};

export const trackDoctorMedicationAdherence = async (
  medicationId: string,
  input?: { givenAt?: string; notes?: string },
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    `/doctor/medications/${encodeURIComponent(medicationId)}/track-adherence`,
    {
      method: 'POST',
      body: JSON.stringify(input || {}),
    },
  );

  if (!payload?.data) {
    throw new Error('Medication adherence response was not returned by the server.');
  }

  return payload.data;
};

export const stopDoctorMedication = async (
  medicationId: string,
  reason?: string,
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    `/doctor/medications/${encodeURIComponent(medicationId)}/stop`,
    {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    },
  );

  if (!payload?.data) {
    throw new Error('Medication stop response was not returned by the server.');
  }

  return payload.data;
};

export const createDoctorAppointmentReminder = async (
  input: CreateDoctorAppointmentReminderInput,
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    '/doctor/appointments/reminders',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!payload?.data) {
    throw new Error('Appointment reminder was not returned by the server.');
  }

  return payload.data;
};

export const getDoctorUpcomingAppointments = async (
  days = 7,
): Promise<DoctorUpcomingAppointment[]> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorUpcomingAppointment[] }>(
    `/doctor/appointments/upcoming?days=${Math.max(1, days)}`,
    { method: 'GET' },
  );
  return payload?.data || [];
};

export const updateDoctorAppointmentReminderStatus = async (
  reminderId: string,
  status: 'pending' | 'reminded' | 'completed' | 'cancelled' | 'no_show',
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    `/doctor/appointments/reminders/${encodeURIComponent(reminderId)}/status`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  );

  if (!payload?.data) {
    throw new Error('Appointment status response was not returned by the server.');
  }

  return payload.data;
};

export const sendDoctorAppointmentReminderNotification = async (
  reminderId: string,
): Promise<Record<string, unknown>> => {
  const payload = await requestDoctorJson<{ success: boolean; data: Record<string, unknown> }>(
    `/doctor/appointments/reminders/${encodeURIComponent(reminderId)}/send-notification`,
    {
      method: 'POST',
    },
  );

  if (!payload?.data) {
    throw new Error('Reminder notification response was not returned by the server.');
  }

  return payload.data;
};

export const getDoctorDashboard = async (): Promise<DoctorDashboardData> => {
  const payload = await requestDoctorJson<{ success: boolean; data: DoctorDashboardData }>(
    '/doctor/dashboard',
    { method: 'GET' },
  );

  if (!payload?.data) {
    throw new Error('Doctor dashboard data was not returned by the server.');
  }

  return payload.data;
};
