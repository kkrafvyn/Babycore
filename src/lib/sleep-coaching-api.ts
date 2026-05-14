import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export type SleepTrainingMethod = 'ferber' | 'camp_out' | 'gentle';

export interface SleepCoachingProgram {
  id: string;
  baby_id: string;
  method: string;
  target_bedtime: string;
  current_challenges?: string[];
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  start_date: string;
  end_date?: string | null;
}

export interface SleepCoachingSession {
  id: string;
  program_id: string;
  day_number: number;
  session_date: string;
  bedtime_achieved?: boolean;
  night_wakings?: number | null;
  total_sleep_minutes?: number | null;
  notes?: string | null;
  parent_fatigue?: number | null;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

const callSleepCoachingApi = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Sleep coaching request failed (${response.status})`);
  }

  return payload as T;
};

export const ensureSleepCoachingProgram = async (
  babyId: string,
  method: SleepTrainingMethod,
): Promise<SleepCoachingProgram> => {
  const payload = await callSleepCoachingApi<{ success: boolean; data: SleepCoachingProgram }>(
    '/sleep-coaching/program',
    {
      method: 'POST',
      body: JSON.stringify({ babyId, method }),
    },
  );

  return payload.data;
};

export const logSleepCoachingSession = async (input: {
  babyId: string;
  programId?: string | null;
  method: SleepTrainingMethod;
  totalSleepMinutes: number;
  notes?: string;
}): Promise<SleepCoachingSession> => {
  const payload = await callSleepCoachingApi<{ success: boolean; data: SleepCoachingSession }>(
    '/sleep-coaching/sessions',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return payload.data;
};
