import { supabase } from './supabase';

export interface SleepAnalytics {
  id: string;
  baby_id: string;
  date: string;
  total_sleep_minutes: number;
  sleep_quality_score: number; // 0-10
  night_sleep_continuous: boolean;
  nap_count: number;
  sleep_regression_detected: boolean;
  sleep_debt_minutes: number;
  longest_stretch_minutes: number;
  notes?: string;
}

export interface FeedingAnalytics {
  id: string;
  baby_id: string;
  date: string;
  total_feeds: number;
  total_duration_minutes: number;
  breast_milk_sessions: number;
  bottle_sessions: number;
  solids_sessions: number;
  average_feed_duration: number;
  supply_sufficiency: number; // 0-10
  solids_introduced: boolean;
  solids_types?: string[];
}

/**
 * Calculate and store sleep analytics for a day
 */
export async function calculateSleepAnalytics(
  babyId: string,
  date: string
): Promise<SleepAnalytics | null> {
  try {
    // Fetch all sleep logs for the day
    const { data: sleepLogs } = await supabase
      .from('sleep')
      .select('*')
      .eq('baby_id', babyId)
      .like('start_time', `${date}%`)
      .order('start_time', { ascending: true });

    if (!sleepLogs || sleepLogs.length === 0) return null;

    // Calculate metrics
    const totalMinutes = sleepLogs.reduce((sum, log) => {
      const start = new Date(log.start_time).getTime();
      const end = log.end_time ? new Date(log.end_time).getTime() : start;
      return sum + (end - start) / (1000 * 60);
    }, 0);

    const napCount = sleepLogs.filter((log) => log.sleep_type === 'nap').length;
    const longestStretch = Math.max(
      ...sleepLogs.map((log) => {
        const start = new Date(log.start_time).getTime();
        const end = log.end_time ? new Date(log.end_time).getTime() : start;
        return (end - start) / (1000 * 60);
      })
    );

    // Calculate quality score (0-10)
    // Based on: continuous sleep, number of naps, duration vs age-appropriate
    const ageInDays = await calculateBabyAge(babyId);
    const ageInMonths = Math.floor(ageInDays / 30);
    const recommendedHours = getAgeAppropriateSleedHours(ageInMonths);
    const actualHours = totalMinutes / 60;
    const durationScore = Math.min(10, (actualHours / recommendedHours) * 10);

    const continuousNightSleep = sleepLogs.some((log) => {
      const hour = new Date(log.start_time).getHours();
      return hour >= 20 || hour <= 6;
    });

    const napPenalty = napCount > 3 ? 2 : 0; // Too many naps
    const sleepQualityScore = Math.max(0, durationScore - napPenalty);

    // Sleep regression detection
    const previousWeek = await supabase
      .from('sleep_analytics')
      .select('sleep_quality_score, total_sleep_minutes')
      .eq('baby_id', babyId)
      .gte('date', getDateDaysAgo(date, 7))
      .lt('date', date)
      .order('date', { ascending: false })
      .limit(7);

    let sleepRegressionDetected = false;
    if (previousWeek.data && previousWeek.data.length >= 3) {
      const avgPreviousQuality =
        previousWeek.data.reduce((sum, d) => sum + d.sleep_quality_score, 0) /
        previousWeek.data.length;
      if (sleepQualityScore < avgPreviousQuality - 2) {
        sleepRegressionDetected = true;
      }
    }

    // Sleep debt
    const recommendedMinutes = recommendedHours * 60;
    const sleepDebt = Math.max(0, recommendedMinutes - totalMinutes);

    // Save analytics
    const { data, error } = await supabase
      .from('sleep_analytics')
      .upsert(
        {
          baby_id: babyId,
          date,
          total_sleep_minutes: Math.round(totalMinutes),
          sleep_quality_score: parseFloat(sleepQualityScore.toFixed(1)),
          night_sleep_continuous: continuousNightSleep,
          nap_count: napCount,
          sleep_regression_detected: sleepRegressionDetected,
          sleep_debt_minutes: Math.round(sleepDebt),
          longest_stretch_minutes: Math.round(longestStretch),
        },
        { onConflict: 'baby_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error calculating sleep analytics:', err);
    return null;
  }
}

/**
 * Calculate feeding analytics for a day
 */
export async function calculateFeedingAnalytics(
  babyId: string,
  date: string
): Promise<FeedingAnalytics | null> {
  try {
    // Fetch all feeding logs for the day
    const { data: feedingLogs } = await supabase
      .from('feeding')
      .select('*')
      .eq('baby_id', babyId)
      .like('start_time', `${date}%`)
      .order('start_time', { ascending: true });

    if (!feedingLogs || feedingLogs.length === 0) return null;

    // Calculate metrics
    const totalFeeds = feedingLogs.length;
    const breastFeeds = feedingLogs.filter((f) => f.type === 'breast').length;
    const bottleFeeds = feedingLogs.filter((f) => f.type === 'bottle').length;
    const solidFeeds = feedingLogs.filter((f) => f.type === 'solids').length;

    const totalDuration = feedingLogs.reduce((sum, feed) => {
      return sum + (feed.duration || 0);
    }, 0);

    const averageDuration = totalDuration / totalFeeds;

    // Check if solids introduced
    const solidsIntroduced = solidFeeds > 0;
    const solidsTypes = Array.from(
      new Set(
        feedingLogs
          .filter((f) => f.food_type)
          .map((f) => f.food_type)
      )
    );

    // Parent-reported supply sufficiency (from notes or default)
    const supplyNotes = feedingLogs
      .filter((f) => f.notes)
      .map((f) => f.notes)
      .join(' ');

    let supplySufficiency = 7; // Default to good
    if (supplyNotes.toLowerCase().includes('not enough')) {
      supplySufficiency = 5;
    } else if (supplyNotes.toLowerCase().includes('struggling')) {
      supplySufficiency = 4;
    } else if (supplyNotes.toLowerCase().includes('plenty')) {
      supplySufficiency = 9;
    }

    // Save analytics
    const { data, error } = await supabase
      .from('feeding_analytics')
      .upsert(
        {
          baby_id: babyId,
          date,
          total_feeds: totalFeeds,
          total_duration_minutes: Math.round(totalDuration),
          breast_milk_sessions: breastFeeds,
          bottle_sessions: bottleFeeds,
          solids_sessions: solidFeeds,
          average_feed_duration: Math.round(averageDuration),
          supply_sufficiency: supplySufficiency,
          solids_introduced: solidsIntroduced,
          solids_types: solidsTypes,
        },
        { onConflict: 'baby_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error calculating feeding analytics:', err);
    return null;
  }
}

/**
 * Get sleep analytics for date range
 */
export async function getSleepAnalyticsForRange(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<SleepAnalytics[]> {
  try {
    const { data, error } = await supabase
      .from('sleep_analytics')
      .select('*')
      .eq('baby_id', babyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching sleep analytics:', err);
    return [];
  }
}

/**
 * Get feeding analytics for date range
 */
export async function getFeedingAnalyticsForRange(
  babyId: string,
  startDate: string,
  endDate: string
): Promise<FeedingAnalytics[]> {
  try {
    const { data, error } = await supabase
      .from('feeding_analytics')
      .select('*')
      .eq('baby_id', babyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching feeding analytics:', err);
    return [];
  }
}

/**
 * Detect sleep regressions
 */
export async function detectSleepRegressions(
  babyId: string,
  days: number = 30
): Promise<SleepAnalytics[]> {
  try {
    const startDate = getDateDaysAgo(new Date().toISOString().split('T')[0], days);
    const analytics = await getSleepAnalyticsForRange(babyId, startDate, new Date().toISOString().split('T')[0]);

    return analytics.filter((a) => a.sleep_regression_detected);
  } catch (err) {
    console.error('Error detecting regressions:', err);
    return [];
  }
}

/**
 * Get feeding trends
 */
export async function getFeedingTrends(babyId: string, days: number = 30): Promise<any> {
  try {
    const startDate = getDateDaysAgo(new Date().toISOString().split('T')[0], days);
    const analytics = await getFeedingAnalyticsForRange(babyId, startDate, new Date().toISOString().split('T')[0]);

    if (analytics.length === 0) return null;

    const avgFeeds = analytics.reduce((sum, a) => sum + a.total_feeds, 0) / analytics.length;
    const avgDuration = analytics.reduce((sum, a) => sum + a.average_feed_duration, 0) / analytics.length;
    const breastPercentage = (
      (analytics.reduce((sum, a) => sum + a.breast_milk_sessions, 0) /
        analytics.reduce((sum, a) => sum + a.total_feeds, 0)) *
      100
    ).toFixed(1);

    return {
      average_feeds_per_day: avgFeeds.toFixed(1),
      average_feed_duration_minutes: avgDuration.toFixed(1),
      breast_percentage: breastPercentage,
      solids_started: analytics.some((a) => a.solids_introduced),
    };
  } catch (err) {
    console.error('Error calculating trends:', err);
    return null;
  }
}

/**
 * Helper: Get baby's age in days
 */
async function calculateBabyAge(babyId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('babies')
      .select('date_of_birth')
      .eq('id', babyId)
      .single();

    if (!data?.date_of_birth) return 0;

    const birthDate = new Date(data.date_of_birth).getTime();
    const today = new Date().getTime();
    return Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
  } catch (err) {
    return 0;
  }
}

/**
 * Helper: Get age-appropriate sleep hours
 */
function getAgeAppropriateSleedHours(ageInMonths: number): number {
  if (ageInMonths < 1) return 16;
  if (ageInMonths < 3) return 15.5;
  if (ageInMonths < 6) return 15;
  if (ageInMonths < 12) return 14;
  if (ageInMonths < 24) return 13;
  return 12; // 2+ years
}

/**
 * Helper: Get date N days ago
 */
function getDateDaysAgo(fromDate: string, days: number): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
