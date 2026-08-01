import { resolveApiUrl } from './api-base-url';
import { supabase } from './supabase';

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  data?: any;
}

export interface ScrapbookSummary {
  title: string;
  summary: string;
  highlights: string[];
  vibe: string;
  stats?: {
    journalEntries: number;
    memories: number;
    feedLogs: number;
    sleepLogs: number;
    diaperLogs: number;
  };
}

export interface CareCopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CareCopilotResponse {
  response: string;
  usedModel: string;
  usedProvider?: string;
  generatedAt: string;
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
  fetch(resolveApiUrl(path), {
    method: 'POST',
    headers: await getJsonHeaders(),
    body: JSON.stringify(payload),
  });

const normalizeConfidence = (value: unknown, fallback = 0.5): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
};

export async function generateMonthlyScrapbookSummary(
  babyId: string,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
): Promise<ScrapbookSummary | null> {
  try {
    const response = await postMl('/ml/scrapbook-summary', {
      babyId,
      month,
      year,
    });

    if (!response.ok) {
      throw new Error('Failed to generate scrapbook summary');
    }

    const payload = await response.json();
    return payload?.scrapbook || null;
  } catch (error) {
    console.error('Error generating scrapbook summary:', error);
    return null;
  }
}

/**
 * Ask AI care copilot a contextual question about this baby profile
 */
