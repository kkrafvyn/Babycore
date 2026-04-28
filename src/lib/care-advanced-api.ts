import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export interface MedicationSchedule {
  id: string;
  baby_id: string;
  medication_name: string;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  interval_hours?: number | null;
  doses_per_day?: number | null;
  reminder_times?: string[];
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  stock_quantity?: number | null;
  stock_unit?: string | null;
  refill_threshold?: number | null;
  next_refill_due_date?: string | null;
  requires_confirmation?: boolean;
  status: 'active' | 'paused' | 'completed';
  updated_at: string;
}

export interface MedicationDoseLog {
  id: string;
  baby_id: string;
  schedule_id: string;
  medication_name: string;
  dose_status: 'taken' | 'missed' | 'skipped';
  planned_for?: string | null;
  logged_at: string;
  quantity_used?: number | null;
  notes?: string | null;
  approval_required?: boolean;
  approval_request_id?: string | null;
  medication_schedules?: MedicationSchedule;
}

export interface RefillAlert {
  scheduleId: string;
  medicationName: string;
  stockQuantity: number | null;
  stockUnit: string | null;
  refillThreshold: number;
  nextRefillDueDate: string | null;
  shouldAlert: boolean;
  reason: 'low_stock' | 'refill_due' | null;
}

export interface CareApprovalRequest {
  id: string;
  baby_id: string;
  request_type: string;
  target_table?: string | null;
  target_record_id?: string | null;
  requested_payload?: Record<string, unknown>;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string;
  requested_by_role?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicPanelPayload {
  queue: Array<{
    assignmentId: string;
    babyId: string;
    babyName: string;
    babyPhotoUrl?: string | null;
    country?: string;
    dateOfBirth?: string | null;
    nextAppointment?: {
      scheduled_date?: string;
      scheduled_time?: string;
      appointment_type?: string;
      status?: string;
    } | null;
    pendingApprovalsCount: number;
    overdueVaccinesCount: number;
    status: string;
  }>;
  alertInbox: Array<{
    type: 'approval' | 'vaccine' | string;
    id: string;
    babyId: string;
    createdAt: string;
    title: string;
    message: string;
  }>;
  stats: {
    totalPatients: number;
    pendingApprovals: number;
    overdueVaccines: number;
  };
}

export interface ClinicReportTemplate {
  id: string;
  doctor_id: string;
  name: string;
  report_type: string;
  include_data: string[];
  prompt_notes?: string | null;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyShareCardResponse {
  baby: {
    id: string;
    name: string;
    date_of_birth: string;
    country: string;
  };
  generatedAt: string;
  allergies: Array<Record<string, unknown>>;
  medications: Array<Record<string, unknown>>;
  latestGrowth?: Record<string, unknown> | null;
  vaccines: Array<Record<string, unknown>>;
  doctorContacts: Array<Record<string, unknown>>;
  text: string;
  qrCodeDataUrl: string;
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

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload as T;
};

export const getMedicationSchedules = async (babyId: string): Promise<MedicationSchedule[]> => {
  const payload = await requestJson<{ success: boolean; data: MedicationSchedule[] }>(
    `/care/medications/${babyId}/schedules`,
  );
  return payload.data || [];
};

export const saveMedicationSchedule = async (input: Record<string, unknown>): Promise<MedicationSchedule> => {
  const payload = await requestJson<{ success: boolean; data: MedicationSchedule }>(`/care/medications/schedules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.data;
};

export const logMedicationDoseAdvanced = async (
  scheduleId: string,
  input: Record<string, unknown>,
): Promise<{ data: MedicationDoseLog; approvalRequest?: CareApprovalRequest | null; requiresApproval?: boolean }> => {
  const payload = await requestJson<{
    success: boolean;
    data: MedicationDoseLog;
    approvalRequest?: CareApprovalRequest | null;
    requiresApproval?: boolean;
  }>(`/care/medications/${scheduleId}/log`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    data: payload.data,
    approvalRequest: payload.approvalRequest,
    requiresApproval: payload.requiresApproval,
  };
};

export const getMedicationDoseLogs = async (babyId: string): Promise<MedicationDoseLog[]> => {
  const payload = await requestJson<{ success: boolean; data: MedicationDoseLog[] }>(
    `/care/medications/${babyId}/logs`,
  );
  return payload.data || [];
};

export const getMedicationRefillAlerts = async (babyId: string): Promise<RefillAlert[]> => {
  const payload = await requestJson<{ success: boolean; data: RefillAlert[] }>(
    `/care/medications/${babyId}/refill-alerts`,
  );
  return payload.data || [];
};

export const createCareApprovalRequest = async (
  input: Record<string, unknown>,
): Promise<CareApprovalRequest> => {
  const payload = await requestJson<{ success: boolean; data: CareApprovalRequest }>(`/care/approvals`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.data;
};

export const getCareApprovalRequests = async (
  babyId: string,
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' = 'all',
): Promise<{ requests: CareApprovalRequest[]; canDecide: boolean }> => {
  const payload = await requestJson<{
    success: boolean;
    data: CareApprovalRequest[];
    canDecide: boolean;
  }>(`/care/approvals/${babyId}?status=${status}`);

  return {
    requests: payload.data || [],
    canDecide: Boolean(payload.canDecide),
  };
};

export const decideCareApprovalRequest = async (
  approvalId: string,
  decision: 'approved' | 'rejected' | 'cancelled',
  notes?: string,
): Promise<CareApprovalRequest> => {
  const payload = await requestJson<{ success: boolean; data: CareApprovalRequest }>(
    `/care/approvals/${approvalId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    },
  );
  return payload.data;
};

export const getClinicPatientQueue = async (): Promise<ClinicPanelPayload> => {
  const payload = await requestJson<{ success: boolean; data: ClinicPanelPayload }>(`/care/clinic/patient-queue`);
  return payload.data;
};

export const getClinicReportTemplates = async (): Promise<ClinicReportTemplate[]> => {
  const payload = await requestJson<{ success: boolean; data: ClinicReportTemplate[] }>(
    `/care/clinic/report-templates`,
  );
  return payload.data || [];
};

export const saveClinicReportTemplate = async (
  input: Record<string, unknown>,
): Promise<ClinicReportTemplate> => {
  const payload = await requestJson<{ success: boolean; data: ClinicReportTemplate }>(
    `/care/clinic/report-templates`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return payload.data;
};

export const deleteClinicReportTemplate = async (templateId: string): Promise<void> => {
  await requestJson<{ success: boolean }>(`/care/clinic/report-templates/${templateId}`, {
    method: 'DELETE',
  });
};

export const getEmergencyShareCard = async (babyId: string): Promise<EmergencyShareCardResponse> => {
  const payload = await requestJson<{ success: boolean; data: EmergencyShareCardResponse }>(
    `/care/emergency-card/${babyId}`,
  );
  return payload.data;
};

export const downloadEmergencyShareCardPdf = async (babyId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}/care/emergency-card/${babyId}/pdf`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Failed to download emergency PDF (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'emergency-share-card.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

