import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Heart, AlertCircle, FileText } from 'lucide-react';
import { getSleepAnalyticsForRange, getFeedingAnalyticsForRange } from '@/lib/advanced-analytics-service';

interface AnalyticsDashboardProps {
  babyId: string;
  babyName: string;
}

export function AnalyticsDashboard({ babyId, babyName }: AnalyticsDashboardProps) {
  const [sleepData, setSleepData] = useState<any[]>([]);
  const [feedingData, setFeedingData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [babyId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    const days = parseInt(period);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const [sleep, feeding] = await Promise.all([
      getSleepAnalyticsForRange(babyId, startDate, endDate),
      getFeedingAnalyticsForRange(babyId, startDate, endDate),
    ]);

    setSleepData(sleep);
    setFeedingData(feeding);
    setLoading(false);
  };

  const getSleepStats = () => {
    if (sleepData.length === 0) return null;

    const totalMinutes = sleepData.reduce((sum, d) => sum + (d.total_sleep_minutes || 0), 0);
    const avgMinutes = totalMinutes / sleepData.length;
    const regressions = sleepData.filter((d) => d.sleep_regression_detected).length;
    const avgQuality = (
      sleepData.reduce((sum, d) => sum + (d.sleep_quality_score || 0), 0) / sleepData.length
    ).toFixed(1);

    return {
      avgHours: (avgMinutes / 60).toFixed(1),
      avgQuality,
      regressions,
      longestStretch: Math.max(...sleepData.map((d) => d.longest_stretch_minutes || 0)),
    };
  };

  const getFeedingStats = () => {
    if (feedingData.length === 0) return null;

    const totalFeeds = feedingData.reduce((sum, d) => sum + (d.total_feeds || 0), 0);
    const avgFeeds = (totalFeeds / feedingData.length).toFixed(1);
    const avgDuration = (
      feedingData.reduce((sum, d) => sum + (d.average_feed_duration || 0), 0) / feedingData.length
    ).toFixed(1);
    const solidsStarted = feedingData.some((d) => d.solids_introduced);

    return {
      avgFeeds,
      avgDuration,
      solidsStarted,
      totalDays: feedingData.length,
    };
  };

  const sleepStats = getSleepStats();
  const feedingStats = getFeedingStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>Sleep, feeding, and development insights for {babyName}</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['7', '30', '90'] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
              >
                {p}d
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading analytics...</div>
        ) : (
          <Tabs defaultValue="sleep" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sleep">Sleep</TabsTrigger>
              <TabsTrigger value="feeding">Feeding</TabsTrigger>
            </TabsList>

            <TabsContent value="sleep" className="space-y-4">
              {sleepStats ? (
                <div className="grid grid-cols-2 gap-2">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-0">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-200">
                        {sleepStats.avgHours}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Avg Hours/Day</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-0">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-200">
                        {sleepStats.avgQuality}/10
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Quality Score</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 dark:bg-green-900/20 border-0">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-200">
                        {sleepStats.longestStretch}m
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">Longest Stretch</div>
                    </CardContent>
                  </Card>

                  {sleepStats.regressions > 0 && (
                    <Card className="bg-red-50 dark:bg-red-900/20 border-0">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-200" />
                          <div>
                            <div className="text-sm font-bold text-red-600 dark:text-red-200">
                              {sleepStats.regressions}
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-300">Regression Days</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sleep data available</p>
              )}
            </TabsContent>

            <TabsContent value="feeding" className="space-y-4">
              {feedingStats ? (
                <div className="grid grid-cols-2 gap-2">
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-0">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-200">
                        {feedingStats.avgFeeds}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">Avg Feeds/Day</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-pink-50 dark:bg-pink-900/20 border-0">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-pink-600 dark:text-pink-200">
                        {feedingStats.avgDuration}m
                      </div>
                      <div className="text-xs text-pink-700 dark:text-pink-300">Avg Duration</div>
                    </CardContent>
                  </Card>

                  {feedingStats.solidsStarted && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-0 col-span-2">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600 dark:text-green-200" />
                          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                            Solids have been introduced
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No feeding data available</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
