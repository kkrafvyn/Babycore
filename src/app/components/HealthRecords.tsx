import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, CheckCircle2, Clock3, FileText, Pill, PlusCircle, ShieldCheck, Trash2 } from 'lucide-react';
import {
  getHealthRecords,
  getAllergies,
  getMedications,
  getMedicationAdherenceByBaby,
  recordMedicationDose,
  deleteHealthRecord,
  HealthRecord,
  Allergy,
  Medication,
  MedicationAdherence,
} from '@/lib/health-records-service';
import {
  decideCareApprovalRequest,
  getCareApprovalRequests,
  getCareApprovalTimeline,
  getMedicationDoseLogs,
  getMedicationRefillAlerts,
  getMedicationSchedules,
  logMedicationDoseAdvanced,
  saveMedicationSchedule,
  type CareApprovalRequest,
  type CareApprovalTimelineEvent,
  type MedicationDoseLog,
  type MedicationSchedule,
  type RefillAlert,
} from '@/lib/care-advanced-api';

interface HealthRecordsProps {
  babyId: string;
  babyName: string;
}

export function HealthRecords({ babyId, babyName }: HealthRecordsProps) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<MedicationAdherence[]>([]);
  const [medicationSchedules, setMedicationSchedules] = useState<MedicationSchedule[]>([]);
  const [advancedDoseLogs, setAdvancedDoseLogs] = useState<MedicationDoseLog[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<RefillAlert[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<CareApprovalRequest[]>([]);
  const [approvalTimeline, setApprovalTimeline] = useState<CareApprovalTimelineEvent[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  >('all');
  const [canDecideApprovals, setCanDecideApprovals] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    stockQuantity: '',
    refillThreshold: '',
    requiresConfirmation: true,
  });
  const [recordingMedicationId, setRecordingMedicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
  }, [babyId, approvalFilter]);

  const loadHealthData = async () => {
    setLoading(true);
    const [
      healthRecords,
      allergyData,
      medicationData,
      adherenceData,
      scheduleData,
      doseLogData,
      refillAlertData,
      approvalData,
      approvalTimelineData,
    ] = await Promise.all([
      getHealthRecords(babyId),
      getAllergies(babyId),
      getMedications(babyId),
      getMedicationAdherenceByBaby(babyId),
      getMedicationSchedules(babyId).catch(() => []),
      getMedicationDoseLogs(babyId).catch(() => []),
      getMedicationRefillAlerts(babyId).catch(() => []),
      getCareApprovalRequests(babyId, approvalFilter).catch(() => ({ requests: [], canDecide: false })),
      getCareApprovalTimeline(babyId).catch(() => []),
    ]);

    setRecords(healthRecords);
    setAllergies(allergyData);
    setMedications(medicationData);
    setAdherenceRecords(adherenceData);
    setMedicationSchedules(scheduleData);
    setAdvancedDoseLogs(doseLogData);
    setRefillAlerts(refillAlertData);
    setApprovalRequests(approvalData.requests);
    setApprovalTimeline(approvalTimelineData);
    setCanDecideApprovals(approvalData.canDecide);
    setLoading(false);
  };

  const handleDeleteRecord = async (recordId: string, storageKey?: string) => {
    if (!confirm('Delete this record?')) return;

    const success = await deleteHealthRecord(recordId, storageKey);
    if (success) {
      setRecords(records.filter((r) => r.id !== recordId));
    }
  };

  const handleRecordDose = async (medicationId: string) => {
    const notes = window.prompt('Optional dose notes (symptoms, side effects, etc.)') || undefined;
    setRecordingMedicationId(medicationId);
    const created = await recordMedicationDose(medicationId, notes);
    if (created) {
      const refreshedAdherence = await getMedicationAdherenceByBaby(babyId);
      setAdherenceRecords(refreshedAdherence);
    }
    setRecordingMedicationId(null);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.medicationName.trim()) {
      alert('Please enter medication name.');
      return;
    }

    setSavingSchedule(true);
    try {
      const result = await saveMedicationSchedule({
        babyId,
        medicationName: scheduleForm.medicationName.trim(),
        dosage: scheduleForm.dosage.trim() || null,
        frequency: scheduleForm.frequency.trim() || null,
        stockQuantity:
          scheduleForm.stockQuantity.trim() === '' ? null : Number(scheduleForm.stockQuantity.trim()),
        refillThreshold:
          scheduleForm.refillThreshold.trim() === '' ? 0 : Number(scheduleForm.refillThreshold.trim()),
        requiresConfirmation: scheduleForm.requiresConfirmation,
      });

      setScheduleForm({
        medicationName: '',
        dosage: '',
        frequency: '',
        stockQuantity: '',
        refillThreshold: '',
        requiresConfirmation: true,
      });

      if (result.requiresApproval) {
        alert(result.message || 'Submitted for parent approval.');
      }
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to save schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAdvancedDoseLog = async (
    scheduleId: string,
    doseStatus: 'taken' | 'missed' | 'skipped',
  ) => {
    const quantityPrompt = window.prompt(
      doseStatus === 'taken' ? 'Quantity used (optional)' : 'Quantity used (leave blank for none)',
      '',
    );
    const notes = window.prompt('Notes (optional)', '') || undefined;
    const quantityUsed = quantityPrompt?.trim() ? Number(quantityPrompt.trim()) : undefined;

    if (quantityUsed !== undefined && Number.isNaN(quantityUsed)) {
      alert('Quantity must be a number.');
      return;
    }

    try {
      await logMedicationDoseAdvanced(scheduleId, {
        doseStatus,
        quantityUsed,
        notes,
      });
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to save dose log.');
    }
  };

  const handleApprovalDecision = async (
    approvalId: string,
    decision: 'approved' | 'rejected' | 'cancelled',
  ) => {
    const notes = window.prompt('Decision note (optional)', '') || undefined;
    setPendingDecisionId(approvalId);

    try {
      await decideCareApprovalRequest(approvalId, decision, notes);
      await loadHealthData();
    } catch (error: any) {
      alert(error?.message || 'Failed to update approval request.');
    } finally {
      setPendingDecisionId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading health records...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Health Records
        </CardTitle>
        <CardDescription>Track medical history for {babyName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="medications">Meds</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {allergies.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Known Allergies ({allergies.length})
                </h4>
                {allergies.map((allergy) => (
                  <Card key={allergy.id} className="bg-red-50 dark:bg-red-900/10 border-red-200">
                    <CardContent className="pt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{allergy.allergen}</div>
                          <div className="text-xs text-red-700 dark:text-red-300 capitalize">
                            Severity: {allergy.severity}
                          </div>
                          {allergy.reaction_description && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {allergy.reaction_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {medications.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-500" />
                  Current Medications ({medications.length})
                </h4>
                {medications.map((med) => (
                  <Card key={med.id}>
                    <CardContent className="pt-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{med.medication_name}</div>
                        {med.dosage && <div className="text-xs text-gray-600 dark:text-gray-400">Dose: {med.dosage}</div>}
                        {med.frequency && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">Freq: {med.frequency}</div>
                        )}
                        {med.reason && <div className="text-xs text-gray-600 dark:text-gray-400">Reason: {med.reason}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {allergies.length === 0 && medications.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No allergies or medications recorded yet.</p>
            )}
          </TabsContent>

          <TabsContent value="allergies">
            <div className="space-y-2">
              {allergies.map((allergy) => (
                <Card key={allergy.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{allergy.allergen}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {allergy.severity} severity
                      </div>
                      {allergy.reaction_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{allergy.reaction_description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allergies.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No allergies recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="medications">
            <div className="space-y-2">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{med.medication_name}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {med.dosage && <div>Dose: {med.dosage}</div>}
                        {med.frequency && <div>Freq: {med.frequency}</div>}
                      </div>
                      {med.effectiveness_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{med.effectiveness_notes}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            const latestDose = adherenceRecords.find((entry) => entry.medication_id === med.id);
                            if (!latestDose) return 'No dose logged yet';
                            return `Last dose: ${new Date(latestDose.given_at).toLocaleString()}`;
                          })()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRecordDose(med.id)}
                          disabled={recordingMedicationId === med.id}
                        >
                          {recordingMedicationId === med.id ? 'Saving...' : 'Log Dose'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No medications recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="adherence">
            <div className="space-y-2">
              {adherenceRecords.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {entry.dose_taken ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {entry.medication_name || 'Medication'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(entry.given_at).toLocaleString()}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {adherenceRecords.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No medication doses logged yet.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracker">
            <div className="space-y-3">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-blue-500" />
                    <p className="font-semibold text-sm">Add Medication Schedule</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={scheduleForm.medicationName}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, medicationName: event.target.value }))
                      }
                      placeholder="Medication name"
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      value={scheduleForm.dosage}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, dosage: event.target.value }))
                      }
                      placeholder="Dosage"
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      value={scheduleForm.frequency}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, frequency: event.target.value }))
                      }
                      placeholder="Frequency"
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      value={scheduleForm.stockQuantity}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                      }
                      placeholder="Stock quantity"
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      value={scheduleForm.refillThreshold}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, refillThreshold: event.target.value }))
                      }
                      placeholder="Refill threshold"
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <label className="text-xs flex items-center gap-2 px-1">
                      <input
                        type="checkbox"
                        checked={scheduleForm.requiresConfirmation}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            requiresConfirmation: event.target.checked,
                          }))
                        }
                      />
                      Needs parent approval
                    </label>
                  </div>
                  <Button size="sm" onClick={handleSaveSchedule} disabled={savingSchedule}>
                    {savingSchedule ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </CardContent>
              </Card>

              {refillAlerts.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Refill Alerts
                    </p>
                    {refillAlerts.map((alert) => (
                      <div key={alert.scheduleId} className="text-xs text-amber-700 dark:text-amber-300">
                        {alert.medicationName}: {alert.stockQuantity ?? '-'} {alert.stockUnit || ''} remaining
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {medicationSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="pt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{schedule.medication_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.dosage || 'No dosage'} {schedule.frequency ? `• ${schedule.frequency}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Stock: {schedule.stock_quantity ?? '-'} {schedule.stock_unit || ''}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">{schedule.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'taken')}
                        >
                          Log Taken
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'missed')}
                        >
                          Log Missed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvancedDoseLog(schedule.id, 'skipped')}
                        >
                          Log Skipped
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {medicationSchedules.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No medication schedules yet.</p>
                )}
              </div>

              {advancedDoseLogs.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold">Recent Dose Logs</p>
                    {advancedDoseLogs.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="text-xs border rounded px-2 py-2">
                        <div className="font-semibold">{entry.medication_name}</div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {entry.dose_status.toUpperCase()} • {new Date(entry.logged_at).toLocaleString()}
                        </div>
                        {entry.approval_required && (
                          <div className="text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            Waiting for parent approval
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={approvalFilter === status ? 'default' : 'outline'}
                    onClick={() => setApprovalFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              {approvalRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                          {request.request_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By {request.requested_by_role || 'care team'} •{' '}
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                        {request.reason && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{request.reason}</p>
                        )}
                        {request.decided_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Decision: {request.status} at {new Date(request.decided_at).toLocaleString()}
                            {request.decided_by ? ` by ${request.decided_by.slice(0, 8)}...` : ''}
                          </p>
                        )}
                        {request.decision_notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Note: {request.decision_notes}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        {request.status}
                      </span>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        {canDecideApprovals && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprovalDecision(request.id, 'approved')}
                              disabled={pendingDecisionId === request.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalDecision(request.id, 'rejected')}
                              disabled={pendingDecisionId === request.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprovalDecision(request.id, 'cancelled')}
                          disabled={pendingDecisionId === request.id}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {approvalRequests.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No approval requests.</p>
              )}

              {approvalTimeline.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold">Audit Timeline</p>
                    {approvalTimeline.slice(0, 20).map((event) => (
                      <div key={event.id} className="rounded border p-2 text-xs">
                        <div className="font-semibold">
                          {event.action.toUpperCase()} • {event.requestType?.replace(/_/g, ' ') || 'approval'}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                        {event.actorRole && (
                          <div className="text-gray-500 dark:text-gray-400">Role: {event.actorRole}</div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start justify-between p-2 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{record.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {record.record_type}
                    </div>
                    {record.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{record.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{record.date_recorded}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRecord(record.id, record.storage_key)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {records.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No health records.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
