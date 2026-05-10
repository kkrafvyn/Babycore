import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CheckCircle2, ClipboardList, Clock, LogOut, Plus, Shield, Trash2 } from 'lucide-react';
import {
  startCaregiverSession,
  endCaregiverSession,
  getSharingActivityLog,
  type CaregiverSession,
  type SharingActivityLog,
} from '@/lib/family-sharing-service';
import { useAuthStore } from '@/app/AppContext';
import {
  createSharedCareTask,
  deleteSharedCareTask,
  getSharedCareTasks,
  updateSharedCareTask,
  type CareTaskCategory,
  type CareTaskPriority,
  type CareTaskRole,
  type SharedCareTask,
} from '@/lib/shared-care-tasks';

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
  const [tasks, setTasks] = useState<SharedCareTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'completed'>('open');
  const [taskForm, setTaskForm] = useState({
    title: '',
    details: '',
    category: 'handoff' as CareTaskCategory,
    assignedRole: 'caregiver' as CareTaskRole,
    priority: 'soon' as CareTaskPriority,
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const currentRole =
    ((user?.user_metadata?.onboarding_profile_type as CareTaskRole | undefined) || 'parent');
  const taskTemplates = [
    {
      label: 'Medication follow-up',
      title: 'Confirm next medication dose and side-effect check',
      category: 'medication' as CareTaskCategory,
      assignedRole: 'caregiver' as CareTaskRole,
      priority: 'soon' as CareTaskPriority,
    },
    {
      label: 'Doctor update',
      title: 'Share follow-up note with doctor after today\'s care block',
      category: 'appointment' as CareTaskCategory,
      assignedRole: 'doctor' as CareTaskRole,
      priority: 'soon' as CareTaskPriority,
    },
    {
      label: 'Handoff summary',
      title: 'Leave handoff summary before the session ends',
      category: 'handoff' as CareTaskCategory,
      assignedRole: 'parent' as CareTaskRole,
      priority: 'routine' as CareTaskPriority,
    },
  ];

  useEffect(() => {
    loadSessionData();
  }, [babyId]);

  const loadSessionData = async () => {
    setLoading(true);
    const logs = await getSharingActivityLog(babyId, 10);
    setActivityLog(logs);
    setTasks(getSharedCareTasks(babyId));
    setLoading(false);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      details: '',
      category: 'handoff',
      assignedRole: 'caregiver',
      priority: 'soon',
      dueDate: '',
    });
  };

  const handleApplyTaskTemplate = (template: (typeof taskTemplates)[number]) => {
    setTaskForm((prev) => ({
      ...prev,
      title: prev.title || template.title,
      category: template.category,
      assignedRole: template.assignedRole,
      priority: template.priority,
    }));
  };

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) {
      alert('Task title is required.');
      return;
    }

    createSharedCareTask({
      babyId,
      title: taskForm.title.trim(),
      details: taskForm.details.trim() || undefined,
      category: taskForm.category,
      assignedRole: taskForm.assignedRole,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || null,
      createdByRole: currentRole,
    });
    setTasks(getSharedCareTasks(babyId));
    resetTaskForm();
  };

  const handleToggleTask = (task: SharedCareTask) => {
    updateSharedCareTask(task.id, {
      status: task.status === 'open' ? 'completed' : 'open',
    });
    setTasks(getSharedCareTasks(babyId));
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Delete this care task?')) return;
    deleteSharedCareTask(taskId);
    setTasks(getSharedCareTasks(babyId));
  };

  const visibleTasks = tasks.filter((task) => (taskFilter === 'all' ? true : task.status === taskFilter));

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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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

      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            Shared Care Tasks
          </CardTitle>
          <CardDescription>Coordinate the next steps for {babyName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Quick template
            </p>
            <div className="flex flex-wrap gap-2">
              {taskTemplates.map((template) => (
                <Button
                  key={template.label}
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyTaskTemplate(template)}
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Input
              value={taskForm.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTaskForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Task title"
            />
            <textarea
              value={taskForm.details}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTaskForm((prev) => ({ ...prev, details: e.target.value }))
              }
              rows={3}
              placeholder="Notes, instructions, or context"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={taskForm.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setTaskForm((prev) => ({ ...prev, category: e.target.value as CareTaskCategory }))
                }
                className="rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="handoff">Handoff</option>
                <option value="medication">Medication</option>
                <option value="appointment">Appointment</option>
                <option value="monitoring">Monitoring</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={taskForm.assignedRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setTaskForm((prev) => ({ ...prev, assignedRole: e.target.value as CareTaskRole }))
                }
                className="rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="parent">Parent</option>
                <option value="caregiver">Caregiver</option>
                <option value="doctor">Doctor</option>
              </select>
              <select
                value={taskForm.priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setTaskForm((prev) => ({ ...prev, priority: e.target.value as CareTaskPriority }))
                }
                className="rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="routine">Routine</option>
                <option value="soon">Soon</option>
                <option value="urgent">Urgent</option>
              </select>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTask} className="flex-1">
                <Plus className="mr-1 h-3 w-3" />
                Add Task
              </Button>
              <Button variant="outline" onClick={resetTaskForm}>
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(['open', 'completed', 'all'] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={taskFilter === filter ? 'default' : 'outline'}
                  onClick={() => setTaskFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>

            {visibleTasks.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No shared care tasks yet.</p>
            ) : (
              visibleTasks.map((task) => (
                <div key={task.id} className="rounded-xl border p-3 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{task.title}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {task.assignedRole} | {task.priority} | {task.category}
                      </p>
                      {task.dueDate && (
                        <p className="text-gray-500 dark:text-gray-400">Due {task.dueDate}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleTask(task)}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {task.details && (
                    <p className="text-gray-600 dark:text-gray-300">{task.details}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
