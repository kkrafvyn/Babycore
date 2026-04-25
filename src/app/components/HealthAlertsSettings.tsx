import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuthStore } from '@/app/AppContext';
import {
  getUserHealthPreferences,
  updateHealthPreferences,
  HealthPreferences,
} from '@/lib/health-alerts-service';
import { Bell, Shield, Globe } from 'lucide-react';

interface HealthAlertsSettingsProps {
  onSave?: () => void;
}

export function HealthAlertsSettings({ onSave }: HealthAlertsSettingsProps) {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<HealthPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!user?.id) return;

    const loadPreferences = async () => {
      const prefs = await getUserHealthPreferences(user.id);
      setPreferences(
        prefs || {
          alerts_enabled: true,
          alert_types: ['epidemic', 'seasonal', 'outbreak'],
          notification_frequency: 'immediate',
          primary_region: '',
        }
      );
      setLoading(false);
    };

    loadPreferences();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !preferences) return;

    setSaving(true);
    await updateHealthPreferences(user.id, preferences);
    setSaving(false);
    onSave?.();
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Health Alert Settings
        </CardTitle>
        <CardDescription>Configure disease and epidemic notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Alerts */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <label htmlFor="enable-alerts" className="font-medium">Enable Health Alerts</label>
          <input
            id="enable-alerts"
            type="checkbox"
            title="Enable or disable health alerts"
            checked={preferences.alerts_enabled}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                alerts_enabled: e.target.checked,
              })
            }
            className="w-4 h-4"
          />
        </div>

        {/* Alert Types */}
        <div className="space-y-2">
          <label className="font-medium">Alert Types</label>
          <div className="space-y-2">
            {['epidemic', 'seasonal', 'outbreak', 'warning'].map((type) => (
              <div key={type} className="flex items-center gap-2">
                <input
                  id={`alert-type-${type}`}
                  type="checkbox"
                  title={`Toggle ${type} alerts`}
                  checked={preferences.alert_types.includes(type)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...preferences.alert_types, type]
                      : preferences.alert_types.filter((t) => t !== type);
                    setPreferences({
                      ...preferences,
                      alert_types: updated,
                    });
                  }}
                  className="w-4 h-4"
                />
                <label className="capitalize text-sm">{type}s</label>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Frequency */}
        <div className="space-y-2">
          <label className="font-medium">Notification Frequency</label>
          <select
            id="notification-frequency"
            title="Set notification frequency"
            value={preferences.notification_frequency}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                notification_frequency: e.target.value as 'immediate' | 'daily',
              })
            }
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="immediate">Immediate Alerts</option>
            <option value="daily">Daily Digest</option>
          </select>
        </div>

        {/* Primary Region */}
        <div className="space-y-2">
          <label className="font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Primary Region (Country Code)
          </label>
          <Input
            value={preferences.primary_region}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                primary_region: e.target.value.toUpperCase(),
              })
            }
            placeholder="e.g., US, NG, GB"
            maxLength={2}
            className="w-full max-w-xs"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
