import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export type ReactionSeverity = 'none' | 'mild' | 'moderate' | 'severe';

export interface MealLog {
  id: string;
  baby_id: string;
  meal_date: string;
  meal_name: string;
  ingredients: string[];
  calories?: number | null;
  allergens?: string[] | null;
  baby_reaction?: string | null;
  reaction_severity?: ReactionSeverity;
  created_at?: string;
}

export interface NutritionAnalytics {
  mealCount: number;
  calories: number;
  reactionCount: number;
  allergenExposureCount: number;
  ingredientCounts: Record<string, number>;
}

export interface NutritionInfo {
  id: string;
  ingredient_name: string;
  category?: string | null;
  calories_per_100g?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  common_allergen?: boolean;
  allergen_group?: string | null;
  introduction_age_months?: number | null;
  preparation_tips?: string | null;
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

const callNutritionApi = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Nutrition request failed (${response.status})`);
  }

  return payload as T;
};

export const logMeal = async (input: {
  babyId: string;
  mealDate: string;
  mealName: string;
  ingredients: string[];
  calories?: number | null;
  allergens?: string[];
  babyReaction?: string;
  reactionSeverity?: ReactionSeverity;
}): Promise<MealLog> => {
  const payload = await callNutritionApi<{ success: boolean; data: MealLog }>('/nutrition/meals', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload.data;
};

export const getMealLogs = async (
  babyId: string,
  limit = 40,
): Promise<{ meals: MealLog[]; total: number }> => {
  const params = new URLSearchParams({ babyId, limit: String(limit) });
  const payload = await callNutritionApi<{ success: boolean; data: MealLog[]; total?: number }>(
    `/nutrition/meals?${params.toString()}`,
  );

  return {
    meals: payload.data || [],
    total: payload.total || 0,
  };
};

export const getNutritionAnalytics = async (
  babyId: string,
  month?: string,
): Promise<NutritionAnalytics> => {
  const params = new URLSearchParams({ babyId });
  if (month) params.set('month', month);

  const payload = await callNutritionApi<{ success: boolean; data: NutritionAnalytics }>(
    `/nutrition/analytics?${params.toString()}`,
  );

  return {
    mealCount: Number(payload.data?.mealCount || 0),
    calories: Number(payload.data?.calories || 0),
    reactionCount: Number(payload.data?.reactionCount || 0),
    allergenExposureCount: Number(payload.data?.allergenExposureCount || 0),
    ingredientCounts: payload.data?.ingredientCounts || {},
  };
};

export const searchNutritionIngredients = async (query = ''): Promise<NutritionInfo[]> => {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());

  const payload = await callNutritionApi<{ success: boolean; data: NutritionInfo[] }>(
    `/nutrition/ingredients${params.toString() ? `?${params.toString()}` : ''}`,
  );

  return payload.data || [];
};
