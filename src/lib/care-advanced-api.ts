import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';
import type {
  EmergencySharePresetKey,
  EmergencyShareRiskLevel,
} from './emergency-share-utils';

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
    filteredPatients?: number;
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

export type EmergencyShareSection =
  | 'demographics'
  | 'allergies'
  | 'medications'
  | 'growth'
  | 'vaccines'
  | 'doctor_contacts';

export interface CreateEmergencyShareLinkInput {
  ttlMinutes: number;
  presetKey?: EmergencySharePresetKey;
  maxViews?: number | null;
  requiresPin?: boolean;
  accessPin?: string;
  allowedSections?: EmergencyShareSection[];
}

export interface EmergencyShareLinkResponse {
  token: string;
  shareUrl: string;
  apiUrl: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  ttlMinutes: number;
  presetKey?: EmergencySharePresetKey;
  maxViews?: number | null;
  viewCount?: number;
  remainingViews?: number | null;
  requiresPin?: boolean;
  allowedSections?: EmergencyShareSection[];
}

export type EmergencyShareLinkStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'view_limit_reached';

export interface EmergencyShareLinkAccessLogSummary {
  id: string;
  accessedAt: string;
  result:
    | 'success'
    | 'not_found'
    | 'expired'
    | 'revoked'
    | 'pin_required'
    | 'pin_failed'
    | 'view_limit_reached'
    | 'pending';
  viewerLabel?: string | null;
  requestPath?: string | null;
  deviceSummary?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  locationSummary?: string;
  riskLevel?: EmergencyShareRiskLevel;
  riskReason?: string | null;
}

export interface EmergencyShareLinkSummary {
  id: string;
  tokenPrefix: string;
  presetKey?: EmergencySharePresetKey;
  expiresAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  createdAt: string;
  ttlMinutes?: number | null;
  lastAccessedAt?: string | null;
  lastAccessResult: string;
  viewCount: number;
  maxViews?: number | null;
  remainingViews?: number | null;
  requiresPin: boolean;
  allowedSections: EmergencyShareSection[];
  status: EmergencyShareLinkStatus;
  accessLogs: EmergencyShareLinkAccessLogSummary[];
}

export interface PublicEmergencyShareCardResponse extends EmergencyShareCardResponse {
  shareToken: string;
  expiresAt: string;
  maxViews?: number | null;
  viewCount?: number;
  remainingViews?: number | null;
  requiresPin?: boolean;
  allowedSections?: EmergencyShareSection[];
}

export interface CareApprovalTimelineEvent {
  id: string;
  approvalRequestId: string;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  requestType?: string | null;
  requestStatus?: string | null;
}

export type ActivityCenterCategory = 'care' | 'sharing' | 'billing';
export type ActivityCenterTone = 'info' | 'success' | 'warning' | 'critical';
export type ActivityCenterEventKind =
  | 'care_approval'
  | 'medication_dose'
  | 'emergency_share_access'
  | 'payment'
  | 'family_invite';

