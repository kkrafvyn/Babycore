import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lightbulb, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import {
  analyzeSleepPatterns,
  detectAnomalies,
  getSleepRecommendations,
  AIInsight,
} from '@/lib/ml-insights-service';

interface AIInsightsProps {
  babyId: string;
  babyName: string;
}

export function AIInsights({ babyId, babyName }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [babyId]);

  const loadInsights = async () => {
    setLoading(true);
    const [patternInsights, detectedAnomalies, sleepRecs] = await Promise.all([
      analyzeSleepPatterns(babyId, 30),
      detectAnomalies(babyId),
      getSleepRecommendations(babyId),
    ]);

    setInsights(patternInsights);
    setAnomalies(detectedAnomalies);
    setRecommendations(sleepRecs);
    setLoading(false);
  };

  const renderInsightCard = (insight: AIInsight) => {
    const confidencePercentage = Math.round((insight.confidence ?? 0) * 100);
    const iconMap = {
      trend: <TrendingUp className="h-5 w-5 text-blue-500" />,
      anomaly: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      prediction: <Zap className="h-5 w-5 text-purple-500" />,
      recommendation: <Lightbulb className="h-5 w-5 text-green-500" />,
    };

    return (
      <Card key={`${insight.type}-${insight.title}`} className="border-l-4 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            {iconMap[insight.type]}
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
              {insight.confidence !== undefined && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    Confidence: {confidencePercentage}%
                  </div>
                  <svg
                    className="mt-1 h-1 w-full overflow-hidden rounded-full"
                    viewBox="0 0 100 1"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect className="text-gray-200" width="100" height="1" fill="currentColor" />
                    <rect
                      className="text-blue-500 transition-all duration-300 ease-in-out"
                      width={confidencePercentage}
                      height="1"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Analyzing patterns...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Smart Pattern Insights
          </CardTitle>
          <CardDescription>
            Built-in analysis of {babyName}&apos;s patterns. Tap the Care Copilot bubble on the right to ask questions.
          </CardDescription>
        </CardHeader>
      </Card>

      {insights.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Sleep Patterns</h3>
          <div className="space-y-2">
            {insights.slice(0, 2).map((insight) => renderInsightCard(insight))}
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Detected Issues
          </h3>
          <div className="space-y-2">
            {anomalies.map((anomaly) => renderInsightCard(anomaly))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-green-500" />
            Recommendations
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec) => renderInsightCard(rec))}
          </div>
        </div>
      )}

      {insights.length === 0 && anomalies.length === 0 && recommendations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 text-center">
              Not enough data yet. Keep logging activities for personalized insights!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
