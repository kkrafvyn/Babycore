/**
 * ML/AI Insights API Routes
 * Endpoints for AI-powered analysis and predictions
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { resolveAiProviderConfig, requestAiChatCompletion } from '../utils/ai-provider.js';
import {
  buildCareCopilotBabyContext,
  buildFallbackCopilotResponse,
  CARE_COPILOT_SYSTEM_PROMPT,
  formatCareContextForAi,
  parseBabyAge,
} from '../utils/care-copilot.js';
import { resolveBabyAccessForIdentity } from '../utils/baby-access.js';

const router = Router();

/**
 * POST /api/ml/analyze-sleep-patterns
 * Analyze sleep patterns and detect anomalies/regressions
 */
export async function analyzeSleepPatterns(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, daysBack = 30 } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId))).allowed) {
      return res.status(403).json({ error: 'Unauthorized baby access' });
    }

    // Fetch sleep logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data: sleepLogs, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('baby_id', babyId)
      .gte('start_time', startDate.toISOString());

    if (error) throw error;

    const safeSleepLogs = sleepLogs || [];

    // ML Analysis
    const analysis = {
      averageSleepPerDay: calculateAverage(safeSleepLogs, 'duration'),
      sleepQuality: calculateAverageQuality(safeSleepLogs),
      regressions: detectRegressions(safeSleepLogs),
      trends: calculateTrends(safeSleepLogs),
      recommendations: generateSleepRecommendations(safeSleepLogs),
      anomalies: detectAnomalies(safeSleepLogs),
    };

    return res.json({
      success: true,
      analysis,
      period: `Last ${daysBack} days`,
      dataPoints: sleepLogs?.length || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/ml/predict-next-sleep
 * Predict when baby will sleep next
 */
export async function predictNextSleep(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId))).allowed) {
      return res.status(403).json({ error: 'Unauthorized baby access' });
    }

    // Fetch recent sleep logs
    const { data: recentSleep } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('baby_id', babyId)
      .order('start_time', { ascending: false })
      .limit(14); // Last 2 weeks

    // Built-in pattern detection keeps the feature working even without an external model provider.
    const intervals = calculateSleepIntervals(recentSleep || []);
    if (!intervals.length || !recentSleep?.[0]) {
      return res.json({
        success: true,
        prediction: {
          timeUntilSleep: 0,
          predictedTime: new Date().toISOString(),
          confidence: 0.4,
        },
      });
    }
    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const lastSleep = recentSleep?.[0];
    const predictedTime = new Date(lastSleep?.start_time);
    predictedTime.setMinutes(predictedTime.getMinutes() + averageInterval);

    return res.json({
      success: true,
      prediction: {
        timeUntilSleep: Math.round(averageInterval),
        predictedTime: predictedTime.toISOString(),
        confidence: calculateConfidence(intervals),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/ml/predict-milestone
 * Predict when baby will reach developmental milestones
 */
export async function predictMilestone(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, milestone } = req.body;

    if (!userId || !babyId || !milestone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId))).allowed) {
      return res.status(403).json({ error: 'Unauthorized baby access' });
    }

    // Fetch baby growth data
    const { data: baby } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    // Milestone prediction based on age, growth trajectory
    const milestoneData = {
      rolling: { earlyAge: 2, averageAge: 3.5, lateAge: 5 },
      sitting: { earlyAge: 4, averageAge: 6, lateAge: 8 },
      crawling: { earlyAge: 5, averageAge: 8, lateAge: 11 },
      walking: { earlyAge: 8, averageAge: 12, lateAge: 18 },
      talking: { earlyAge: 6, averageAge: 12, lateAge: 24 },
    };

    const timeline = milestoneData[milestone as keyof typeof milestoneData];
    if (!timeline) {
      return res.status(400).json({ error: 'Unknown milestone' });
    }

    const babyAgeMonths = calculateAgeMonths(baby?.date_of_birth || baby?.dateOfBirth);
    const predictedAge = Math.round(timeline.averageAge);
    const monthsUntil = Math.max(0, predictedAge - babyAgeMonths);

    return res.json({
      success: true,
      prediction: {
        milestone,
        averagePredictedAge: predictedAge,
        earlyRange: timeline.earlyAge,
        lateRange: timeline.lateAge,
        monthsUntil,
        confidence: 0.75,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/ml/growth-analysis
 * Analyze growth trajectory and percentiles
 */
export async function analyzeGrowthTrajectory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId))).allowed) {
      return res.status(403).json({ error: 'Unauthorized baby access' });
    }

    const { data: measurements } = await supabase
      .from('growth_measurements')
      .select('*')
      .eq('baby_id', babyId)
      .order('date', { ascending: true });

    const safeMeasurements = measurements || [];
    const analysis = {
      currentPercentile: {
        weight: calculatePercentile(safeMeasurements, 'weight'),
        height: calculatePercentile(safeMeasurements, 'height'),
        headCircumference: calculatePercentile(safeMeasurements, 'head_circumference'),
      },
      growthRate: calculateGrowthRate(safeMeasurements),
      trend: detectGrowthTrend(safeMeasurements),
      concerns: flagGrowthConcerns(safeMeasurements),
    };

    return res.json({ success: true, analysis });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/ml/scrapbook-summary
 * Generate a monthly scrapbook summary from real logs
 */