export async function askCareCopilot(
  babyId: string,
  prompt: string,
  history: CareCopilotMessage[] = [],
): Promise<CareCopilotResponse | null> {
  try {
    const response = await postMl('/ml/care-copilot', {
      babyId,
      prompt,
      history: history.slice(-8),
    });

    if (!response.ok) {
      throw new Error(`Care copilot request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!payload?.success || !payload?.response) {
      return null;
    }

    return {
      response: String(payload.response),
      usedModel: String(payload.usedModel || 'cradlyn-guidance'),
      usedProvider: payload.usedProvider ? String(payload.usedProvider) : undefined,
      generatedAt: String(payload.generatedAt || new Date().toISOString()),
    };
  } catch (error) {
    console.error('Error asking care copilot:', error);
    return null;
  }
}

/**
 * Analyze sleep patterns using ML
 */
export async function analyzeSleepPatterns(babyId: string, days: number = 30): Promise<AIInsight[]> {
  try {
    const response = await postMl('/ml/analyze-sleep-patterns', {
      babyId,
      daysBack: days,
    });

    if (!response.ok) throw new Error('Failed to analyze sleep');
    const payload = await response.json();
    const analysis = payload?.analysis || {};
    const insights: AIInsight[] = [];

    if (analysis?.trends) {
      insights.push({
        type: 'trend',
        title: 'Sleep trend',
        description: `Sleep trend is currently ${analysis.trends}.`,
        confidence: 0.78,
        actionable: true,
      });
    }

    for (const anomaly of analysis?.anomalies || []) {
      insights.push({
        type: 'anomaly',
        title: 'Sleep anomaly detected',
        description: `Unusual sleep value recorded on ${new Date(anomaly.date).toLocaleDateString()}.`,
        confidence: 0.72,
        actionable: true,
        data: anomaly,
      });
    }

    for (const recommendation of analysis?.recommendations || []) {
      insights.push({
        type: 'recommendation',
        title: 'Sleep recommendation',
        description: String(recommendation),
        confidence: 0.68,
        actionable: true,
      });
    }

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
    const sleepPrediction = await predictNextSleepTime(babyId);
    if (sleepPrediction?.predictedTime) {
      const date = new Date(sleepPrediction.predictedTime);
      date.setMinutes(date.getMinutes() - 90);
      return {
        predictedTime: date.toISOString(),
        confidence: Math.max(0.45, sleepPrediction.confidence - 0.1),
        reason: 'Estimated from recent sleep interval patterns',
      };
    }

    const fallback = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return {
      predictedTime: fallback.toISOString(),
      confidence: 0.4,
      reason: 'Fallback estimate due to limited data',
    };
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
    const response = await postMl('/ml/predict-next-sleep', { babyId });

    if (!response.ok) throw new Error('Failed to predict sleep time');
    const payload = await response.json();
    const prediction = payload?.prediction;
    if (!prediction?.predictedTime) return null;

    return {
      predictedTime: prediction.predictedTime,
      confidence: normalizeConfidence(prediction.confidence, 0.5),
      reason: 'Based on recent sleep intervals',
    };
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
    const response = await postMl('/ml/analyze-sleep-patterns', {
      babyId,
      daysBack: 30,
    });
    if (!response.ok) throw new Error('Failed to detect anomalies');

    const payload = await response.json();
    const anomalies = payload?.analysis?.anomalies || [];
    return anomalies.map((anomaly: any) => ({
      type: 'anomaly',
      title: 'Anomaly detected',
      description: `Unexpected sleep value detected on ${new Date(anomaly.date).toLocaleDateString()}.`,
      confidence: 0.72,
      actionable: true,
      data: anomaly,
    }));
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
    const growth = await analyzeGrowthTrajectory(babyId);
    const tips: AIInsight[] = [
      {
        type: 'recommendation',
        title: 'Hydration check',
        description: 'Track feeds consistently to detect appetite changes early.',
        confidence: 0.62,
        actionable: true,
      },
    ];

    if (growth?.healthAlert) {
      tips.push({
        type: 'recommendation',
        title: 'Growth follow-up',
        description: growth.healthAlert,
        confidence: 0.78,
        actionable: true,
      });
    }

    return tips;
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
    const response = await postMl('/ml/analyze-sleep-patterns', {
      babyId,
      daysBack: 21,
    });

    if (!response.ok) throw new Error('Failed to get recommendations');
    const payload = await response.json();
    const recommendations = payload?.analysis?.recommendations || [];
    return recommendations.map((item: string) => ({
      type: 'recommendation',
      title: 'Sleep guidance',
      description: item,
      confidence: 0.7,
      actionable: true,
    }));
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
    const response = await postMl('/ml/growth-analysis', { babyId });

    if (!response.ok) throw new Error('Failed to analyze growth');
    const payload = await response.json();
    const analysis = payload?.analysis || {};
    const trendRaw = String(analysis?.trend || 'stable');
    const trend = (trendRaw === 'increasing' || trendRaw === 'decreasing' ? trendRaw : 'stable') as
      | 'increasing'
      | 'stable'
      | 'decreasing';
    const percentile = Number(analysis?.currentPercentile?.weight || 50);
    const concerns = Array.isArray(analysis?.concerns) ? analysis.concerns : [];

    return {
      percentile: Number.isFinite(percentile) ? percentile : 50,
      trend,
      healthAlert: concerns[0],
    };
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
    const [sleepInsights, growth] = await Promise.all([
      analyzeSleepPatterns(babyId, 14),
      analyzeGrowthTrajectory(babyId),
    ]);

    const tips = sleepInsights
      .filter((item) => item.type === 'recommendation')
      .map((item) => item.description);

    if (growth?.healthAlert) {
      tips.push(growth.healthAlert);
    }

    return Array.from(new Set(tips)).slice(0, 6);
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
    const milestones = ['rolling', 'sitting', 'crawling', 'walking', 'talking'];
    const results = await Promise.all(
      milestones.map(async (milestone) => {
        const response = await postMl('/ml/predict-milestone', { babyId, milestone });
        if (!response.ok) return null;
        const payload = await response.json();
        const prediction = payload?.prediction;
        if (!prediction) return null;

        return {
          milestone,
          estimatedWeek: Math.max(0, Math.round(Number(prediction.monthsUntil || 0) * 4)),
          confidence: normalizeConfidence(prediction.confidence, 0.6),
        };
      }),
    );

    return results.filter(Boolean) as Array<{
      milestone: string;
      estimatedWeek: number;
      confidence: number;
    }>;
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
    const response = await postMl('/ml/analyze-sleep-patterns', {
      babyId,
      daysBack: 14,
    });

    if (!response.ok) throw new Error('Failed to calculate sleep score');
    const payload = await response.json();
    const analysis = payload?.analysis || {};
    const avgSleepMinutes = Number(analysis?.averageSleepPerDay || 0);
    const quality = Number(analysis?.sleepQuality || 0);
    const score = Math.max(
      0,
      Math.min(100, Math.round((avgSleepMinutes / 720) * 60 + (quality / 10) * 40)),
    );

    return {
      score,
      factors: [
        `Average sleep: ${Math.round(avgSleepMinutes)} minutes/day`,
        `Sleep quality index: ${quality.toFixed(1)}`,
      ],
      suggestions: analysis?.recommendations || [],
    };
  } catch (err) {
    console.error('Error calculating sleep score:', err);
    return null;
  }
}
