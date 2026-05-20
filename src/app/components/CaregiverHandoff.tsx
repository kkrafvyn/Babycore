import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CheckCircle2, ChevronLeft, ClipboardList, Clock, LogOut, Plus, Save, Shield, Trash2 } from 'lucide-react';
import {
  startCaregiverSession,
  endCaregiverSession,
  getSharingActivityLog,
  getCaregiverShiftNote,
  saveCaregiverShiftNote,
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
  onBack?: () => void;
}

type CaregiverSection = 'overview' | 'session' | 'notes' | 'tasks' | 'activity';

const caregiverSections: Array<{ id: CaregiverSection; label: string; helper: string }> = [
  { id: 'overview', label: 'Daily Home', helper: 'Shift snapshot' },
  { id: 'session', label: 'Access', helper: 'PIN handoff' },
  { id: 'notes', label: 'Notes', helper: 'Parent review' },
  { id: 'tasks', label: 'Tasks', helper: 'Care queue' },
  { id: 'activity', label: 'Timeline', helper: 'Completed care' },
];

export function CaregiverHandoff({ babyId, babyName, onBack }: CaregiverHandoffProps) {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<CaregiverSection>('overview');
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
  const [shiftNote, setShiftNote] = useState('');
  const [savedShiftNote, setSavedShiftNote] = useState('');
  const [savedShiftNoteAt, setSavedShiftNoteAt] = useState<string | null>(null);
  const [shiftNoteSaving, setShiftNoteSaving] = useState(false);
  const [shiftNoteError, setShiftNoteError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    const loadShiftNote = async () => {
      setShiftNoteError(null);
      const note = await getCaregiverShiftNote(babyId);
      if (cancelled) return;

      setShiftNote(note?.note || '');
      setSavedShiftNote(note?.note || '');
      setSavedShiftNoteAt(note?.updated_at || null);
    };

    void loadShiftNote();

    return () => {
      cancelled = true;
    };
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

  const handleSaveShiftNote = async () => {
    setShiftNoteSaving(true);
    setShiftNoteError(null);

    const saved = await saveCaregiverShiftNote(babyId, shiftNote.trim());
    if (saved) {
      setSavedShiftNote(saved.note);
      setSavedShiftNoteAt(saved.updated_at || saved.created_at);
      await loadSessionData();
    } else {
      setShiftNoteError('Could not save the shift note to the backend. Make sure the latest SQL migration has been applied.');
    }

    setShiftNoteSaving(false);
  };

  const visibleTasks = tasks.filter((task) => (taskFilter === 'all' ? true : task.status === taskFilter));
  const openTasks = tasks.filter((task) => task.status === 'open');
  const urgentTasks = openTasks.filter((task) => task.priority === 'urgent');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const parentReviewItems = [
    activeSession ? 'Temporary access session is live.' : 'No active handoff session.',
    openTasks.length
      ? `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} still need review.`
      : 'All visible care tasks are closed.',
    savedShiftNote ? 'Shift note is ready for parent review.' : 'No shift note has been saved yet.',
  ];
  const handoffStats = [
    { label: 'Open tasks', value: openTasks.length, helper: 'Needs care-team follow-up' },
    { label: 'Urgent', value: urgentTasks.length, helper: urgentTasks.length ? 'Prioritize these first' : 'Nothing urgent' },
    {
      label: 'Session',
      value: activeSession ? 'Live' : 'Off',
      helper: activeSession ? 'Temporary PIN is active' : 'Start when a caregiver arrives',
    },
    { label: 'Completed', value: completedTasks.length, helper: 'Closed handoff items' },
  ];

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
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-200/70 blur-3xl dark:bg-emerald-500/10" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr,1fr] lg:items-end">
          <div>
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-4 w-fit rounded-full px-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            )}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
              <Shield className="h-4 w-4" />
              Caregiver daily home
            </div>
            <h2 className="max-w-xl text-3xl font-headline font-black tracking-[-0.05em] text-foreground sm:text-4xl">
              Handoff for {babyName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-text-dim">
              Start a PIN session, capture the next care tasks, and leave a clear handoff trail for parents, doctors,
              and caregivers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {handoffStats.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">{item.label}</p>
                <p className="mt-2 text-2xl font-headline font-black text-foreground">{item.value}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-text-dim">{item.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/70 bg-white/80 p-2 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 sm:mb-0">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {caregiverSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`min-w-[10rem] shrink-0 rounded-[1.35rem] px-4 py-3 text-left transition-all sm:min-w-0 sm:shrink ${
                activeSection === section.id
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-zinc-950'
                  : 'text-text-dim hover:bg-surface-gray dark:hover:bg-white/5'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.18em]">{section.label}</span>
              <span className="mt-1 block text-[11px] font-semibold opacity-70">{section.helper}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Daily Shift Summary</CardTitle>
              <CardDescription>One calm view of what parents and caregivers need to know.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {parentReviewItems.map((item) => (
                <div key={item} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-950/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="mt-3 text-xs font-semibold leading-5 text-emerald-950 dark:text-emerald-50">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70">
            <CardHeader>
              <CardTitle className="text-sm">Next Best Action</CardTitle>
              <CardDescription>{urgentTasks.length ? 'Start with urgent care.' : 'Keep the handoff clean.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(urgentTasks[0] || openTasks[0]) ? (
                <div className="rounded-2xl border border-border-gray bg-surface/70 p-4 dark:border-zinc-800">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                    {(urgentTasks[0] || openTasks[0]).priority}
                  </p>
                  <p className="mt-2 text-sm font-bold text-foreground">{(urgentTasks[0] || openTasks[0]).title}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-gray bg-surface/70 p-5 text-center dark:border-zinc-800">
                  <ClipboardList className="mx-auto h-6 w-6 text-text-light" />
                  <p className="mt-2 text-xs font-semibold text-text-light">No open care tasks.</p>
                </div>
              )}
              <Button className="w-full" onClick={() => setActiveSection(openTasks.length ? 'tasks' : 'notes')}>
                {openTasks.length ? 'Review Tasks' : 'Write Handoff Note'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection !== 'overview' && (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Create/End Session */}
      <Card className={`rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 ${activeSection !== 'session' ? 'hidden' : ''}`}>
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

      <Card className={`rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 xl:col-span-2 ${activeSection !== 'notes' ? 'hidden' : ''}`}>
        <CardHeader>
          <CardTitle className="text-sm">Shift Summary & Parent Review</CardTitle>
          <CardDescription>Leave a concise handoff note parents can scan later.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-3">
            <textarea
              value={shiftNote}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setShiftNote(event.target.value)}
              rows={7}
              placeholder="Meals, naps, medication, mood, incidents, and anything the next caregiver should know."
              className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-secondary dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveShiftNote} disabled={shiftNoteSaving}>
                <Save className="mr-1 h-3 w-3" />
                {shiftNoteSaving ? 'Saving...' : 'Save Shift Note'}
              </Button>
              <Button variant="outline" onClick={() => setShiftNote(savedShiftNote)}>
                Restore Saved
              </Button>
            </div>
            {shiftNoteError && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-950/20 dark:text-red-300">
                {shiftNoteError}
              </p>
            )}
            {savedShiftNoteAt && (
              <p className="text-[11px] font-semibold text-text-light">
                Last saved to backend {new Date(savedShiftNoteAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                Parent handoff review
              </p>
              <div className="mt-3 space-y-2">
                {parentReviewItems.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs font-semibold text-emerald-950 dark:text-emerald-50">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border-gray bg-surface/70 p-4 dark:border-zinc-800">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                Completed care timeline
              </p>
              {completedTasks.length === 0 ? (
                <p className="mt-3 text-xs font-semibold text-text-light">No completed tasks yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {completedTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-xl bg-white/70 px-3 py-2 text-xs dark:bg-white/5">
                      <p className="font-bold text-foreground">{task.title}</p>
                      <p className="mt-0.5 text-text-light">{task.category} | {task.priority}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className={`rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 xl:col-span-3 ${activeSection !== 'activity' ? 'hidden' : ''}`}>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityLog.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-gray bg-surface/70 p-5 text-center dark:border-zinc-800">
                <Clock className="mx-auto h-6 w-6 text-text-light" />
                <p className="mt-2 text-xs font-semibold text-text-light">No activity yet.</p>
                <p className="mt-1 text-[11px] text-text-light">Session starts, task changes, and sharing updates will appear here.</p>
              </div>
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

      <Card className={`rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 xl:col-span-3 ${activeSection !== 'tasks' ? 'hidden' : ''}`}>
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
              <div className="rounded-2xl border border-dashed border-border-gray bg-surface/70 p-5 text-center dark:border-zinc-800">
                <ClipboardList className="mx-auto h-6 w-6 text-text-light" />
                <p className="mt-2 text-xs font-semibold text-text-light">No shared care tasks yet.</p>
                <p className="mt-1 text-[11px] text-text-light">Use a template above to create the first handoff item.</p>
              </div>
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
      )}
    </div>
  );
}
