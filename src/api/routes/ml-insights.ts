/**
 * ML/AI Insights API Routes
 * Endpoints for AI-powered analysis and predictions
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

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
      .from('sleep_analytics')
      .select('*')
      .eq('baby_id', babyId)
      .gte('recorded_date', startDate.toISOString());

    if (error) throw error;

    const safeSleepLogs = sleepLogs || [];

    // ML Analysis
    const analysis = {
      averageSleepPerDay: calculateAverage(safeSleepLogs, 'total_sleep_minutes'),
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
      .from('sleep_analytics')
      .select('*')
      .eq('baby_id', babyId)
      .order('recorded_date', { ascending: false })
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
    const predictedTime = new Date(lastSleep?.recorded_date);
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

    const babyAgeMonths = calculateAgeMonths(baby?.dateOfBirth);
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
      .order('recorded_date', { ascending: true });

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

// Helper functions
function calculateAverage(data: any[], field: string): number {
  if (!data?.length) return 0;
  return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
}

function calculateAverageQuality(data: any[]): number {
  if (!data?.length) return 0;
  return data.reduce((sum, item) => sum + (item.quality_score || 0), 0) / data.length;
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
    const diff = data[i].total_sleep_minutes - data[i - 1].total_sleep_minutes;
    if (diff < -120) { // More than 2 hours less
      regressions.push({
        date: data[i].recorded_date,
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
  const avg = calculateAverage(recent, 'total_sleep_minutes');
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
  
  const avg = calculateAverage(data, 'total_sleep_minutes');
  const stdDev = calculateStdDev(data, 'total_sleep_minutes', avg);
  
  return data.filter(d => 
    Math.abs((d.total_sleep_minutes - avg) / stdDev) > 2
  ).map(d => ({
    date: d.recorded_date,
    value: d.total_sleep_minutes,
    deviation: 'high',
  }));
}

function calculateSleepIntervals(data: any[]): number[] {
  if (!data?.length) return [];
  
  const intervals: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const current = new Date(data[i].recorded_date).getTime();
    const next = new Date(data[i - 1].recorded_date).getTime();
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

function calculateAgeMonths(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
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

export default router;