export async function generateScrapbookSummary(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, month, year } = req.body || {};

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const access = await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId));
    if (!access.allowed) {
      return res.status(403).json({ error: 'Unauthorized baby access' });
    }

    const targetYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();
    const targetMonth = Number.isFinite(Number(month)) ? Number(month) : new Date().getMonth() + 1;
    const monthStart = new Date(targetYear, Math.max(0, targetMonth - 1), 1);
    const monthEnd = new Date(targetYear, Math.max(0, targetMonth), 1);

    if (!access.baby) {
      return res.status(404).json({ error: 'Baby not found' });
    }

    const safeQuery = async (table: string, dateField: string, columns = '*') => {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq('baby_id', babyId)
        .gte(dateField, monthStart.toISOString())
        .lt(dateField, monthEnd.toISOString())
        .order(dateField, { ascending: false })
        .limit(30);

      if (error) {
        console.warn(`Scrapbook query skipped for ${table}:`, error.message);
        return [];
      }

      return data || [];
    };

    const [entriesRaw, memoriesRaw, feedsRaw, sleepsRaw, diapersRaw] = await Promise.all([
      safeQuery('journal_entries', 'date', 'date,prompt,text,mood'),
      safeQuery('memories', 'timestamp', 'timestamp,text,is_milestone'),
      safeQuery('feed_logs', 'timestamp', 'timestamp,type'),
      safeQuery('sleep_logs', 'start_time', 'start_time,duration'),
      safeQuery('diaper_logs', 'timestamp', 'timestamp,type'),
    ]);
    const entries = entriesRaw as any[];
    const memories = memoriesRaw as any[];
    const feeds = feedsRaw as any[];
    const sleeps = sleepsRaw as any[];
    const diapers = diapersRaw as any[];

    const babyName = access.baby?.name || 'Baby';
    const monthLabel = monthStart.toLocaleString('default', { month: 'long' });

    const firstEntry = entries[0]?.text || memories[0]?.text || '';
    const recentMilestone = memories.find((m: any) => Boolean(m.is_milestone));

    const highlights = [
      firstEntry ? `Journal highlight: ${String(firstEntry).slice(0, 90)}` : null,
      recentMilestone ? `Milestone captured: ${String(recentMilestone.text || '').slice(0, 90)}` : null,
      feeds.length ? `Recorded ${feeds.length} feeding sessions this month.` : null,
      sleeps.length
        ? `Tracked ${sleeps.length} sleep sessions with ${Math.round(
            sleeps.reduce((sum: number, row: any) => sum + Number(row.duration || 0), 0) / 60,
          )} total sleep hours.`
        : null,
      diapers.length ? `Logged ${diapers.length} diaper events.` : null,
    ].filter(Boolean) as string[];

    const vibe =
      highlights.length >= 4
        ? 'Active, expressive, and full of momentum.'
        : highlights.length >= 2
        ? 'Warm, nurturing, and steady growth.'
        : 'Gentle month with meaningful little moments.';

    const summary =
      highlights.length > 0
        ? `${babyName}'s ${monthLabel} featured ${highlights.length} key moments. ${highlights[0]}`
        : `${babyName}'s ${monthLabel} was calm and consistent. Add more memories and journal notes to enrich this scrapbook.`;

    return res.json({
      success: true,
      scrapbook: {
        title: `${babyName}'s ${monthLabel} Magic`,
        summary,
        highlights: highlights.slice(0, 5),
        vibe,
        stats: {
          journalEntries: entries.length,
          memories: memories.length,
          feedLogs: feeds.length,
          sleepLogs: sleeps.length,
          diaperLogs: diapers.length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/ml/care-copilot
 * Conversational AI copilot for parent/doctor/caregiver guidance
 */
export async function careCopilot(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, prompt, history } = req.body || {};

    if (!userId || !babyId || !String(prompt || '').trim()) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const babyAccess = await resolveBabyAccessForIdentity(userId, req.user?.email, String(babyId));
    if (!babyAccess.allowed || !babyAccess.baby) {
      return res.status(403).json({ success: false, error: 'Unauthorized baby access' });
    }

    const [recentFeeds, recentSleeps, recentDiapers, recentGrowth, recentVaccines] = await Promise.all([
      supabase
        .from('feed_logs')
        .select('timestamp,type,duration,bottle_amount,bottle_type,solid_description')
        .eq('baby_id', babyId)
        .order('timestamp', { ascending: false })
        .limit(12),
      supabase
        .from('sleep_logs')
        .select('start_time,end_time,duration')
        .eq('baby_id', babyId)
        .order('start_time', { ascending: false })
        .limit(12),
      supabase
        .from('diaper_logs')
        .select('timestamp,type')
        .eq('baby_id', babyId)
        .order('timestamp', { ascending: false })
        .limit(12),
      supabase
        .from('growth_measurements')
        .select('date,weight,height,head_circumference')
        .eq('baby_id', babyId)
        .order('date', { ascending: false })
        .limit(6),
      supabase
        .from('vaccination_records')
        .select('name,due_date,status,given_date')
        .eq('baby_id', babyId)
        .order('due_date', { ascending: false })
        .limit(12),
    ]);

    const babyContext = buildCareCopilotBabyContext({
      babyName: babyAccess.baby?.name || 'Baby',
      dateOfBirth: babyAccess.baby?.date_of_birth || babyAccess.baby?.dateOfBirth || undefined,
      feeds: recentFeeds.data || [],
      sleeps: recentSleeps.data || [],
      diapers: recentDiapers.data || [],
      growth: recentGrowth.data || [],
      vaccines: recentVaccines.data || [],
    });

    const contextSummary = formatCareContextForAi(babyContext);

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
          .slice(-8)
          .map((item) => ({
            role: item.role,
            content: String(item.content).slice(0, 1200),
          }))
      : [];

    let answer = buildFallbackCopilotResponse(String(prompt), babyContext, parseBabyAge(babyContext.dateOfBirth));
    let usedModel = 'cradlyn-guidance';
    let usedProvider = 'guidance';

    const aiProvider = resolveAiProviderConfig();
    if (aiProvider) {
      const completion = await requestAiChatCompletion(aiProvider, [
        {
          role: 'system',
          content: CARE_COPILOT_SYSTEM_PROMPT,
        },
        {
          role: 'system',
          content: `Baby profile context:\n${contextSummary}`,
        },
        ...safeHistory.map((item) => ({
          role: item.role as 'user' | 'assistant',
          content: item.content,
        })),
        {
          role: 'user',
          content: String(prompt).slice(0, 1500),
        },
      ]);

      if (completion?.content) {
        answer = completion.content;
        usedModel = completion.model;
        usedProvider = completion.provider;
      }
    }

    return res.json({
      success: true,
      response: answer,
      usedModel,
      usedProvider,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

function calculateAverage(data: any[], field: string): number {
  if (!data?.length) return 0;
  return data.reduce((sum, item) => sum + Number(item[field] || 0), 0) / data.length;
}

function getSleepMinutes(entry: any): number {
  if (typeof entry?.duration === 'number') return entry.duration;
  if (typeof entry?.total_sleep_minutes === 'number') return entry.total_sleep_minutes;
  if (entry?.start_time && entry?.end_time) {
    const start = new Date(entry.start_time).getTime();
    const end = new Date(entry.end_time).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      return (end - start) / (1000 * 60);
    }
  }
  return 0;
}

function getSleepTimestamp(entry: any): string {
  return entry?.start_time || entry?.recorded_date || entry?.created_at || new Date().toISOString();
}

function calculateAverageQuality(data: any[]): number {
  if (!data?.length) return 0;
  const manualQualitySamples = data.filter((item) => typeof item?.quality_score === 'number');
  if (manualQualitySamples.length === 0) {
    // Estimate quality from duration (8h ~= score 8 baseline)
    const avgMinutes = data.reduce((sum, item) => sum + getSleepMinutes(item), 0) / data.length;
    return Math.max(1, Math.min(10, avgMinutes / 60));
  }

  return (
    manualQualitySamples.reduce((sum, item) => sum + Number(item.quality_score || 0), 0) /
    manualQualitySamples.length
  );
}

function detectRegressions(data: any[]): any[] {
  // Detect significant decreases in sleep quality/duration
  if (!data?.length) return [];
  
  const regressions: Array<{
    date: any;
    severity: string;
    explanation: string;
  }> = [];
  for (let i = 1; i < data.length; i++) {
    const diff = getSleepMinutes(data[i]) - getSleepMinutes(data[i - 1]);
    if (diff < -120) { // More than 2 hours less
      regressions.push({
        date: getSleepTimestamp(data[i]),
        severity: 'high',
        explanation: 'Significant decrease in sleep duration',
      });
    }
  }
  return regressions;
}

function calculateTrends(data: any[]): string {
  if (!data?.length) return 'insufficient_data';
  const recent = data.slice(-7);
  const avg = recent.reduce((sum, item) => sum + getSleepMinutes(item), 0) / recent.length;
  return avg > 600 ? 'improving' : avg < 400 ? 'declining' : 'stable';
}

function generateSleepRecommendations(data: any[]): string[] {
  const recommendations: string[] = [];
  const quality = calculateAverageQuality(data);
  
  if (quality < 5) {
    recommendations.push('Consider white noise or blackout curtains');
  }
  
  const regressions = detectRegressions(data);
  if (regressions.length > 2) {
    recommendations.push('Recent sleep regression detected - maintain consistent bedtime');
  }
  
  return recommendations;
}

function detectAnomalies(data: any[]): any[] {
  if (!data?.length) return [];
  
  const avg = data.reduce((sum, item) => sum + getSleepMinutes(item), 0) / data.length;
  const stdDev = calculateStdDev(data.map((item) => getSleepMinutes(item)), null, avg);
  if (stdDev === 0) return [];
  
  return data.filter(d => 
    Math.abs((getSleepMinutes(d) - avg) / stdDev) > 2
  ).map(d => ({
    date: getSleepTimestamp(d),
    value: getSleepMinutes(d),
    deviation: 'high',
  }));
}

function calculateSleepIntervals(data: any[]): number[] {
  if (!data?.length) return [];
  
  const intervals: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const current = new Date(getSleepTimestamp(data[i])).getTime();
    const next = new Date(getSleepTimestamp(data[i - 1])).getTime();
    intervals.push((next - current) / (1000 * 60)); // Minutes
  }
  return intervals;
}

function calculateConfidence(intervals: number[]): number {
  if (intervals.length < 3) return 0.5;
  const stdDev = calculateStdDev(intervals, null, intervals.reduce((a, b) => a + b) / intervals.length);
  const cv = stdDev / (intervals.reduce((a, b) => a + b) / intervals.length);
  return Math.max(0.4, Math.min(0.95, 1 - cv));
}

function calculateStdDev(data: any[], field: string | null, mean: number): number {
  const values = field ? data.map(d => d[field]) : data;
  const squareDiffs = values.map((val: number) => Math.pow(val - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / values.length);
}

function calculateAgeMonths(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;
  return (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
}

function calculatePercentile(data: any[], metric: string): number {
  if (!data?.length) return 50;
  const values = data.map(d => d[metric]).filter(v => v);
  const sorted = values.sort((a, b) => a - b);
  const current = values[values.length - 1];
  return Math.round((sorted.indexOf(current) / sorted.length) * 100);
}

function calculateGrowthRate(data: any[]): string {
  if (!data?.length) return 'unknown';
  const recent = data.slice(-3);
  const avg = calculateAverage(recent, 'weight');
  return avg > 0.5 ? 'rapid' : avg < 0.2 ? 'slow' : 'normal';
}

function detectGrowthTrend(data: any[]): string {
  if (!data?.length) return 'unknown';
  const recent = data.slice(-7);
  const avgRecent = calculateAverage(recent, 'weight');
  const avgPrevious = calculateAverage(data.slice(-14, -7), 'weight');
  return avgRecent > avgPrevious ? 'increasing' : 'stable';
}

function flagGrowthConcerns(data: any[]): string[] {
  const concerns: string[] = [];
  if (!data?.length) return concerns;
  
  const percentiles = {
    weight: calculatePercentile(data, 'weight'),
    height: calculatePercentile(data, 'height'),
  };
  
  if (percentiles.weight < 5 || percentiles.weight > 95) {
    concerns.push('Weight is outside typical range - consult pediatrician');
  }
  
  return concerns;
}

router.post('/analyze-sleep-patterns', analyzeSleepPatterns);
router.post('/predict-next-sleep', predictNextSleep);
router.post('/predict-milestone', predictMilestone);
router.post('/growth-analysis', analyzeGrowthTrajectory);
router.post('/scrapbook-summary', generateScrapbookSummary);
router.post('/care-copilot', careCopilot);

export default router;
