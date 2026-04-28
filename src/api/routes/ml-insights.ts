/**
 * ML/AI Insights API Routes
 * Endpoints for AI-powered analysis and predictions
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

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

    // Fetch recent sleep logs
    const { data: recentSleep } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('baby_id', babyId)
      .order('start_time', { ascending: false })
      .limit(14); // Last 2 weeks

    // Simple pattern detection (replace with ML model in production)
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
    const { babyId } = req.body;

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

    const targetYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();
    const targetMonth = Number.isFinite(Number(month)) ? Number(month) : new Date().getMonth() + 1;
    const monthStart = new Date(targetYear, Math.max(0, targetMonth - 1), 1);
    const monthEnd = new Date(targetYear, Math.max(0, targetMonth), 1);

    const ownerCheck = await supabase
      .from('babies')
      .select('id,name')
      .eq('id', babyId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownerCheck.data) {
      const sharedCheck = await supabase
        .from('family_sharing_invites')
        .select('id')
        .eq('baby_id', babyId)
        .eq('accepted_by', userId)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (!sharedCheck.data) {
        return res.status(403).json({ error: 'Unauthorized baby access' });
      }
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

    const babyName = ownerCheck.data?.name || 'Baby';
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

    const babyAccess = await resolveBabyAccess(userId, babyId, req.user?.email);
    if (!babyAccess) {
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

    const contextSummary = buildCareContextSummary({
      babyName: babyAccess.name || 'Baby',
      dateOfBirth: babyAccess.date_of_birth || babyAccess.dateOfBirth || undefined,
      feeds: recentFeeds.data || [],
      sleeps: recentSleeps.data || [],
      diapers: recentDiapers.data || [],
      growth: recentGrowth.data || [],
      vaccines: recentVaccines.data || [],
    });

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
          .slice(-8)
          .map((item) => ({
            role: item.role,
            content: String(item.content).slice(0, 1200),
          }))
      : [];

    let answer = buildFallbackCopilotResponse(String(prompt), contextSummary);
    let usedModel = 'fallback-rules';

    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (openaiKey) {
      const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          messages: [
            {
              role: 'system',
              content:
                'You are BabyCore Care Copilot. Give short, practical, non-alarmist advice for infant care. Never diagnose. Always recommend contacting a pediatrician for urgent/severe concerns.',
            },
            {
              role: 'system',
              content: `Baby profile context:\n${contextSummary}`,
            },
            ...safeHistory,
            {
              role: 'user',
              content: String(prompt).slice(0, 1500),
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (content) {
          answer = String(content).trim();
          usedModel = model;
        }
      } else {
        console.warn('Care copilot model request failed:', response.status);
      }
    }

    return res.json({
      success: true,
      response: answer,
      usedModel,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Helper functions
async function resolveBabyAccess(
  userId: string,
  babyId: string,
  userEmail?: string,
): Promise<any | null> {
  const owner = await supabase
    .from('babies')
    .select('id,name,date_of_birth')
    .eq('id', babyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (owner.data) {
    return owner.data;
  }

  const normalizedEmail = String(userEmail || '').toLowerCase();
  const [inviteByUser, inviteByEmail, doctorAssignment] = await Promise.all([
    supabase
      .from('family_sharing_invites')
      .select('id,baby_name_snapshot')
      .eq('baby_id', babyId)
      .eq('accepted_by', userId)
      .not('accepted_at', 'is', null)
      .maybeSingle(),
    normalizedEmail
      ? supabase
          .from('family_sharing_invites')
          .select('id,baby_name_snapshot')
          .eq('baby_id', babyId)
          .ilike('invited_email', normalizedEmail)
          .not('accepted_at', 'is', null)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabase
      .from('doctor_baby_assignments')
      .select('id,status')
      .eq('baby_id', babyId)
      .eq('doctor_id', userId)
      .in('status', ['active', 'pending'])
      .maybeSingle(),
  ]);

  if (inviteByUser.data || inviteByEmail.data || doctorAssignment.data) {
    const baby = await supabase
      .from('babies')
      .select('id,name,date_of_birth')
      .eq('id', babyId)
      .maybeSingle();
    return (
      baby.data || {
        id: babyId,
        name: inviteByUser.data?.baby_name_snapshot || inviteByEmail.data?.baby_name_snapshot || 'Baby',
      }
    );
  }

  return null;
}

function summarizeLastTimestamp(rows: any[], field: string): string {
  if (!rows.length) return 'none';
  const latest = new Date(rows[0][field] || rows[0].created_at || rows[0].date || Date.now());
  if (Number.isNaN(latest.getTime())) return 'unknown';
  return latest.toISOString();
}

function buildCareContextSummary(context: {
  babyName: string;
  dateOfBirth?: string;
  feeds: any[];
  sleeps: any[];
  diapers: any[];
  growth: any[];
  vaccines: any[];
}): string {
  const overdueVaccines = context.vaccines.filter((item) => item.status === 'overdue').length;
  const pendingVaccines = context.vaccines.filter((item) => item.status === 'scheduled').length;
  const latestGrowth = context.growth[0];

  return [
    `Baby: ${context.babyName}`,
    `DOB: ${context.dateOfBirth || 'unknown'}`,
    `Feeds logged: ${context.feeds.length} (latest: ${summarizeLastTimestamp(context.feeds, 'timestamp')})`,
    `Sleep logs: ${context.sleeps.length} (latest: ${summarizeLastTimestamp(context.sleeps, 'start_time')})`,
    `Diaper logs: ${context.diapers.length} (latest: ${summarizeLastTimestamp(context.diapers, 'timestamp')})`,
    `Growth entries: ${context.growth.length}${
      latestGrowth
        ? ` (latest weight: ${latestGrowth.weight ?? 'n/a'}, height: ${latestGrowth.height ?? 'n/a'})`
        : ''
    }`,
    `Vaccines pending: ${pendingVaccines}, overdue: ${overdueVaccines}`,
  ].join('\n');
}

function buildFallbackCopilotResponse(prompt: string, contextSummary: string): string {
  const lowerPrompt = prompt.toLowerCase();
  const bullets: string[] = [];

  if (/(fe(ed|eding)|hungry|bottle|breast)/.test(lowerPrompt)) {
    bullets.push('Track intervals for 24-48 hours and watch hunger cues before adjusting volume/frequency.');
    bullets.push('Keep feeds upright and burp midway and after feeds to reduce discomfort.');
  }

  if (/(sleep|nap|wake|night)/.test(lowerPrompt)) {
    bullets.push('Use a consistent pre-sleep routine and stable wake windows for the next 3 days.');
    bullets.push('Aim for a calm wind-down environment: dim lights, lower noise, and predictable sequence.');
  }

  if (/(vaccine|immuni)/.test(lowerPrompt)) {
    bullets.push('Prioritize overdue doses first, then schedule the next due vaccines by clinician guidance.');
    bullets.push('Bring the vaccine record to every visit so the pediatrician can confirm catch-up spacing.');
  }

  if (/(fever|rash|pain|vomit|blood|breath|seizure|emergency)/.test(lowerPrompt)) {
    bullets.push('This may need urgent medical review. Please contact your pediatrician or emergency services now.');
  }

  if (bullets.length === 0) {
    bullets.push('Log the next 2-3 days of feeds, sleep, diapers, and symptoms to identify reliable patterns.');
    bullets.push('If behavior changes are persistent or severe, check with your pediatrician for personalized advice.');
  }

  return [
    'Here is a practical care plan:',
    ...bullets.map((item) => `- ${item}`),
    '',
    'Context used:',
    contextSummary,
    '',
    'Medical note: This guidance is informational and does not replace professional care.',
  ].join('\n');
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
