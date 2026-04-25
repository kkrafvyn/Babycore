import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Bell, X } from 'lucide-react';
import {
  getUserHealthAlerts,
  getActiveAlertsForUser,
  dismissAlert,
  HealthAlert,
} from '@/lib/health-alerts-service';
import { useAuthStore } from '@/app/AppContext';

interface HealthAlertsProps {
  countryCode?: string;
  babyId?: string;
  babyName?: string;
}

export function HealthAlerts({ countryCode, babyId, babyName }: HealthAlertsProps) {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const fetchAlerts = async () => {
      const data = await getActiveAlertsForUser(user.id, countryCode || 'US');
      setAlerts(data);
      setLoading(false);
    };

    fetchAlerts();
  }, [user?.id, countryCode]);

  const handleDismiss = async (alertId: string) => {
    if (!user?.id) return;

    const success = await dismissAlert(user.id, alertId);
    if (success) {
      setDismissed((prev) => new Set([...prev, alertId]));
    }
  };

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (loading || activeAlerts.length === 0) {
    return null;
  }

  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');

  return (
    <div className="space-y-3">
      {criticalAlerts.map((alert) => (
        <Card key={alert.id} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <CardTitle className="text-base text-red-700 dark:text-red-200">
                    ⚠️ {alert.disease_name} Alert
                  </CardTitle>
                  <CardDescription className="text-red-600 dark:text-red-300">
                    {alert.severity.toUpperCase()} - {alert.description}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alert.prevention_tips && (
              <div className="bg-white dark:bg-gray-800 p-2 rounded text-sm">
                <strong>Prevention:</strong> {alert.prevention_tips}
              </div>
            )}
            {alert.affected_age_groups.includes('0-6') && (
              <p className="text-xs text-amber-700 dark:text-amber-200">
                ⚠️ This affects newborns and young infants
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {activeAlerts.filter((a) => a.severity !== 'critical').length > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700 dark:text-yellow-200">
              📢 Health Advisories ({activeAlerts.length - criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts
              .filter((a) => a.severity !== 'critical')
              .slice(0, 2)
              .map((alert) => (
                <div key={alert.id} className="text-sm border-b pb-2 last:border-0">
                  <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {alert.disease_name}
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">{alert.description}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
