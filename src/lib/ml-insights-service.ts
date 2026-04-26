import { supabase } from './supabase';

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  data?: any;
}

const getJsonHeaders = async (): Promise<Record<string, string>> => {
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

const postMl = async (path: string, payload: Record<string, unknown>) =>
  fetch(path, {
    method: 'POST',
    headers: await getJsonHeaders(),
    body: JSON.stringify(payload),
  });

/**
 * Analyze sleep patterns using ML
 */
export async function analyzeSleepPatterns(babyId: string, days: number = 30): Promise<AIInsight[]> {
  try {
    const response = await postMl('/api/ml/analyze-sleep', {
      baby_id: babyId,
      days,
    });

    if (!response.ok) throw new Error('Failed to analyze sleep');
    const { insights } = await response.json();
    return insights;
  } catch (err) {
    console.error('Error analyzing sleep patterns:', err);
    return [];
  }
}

/**
 * Predict next feeding time
 */
export async function predictNextFeedingTime(babyId: string): Promise<{
  predictedTime: string;
  confidence: number;
  reason: string;
} | null> {
  try {
    const response = await postMl('/api/ml/predict-feeding', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to predict feeding time');
    const prediction = await response.json();
    return prediction;
  } catch (err) {
    console.error('Error predicting feeding time:', err);
    return null;
  }
}

/**
 * Predict next sleep time
 */
export async function predictNextSleepTime(babyId: string): Promise<{
  predictedTime: string;
  confidence: number;
  reason: string;
} | null> {
  try {
    const response = await postMl('/api/ml/predict-sleep', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to predict sleep time');
    const prediction = await response.json();
    return prediction;
  } catch (err) {
    console.error('Error predicting sleep time:', err);
    return null;
  }
}

/**
 * Detect anomalies in baby data
 */
export async function detectAnomalies(babyId: string): Promise<AIInsight[]> {
  try {
    const response = await postMl('/api/ml/detect-anomalies', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to detect anomalies');
    const { anomalies } = await response.json();
    return anomalies;
  } catch (err) {
    console.error('Error detecting anomalies:', err);
    return [];
  }
}

/**
 * Get feeding recommendations based on age/weight
 */
export async function getFeedingRecommendations(babyId: string): Promise<AIInsight[]> {
  try {
    const response = await postMl('/api/ml/feeding-recommendations', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to get recommendations');
    const { recommendations } = await response.json();
    return recommendations;
  } catch (err) {
    console.error('Error getting feeding recommendations:', err);
    return [];
  }
}

/**
 * Get sleep recommendations based on age
 */
export async function getSleepRecommendations(babyId: string): Promise<AIInsight[]> {
  try {
    const response = await postMl('/api/ml/sleep-recommendations', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to get recommendations');
    const { recommendations } = await response.json();
    return recommendations;
  } catch (err) {
    console.error('Error getting sleep recommendations:', err);
    return [];
  }
}

/**
 * Analyze growth trajectory
 */
export async function analyzeGrowthTrajectory(babyId: string): Promise<{
  percentile: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  healthAlert?: string;
} | null> {
  try {
    const response = await postMl('/api/ml/analyze-growth', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to analyze growth');
    const analysis = await response.json();
    return analysis;
  } catch (err) {
    console.error('Error analyzing growth:', err);
    return null;
  }
}

/**
 * Get personalized tips based on current state
 */
export async function getPersonalizedTips(babyId: string): Promise<string[]> {
  try {
    const response = await postMl('/api/ml/personalized-tips', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to get tips');
    const { tips } = await response.json();
    return tips;
  } catch (err) {
    console.error('Error getting tips:', err);
    return [];
  }
}

/**
 * Predict milestone timing
 */
export async function predictMilestonesTiming(
  babyId: string
): Promise<
  Array<{
    milestone: string;
    estimatedWeek: number;
    confidence: number;
  }>
> {
  try {
    const response = await postMl('/api/ml/predict-milestones', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to predict milestones');
    const { milestones } = await response.json();
    return milestones;
  } catch (err) {
    console.error('Error predicting milestones:', err);
    return [];
  }
}

/**
 * Calculate sleep score with ML
 */
export async function calculateAdvancedSleepScore(babyId: string): Promise<{
  score: number;
  factors: string[];
  suggestions: string[];
} | null> {
  try {
    const response = await postMl('/api/ml/sleep-score', { baby_id: babyId });

    if (!response.ok) throw new Error('Failed to calculate sleep score');
    const score = await response.json();
    return score;
  } catch (err) {
    console.error('Error calculating sleep score:', err);
    return null;
  }
}