export interface ActivityCenterEvent {
  id: string;
  kind: ActivityCenterEventKind;
  category: ActivityCenterCategory;
  tone: ActivityCenterTone;
  title: string;
  summary: string;
  occurredAt: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityCenterFeedResponse {
  babyId: string;
  babyName?: string | null;
  role: string;
  generatedAt: string;
  summary: {
    total: number;
    urgent: number;
    actionRequired: number;
    care: number;
    sharing: number;
    billing: number;
  };
  items: ActivityCenterEvent[];
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

export const saveMedicationSchedule = async (
  input: Record<string, unknown>,
): Promise<{
  data?: MedicationSchedule;
  mode?: 'created' | 'updated';
  requiresApproval?: boolean;
  approvalRequest?: CareApprovalRequest;
  message?: string;
}> => {
  const payload = await requestJson<{
    success: boolean;
    data?: MedicationSchedule;
    mode?: 'created' | 'updated';
    requiresApproval?: boolean;
    approvalRequest?: CareApprovalRequest;
    message?: string;
  }>(`/care/medications/schedules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    data: payload.data,
    mode: payload.mode,
    requiresApproval: payload.requiresApproval,
    approvalRequest: payload.approvalRequest,
    message: payload.message,
  };
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

export const getClinicPatientQueue = async (filters?: {
  search?: string;
  pendingOnly?: boolean;
  overdueOnly?: boolean;
  sortBy?: 'priority' | 'appointments';
}): Promise<ClinicPanelPayload> => {
  const searchParams = new URLSearchParams();
  if (filters?.search) searchParams.set('search', filters.search);
  if (filters?.pendingOnly) searchParams.set('pendingOnly', 'true');
  if (filters?.overdueOnly) searchParams.set('overdueOnly', 'true');
  if (filters?.sortBy) searchParams.set('sortBy', filters.sortBy);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const payload = await requestJson<{ success: boolean; data: ClinicPanelPayload }>(
    `/care/clinic/patient-queue${suffix}`,
  );
  return payload.data;
};

export const exportClinicPatientQueue = async (filters?: {
  search?: string;
  pendingOnly?: boolean;
  overdueOnly?: boolean;
  sortBy?: 'priority' | 'appointments';
}): Promise<void> => {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();
  if (filters?.search) searchParams.set('search', filters.search);
  if (filters?.pendingOnly) searchParams.set('pendingOnly', 'true');
  if (filters?.overdueOnly) searchParams.set('overdueOnly', 'true');
  if (filters?.sortBy) searchParams.set('sortBy', filters.sortBy);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const response = await fetch(`${getApiBaseUrl()}/care/clinic/patient-queue/export${suffix}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Failed to export queue (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clinic-patient-queue.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export const getActivityCenterFeed = async (
  babyId: string,
  limit = 40,
): Promise<ActivityCenterFeedResponse> => {
  const payload = await requestJson<{ success: boolean; data: ActivityCenterFeedResponse }>(
    `/care/activity-feed/${babyId}?limit=${Math.max(1, Math.min(80, limit))}`,
  );
  return payload.data;
};

export const createEmergencyShareLink = async (
  babyId: string,
  input: number | CreateEmergencyShareLinkInput,
): Promise<EmergencyShareLinkResponse> => {
  const payloadBody: CreateEmergencyShareLinkInput =
    typeof input === 'number'
      ? { ttlMinutes: input }
      : {
          ttlMinutes: input.ttlMinutes,
          presetKey: input.presetKey || 'custom',
          maxViews: input.maxViews ?? null,
          requiresPin: Boolean(input.requiresPin),
          accessPin: input.accessPin || '',
          allowedSections: input.allowedSections || [],
        };

  const payload = await requestJson<{ success: boolean; data: EmergencyShareLinkResponse }>(
    `/care/emergency-card/${babyId}/share-link`,
    {
      method: 'POST',
      body: JSON.stringify(payloadBody),
    },
  );
  return payload.data;
};

export const getEmergencyShareLinks = async (
  babyId: string,
): Promise<EmergencyShareLinkSummary[]> => {
  const payload = await requestJson<{ success: boolean; data: EmergencyShareLinkSummary[] }>(
    `/care/emergency-card/${babyId}/share-links`,
  );
  return payload.data || [];
};

export const revokeEmergencyShareLink = async (
  babyId: string,
  linkId: string,
  reason?: string,
): Promise<EmergencyShareLinkSummary> => {
  const payload = await requestJson<{ success: boolean; data: EmergencyShareLinkSummary }>(
    `/care/emergency-card/${babyId}/share-links/${linkId}/revoke`,
    {
      method: 'POST',
      body: JSON.stringify({
        reason: reason || 'revoked_by_owner',
      }),
    },
  );
  return payload.data;
};

export const getPublicEmergencyShareCard = async (
  token: string,
  options?: { pin?: string; viewer?: string },
): Promise<PublicEmergencyShareCardResponse> => {
  const url = new URL(`${getApiBaseUrl()}/care/public/emergency-card/${token}`);
  if (options?.pin) {
    url.searchParams.set('pin', options.pin);
  }
  if (options?.viewer?.trim()) {
    url.searchParams.set('viewer', options.viewer.trim());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error || `Failed to load public emergency card (${response.status})`) as Error & {
      pinRequired?: boolean;
      status?: number;
    };
    error.pinRequired = Boolean(payload?.pinRequired);
    error.status = response.status;
    throw error;
  }

  return payload.data as PublicEmergencyShareCardResponse;
};

export const getCareApprovalTimeline = async (
  babyId: string,
  limit = 150,
): Promise<CareApprovalTimelineEvent[]> => {
  const payload = await requestJson<{ success: boolean; data: CareApprovalTimelineEvent[] }>(
    `/care/approvals/${babyId}/timeline?limit=${Math.max(1, Math.min(400, limit))}`,
  );
  return payload.data || [];
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

export const downloadPublicEmergencyShareCardPdf = async (
  token: string,
  options?: { pin?: string; viewer?: string },
): Promise<void> => {
  const requestUrl = new URL(`${getApiBaseUrl()}/care/public/emergency-card/${token}/pdf`);
  if (options?.pin) {
    requestUrl.searchParams.set('pin', options.pin);
  }
  if (options?.viewer?.trim()) {
    requestUrl.searchParams.set('viewer', options.viewer.trim());
  }

  const response = await fetch(requestUrl.toString(), {
    method: 'GET',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload?.error || `Failed to download public emergency PDF (${response.status})`) as Error & {
      pinRequired?: boolean;
      status?: number;
    };
    error.pinRequired = Boolean(payload?.pinRequired);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'emergency-share-card.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
