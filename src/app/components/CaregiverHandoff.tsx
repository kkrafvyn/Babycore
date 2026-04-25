import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Clock, LogOut, Plus, Shield } from 'lucide-react';
import {
  startCaregiverSession,
  endCaregiverSession,
  getSharingActivityLog,
  type CaregiverSession,
  type SharingActivityLog,
} from '@/lib/family-sharing-service';
import { useAuthStore } from '@/app/AppContext';

interface CaregiverHandoffProps {
  babyId: string;
  babyName: string;
}

export function CaregiverHandoff({ babyId, babyName }: CaregiverHandoffProps) {
  const { user } = useAuthStore();
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [activeSession, setActiveSession] = useState<CaregiverSession | null>(null);
  const [activityLog, setActivityLog] = useState<SharingActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    loadSessionData();
  }, [babyId]);

  const loadSessionData = async () => {
    setLoading(true);
    const logs = await getSharingActivityLog(babyId, 10);
    setActivityLog(logs);
    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!user?.id) {
      alert('Please sign in to create a handoff session');
      return;
    }

    if (!newPin.match(/^\d{4}$/)) {
      alert('PIN must be 4 digits');
      return;
    }

    setCreatingSession(true);
    const session = await startCaregiverSession(
      babyId,
      user.id,
      'full',
      parseInt(durationMinutes, 10),
      newPin,
    );

    if (session) {
      setActiveSession(session);
      setNewPin('');
      await loadSessionData();
    }
    setCreatingSession(false);
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('End this handoff session?')) return;

    setLoading(true);
    const success = await endCaregiverSession(sessionId);
    if (success) {
      setActiveSession(null);
      await loadSessionData();
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading handoff data...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Create/End Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Caregiver Handoff
          </CardTitle>
          <CardDescription>Temporary access with PIN</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSession ? (
            <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Active Session
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-mono bg-white dark:bg-gray-900 p-2 rounded text-center text-lg font-bold tracking-widest">
                  {activeSession.pin_code}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Active until:{' '}
                  <span className="font-semibold">
                    {new Date(activeSession.expires_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.max(0, Math.round((new Date(activeSession.expires_at).getTime() - Date.now()) / 60000))} min
                  remaining
                </div>
              </div>
              <Button
                onClick={() => handleEndSession(activeSession.id)}
                size="sm"
                variant="destructive"
                className="w-full"
              >
                <LogOut className="mr-1 h-3 w-3" />
                End Session
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Create PIN (4 digits)</label>
                <Input
                  type="text"
                  placeholder="0000"
                  value={newPin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.slice(0, 4))}
                  maxLength={4}
                  className="font-mono text-lg text-center tracking-widest mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Duration (minutes)</label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationMinutes(e.target.value)}
                  min="15"
                  max="480"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleCreateSession}
                disabled={creatingSession}
                className="w-full"
              >
                <Plus className="mr-1 h-3 w-3" />
                {creatingSession ? 'Creating...' : 'Start Handoff'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityLog.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No activity yet</p>
            ) : (
              activityLog.map((log) => (
                <div key={log.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="font-semibold capitalize">{log.action}</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(log.created_at).toLocaleDateString()}{' '}
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
