import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, Download, FileText, PlusCircle, Stethoscope, Trash2, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  deleteClinicReportTemplate,
  exportClinicPatientQueue,
  getClinicPatientQueue,
  getClinicReportTemplates,
  saveClinicReportTemplate,
  type ClinicPanelPayload,
  type ClinicReportTemplate,
} from '@/lib/care-advanced-api';
import {
  getSharedCareTasksForBabies,
  updateSharedCareTask,
  type SharedCareTask,
} from '@/lib/shared-care-tasks';

interface ClinicDoctorPanelProps {
  onBack?: () => void;
}

export function ClinicDoctorPanel({ onBack }: ClinicDoctorPanelProps) {
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicPanelPayload | null>(null);
  const [templates, setTemplates] = useState<ClinicReportTemplate[]>([]);
  const [careTasks, setCareTasks] = useState<SharedCareTask[]>([]);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'appointments'>('priority');
  const [form, setForm] = useState({
    name: '',
    reportType: 'health_summary',
    includeData: 'sleep,feeding,diaper,growth,vaccinations,health',
    promptNotes: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [queue, reportTemplates] = await Promise.all([
        getClinicPatientQueue({ search, pendingOnly, overdueOnly, sortBy }),
        getClinicReportTemplates(),
      ]);
      setClinicData(queue);
      setTemplates(reportTemplates);
      setCareTasks(getSharedCareTasksForBabies((queue.queue || []).map((entry) => entry.babyId)));
    } catch (error) {
      console.error('Failed to load clinic panel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCompletion = (taskId: string) => {
    updateSharedCareTask(taskId, { status: 'completed' });
    if (clinicData?.queue) {
      setCareTasks(getSharedCareTasksForBabies(clinicData.queue.map((entry) => entry.babyId)));
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [search, pendingOnly, overdueOnly, sortBy]);

  const handleCreateTemplate = async () => {
    if (!form.name.trim()) {
      alert('Template name is required.');
      return;
    }

    setSavingTemplate(true);
    try {
      await saveClinicReportTemplate({
        name: form.name.trim(),
        reportType: form.reportType,
        includeData: form.includeData
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        promptNotes: form.promptNotes.trim() || null,
      });
      setForm({
        name: '',
        reportType: 'health_summary',
        includeData: 'sleep,feeding,diaper,growth,vaccinations,health',
        promptNotes: '',
      });
      await loadAll();
    } catch (error: any) {
      alert(error?.message || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await deleteClinicReportTemplate(templateId);
      await loadAll();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete template.');
    }
  };

  const handleExportQueue = async () => {
    setExporting(true);
    try {
      await exportClinicPatientQueue({ search, pendingOnly, overdueOnly, sortBy });
    } catch (error: any) {
      alert(error?.message || 'Failed to export patient queue.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-sm font-semibold text-text-light">Loading clinic panel...</div>;
  }

  const stats = clinicData?.stats || { totalPatients: 0, pendingApprovals: 0, overdueVaccines: 0 };
  const filteredPatients =
    typeof clinicData?.stats?.filteredPatients === 'number'
      ? clinicData.stats.filteredPatients
      : clinicData?.queue?.length || 0;
  const doctorTasks = careTasks.filter((task) => task.assignedRole === 'doctor' && task.status === 'open');
  const urgentDoctorTasks = doctorTasks.filter((task) => task.priority === 'urgent');

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border border-border-gray dark:border-zinc-800">
        <CardHeader className="space-y-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-fit px-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Clinic/Doctor Panel
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-4 w-4 mx-auto text-blue-500" />
            <p className="text-lg font-black mt-2">{stats.totalPatients}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-amber-500" />
            <p className="text-lg font-black mt-2">{stats.pendingApprovals}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Approvals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <FileText className="h-4 w-4 mx-auto text-rose-500" />
            <p className="text-lg font-black mt-2">{stats.overdueVaccines}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Overdue Vax</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-violet-500" />
            <p className="text-lg font-black mt-2">{doctorTasks.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border rounded px-2 py-1 text-xs col-span-2"
              placeholder="Search patient name"
            />
            <Button size="sm" variant={pendingOnly ? 'default' : 'outline'} onClick={() => setPendingOnly((prev) => !prev)}>
              Pending only
            </Button>
            <Button size="sm" variant={overdueOnly ? 'default' : 'outline'} onClick={() => setOverdueOnly((prev) => !prev)}>
              Overdue only
            </Button>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'priority' | 'appointments')}
              className="border rounded px-2 py-1 text-xs col-span-2"
            >
              <option value="priority">Sort: Priority</option>
              <option value="appointments">Sort: Upcoming appointments</option>
            </select>
            <Button size="sm" onClick={handleExportQueue} disabled={exporting} className="col-span-2">
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Bulk Export CSV'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredPatients} of {stats.totalPatients} patients
          </p>

          {(clinicData?.queue || []).map((entry) => (
            <div key={entry.assignmentId} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{entry.babyName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Approvals: {entry.pendingApprovalsCount} | Overdue vaccines: {entry.overdueVaccinesCount}
              </p>
              {careTasks.filter((task) => task.babyId === entry.babyId && task.status === 'open').length > 0 && (
                <p className="text-xs text-violet-600 dark:text-violet-300 mt-1">
                  Open shared tasks:{' '}
                  {careTasks.filter((task) => task.babyId === entry.babyId && task.status === 'open').length}
                </p>
              )}
              {entry.nextAppointment?.scheduled_date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Next appointment: {entry.nextAppointment.scheduled_date} {entry.nextAppointment.scheduled_time || ''}
                </p>
              )}
            </div>
          ))}
          {(clinicData?.queue || []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No active patients assigned.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor Follow-up Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {doctorTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No doctor follow-up tasks assigned right now.</p>
          ) : (
            doctorTasks.map((task) => (
              <div key={task.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.priority} priority | {task.category}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Due {task.dueDate}</p>
                    )}
                    {task.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{task.details}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleTaskCompletion(task.id)}>
                    Done
                  </Button>
                </div>
              </div>
            ))
          )}
          {urgentDoctorTasks.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              {urgentDoctorTasks.length} urgent follow-up task{urgentDoctorTasks.length === 1 ? '' : 's'} need attention.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(clinicData?.alertInbox || []).slice(0, 20).map((alert) => (
            <div key={`${alert.type}-${alert.id}`} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{alert.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {(clinicData?.alertInbox || []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No active alerts.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Report Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="border rounded px-2 py-1 text-xs"
              placeholder="Template name"
            />
            <input
              value={form.reportType}
              onChange={(event) => setForm((prev) => ({ ...prev, reportType: event.target.value }))}
              className="border rounded px-2 py-1 text-xs"
              placeholder="Report type"
            />
            <input
              value={form.includeData}
              onChange={(event) => setForm((prev) => ({ ...prev, includeData: event.target.value }))}
              className="border rounded px-2 py-1 text-xs col-span-2"
              placeholder="sleep,feeding,diaper,growth,vaccinations,health"
            />
            <textarea
              value={form.promptNotes}
              onChange={(event) => setForm((prev) => ({ ...prev, promptNotes: event.target.value }))}
              className="border rounded px-2 py-1 text-xs col-span-2 min-h-[70px]"
              placeholder="Optional notes/instructions"
            />
          </div>
          <Button size="sm" onClick={handleCreateTemplate} disabled={savingTemplate}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </Button>

          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{template.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{template.report_type}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {(template.include_data || []).join(', ')}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No templates yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

