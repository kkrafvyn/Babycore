import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, X } from 'lucide-react';
import {
  getActiveAlertsForUser,
  dismissAlert,
  syncExternalHealthAlerts,
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

    let isMounted = true;

    const fetchAlerts = async () => {
      setLoading(true);

      // Best-effort refresh of WHO/CDC content before reading latest alerts.
      await syncExternalHealthAlerts();

      const data = await getActiveAlertsForUser(user.id, countryCode || 'US');
      if (!isMounted) return;

      setAlerts(data);
      setLoading(false);
    };

    fetchAlerts();

    return () => {
      isMounted = false;
    };
  }, [user?.id, countryCode]);

  const handleDismiss = async (alertId: string) => {
    if (!user?.id) return;

    const success = await dismissAlert(user.id, alertId);
    if (success) {
      setDismissed((prev) => new Set([...prev, alertId]));
    }
  };

  const activeAlerts = alerts.filter((alert) => !dismissed.has(alert.id));

  if (loading || activeAlerts.length === 0) {
    return null;
  }

  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === 'critical');
  const advisoryAlerts = activeAlerts.filter((alert) => alert.severity !== 'critical');

  return (
    <div className="space-y-3">
      {criticalAlerts.map((alert) => (
        <Card key={alert.id} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <CardTitle className="text-base text-red-700 dark:text-red-200">
                    {alert.disease_name} Alert
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
              <div className="rounded bg-white p-2 text-sm dark:bg-gray-800">
                <strong>Prevention:</strong> {alert.prevention_tips}
              </div>
            )}
            {alert.affected_age_groups.includes('0-6') && (
              <p className="text-xs text-amber-700 dark:text-amber-200">
                This affects newborns and young infants.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {advisoryAlerts.length > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700 dark:text-yellow-200">
              Health Advisories ({advisoryAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {advisoryAlerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="border-b pb-2 text-sm last:border-0">
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
