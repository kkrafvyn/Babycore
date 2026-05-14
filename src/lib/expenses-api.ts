import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export type ExpenseCategory = 'formula' | 'diapers' | 'clothing' | 'toys' | 'medical' | 'other';

export interface BabyExpense {
  id: string;
  baby_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  purchase_date: string;
  quantity?: number;
  receipt_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseAnalytics {
  byCategory: Partial<Record<ExpenseCategory, number>>;
  countByCategory: Partial<Record<ExpenseCategory, number>>;
  total: number;
  averagePerExpense: number;
  expenseCount: number;
}

export interface CreateExpenseInput {
  babyId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  quantity?: number;
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

const callExpensesApi = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Expense request failed (${response.status})`);
  }

  return payload as T;
};

export const logBabyExpense = async (input: CreateExpenseInput): Promise<BabyExpense> => {
  const payload = await callExpensesApi<{ success: boolean; data: BabyExpense }>('/expenses/log', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    ...payload.data,
    amount: Number(payload.data.amount || 0),
  };
};

export const getBabyExpenses = async (
  babyId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ expenses: BabyExpense[]; total: number }> => {
  const params = new URLSearchParams({
    babyId,
    limit: String(options.limit || 40),
    offset: String(options.offset || 0),
  });
  const payload = await callExpensesApi<{ success: boolean; data: BabyExpense[]; total?: number }>(
    `/expenses/logs?${params.toString()}`,
  );

  return {
    expenses: (payload.data || []).map((expense) => ({
      ...expense,
      amount: Number(expense.amount || 0),
    })),
    total: payload.total || 0,
  };
};

export const getExpenseAnalytics = async (
  babyId: string,
  month?: string,
): Promise<ExpenseAnalytics> => {
  const params = new URLSearchParams({ babyId });
  if (month) params.set('month', month);

  const payload = await callExpensesApi<{ success: boolean; data: ExpenseAnalytics }>(
    `/expenses/analytics?${params.toString()}`,
  );

  return {
    byCategory: payload.data?.byCategory || {},
    countByCategory: payload.data?.countByCategory || {},
    total: Number(payload.data?.total || 0),
    averagePerExpense: Number(payload.data?.averagePerExpense || 0),
    expenseCount: Number(payload.data?.expenseCount || 0),
  };
};
