import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, Clock3, RefreshCw, ShieldCheck, Syringe } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAppContext } from '../AppContext';
import {
  decideCareApprovalRequest,
  getCareApprovalRequests,
  getMedicationRefillAlerts,
  type CareApprovalRequest,
  type RefillAlert,
} from '@/lib/care-advanced-api';
import type { VaccinationRecord } from '@/types';

interface CarePriorityBoardProps {
  babyId: string;
  babyName: string;
  onBack?: () => void;
  onOpenVaccines?: () => void;
  onOpenHealthRecords?: () => void;
}

const startOfToday = (): number => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const isOverdue = (record: VaccinationRecord): boolean => {
  if (record.status === 'given' || record.status === 'skipped') return false;
  return new Date(record.dueDate).getTime() < startOfToday();
};

const isUpcomingSoon = (record: VaccinationRecord, daysAhead = 7): boolean => {
  if (record.status === 'given' || record.status === 'skipped') return false;
  const dueAt = new Date(record.dueDate).getTime();
  const now = Date.now();
  return dueAt >= now && dueAt <= now + daysAhead * 24 * 60 * 60 * 1000;
};

const toneByApprovalStatus = (status: CareApprovalRequest['status']): string => {
  if (status === 'approved') return 'text-emerald-600';
  if (status === 'rejected') return 'text-red-600';
  if (status === 'cancelled') return 'text-zinc-500';
  return 'text-amber-600';
};

export function CarePriorityBoard({
  babyId,
  babyName,
  onBack,
  onOpenVaccines,
  onOpenHealthRecords,
}: CarePriorityBoardProps) {
  const { vaccinationRecords } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refillAlerts, setRefillAlerts] = useState<RefillAlert[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<CareApprovalRequest[]>([]);
  const [canDecideApprovals, setCanDecideApprovals] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  const overdueVaccines = useMemo(
    () =>
      vaccinationRecords
        .filter(isOverdue)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 8),
    [vaccinationRecords],
  );

  const upcomingVaccines = useMemo(
    () =>
      vaccinationRecords
        .filter((record) => isUpcomingSoon(record, 7))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 8),
    [vaccinationRecords],
  );

  const urgentCount = overdueVaccines.length + refillAlerts.length + pendingApprovals.length;

  const loadBoard = async () => {
    setLoading(true);
    try {
      const [alerts, approvals] = await Promise.all([
        getMedicationRefillAlerts(babyId).catch(() => []),
        getCareApprovalRequests(babyId, 'pending').catch(() => ({ requests: [], canDecide: false })),
      ]);
      setRefillAlerts(alerts);
      setPendingApprovals(approvals.requests || []);
      setCanDecideApprovals(Boolean(approvals.canDecide));
    } catch (error) {
      console.error('Failed to load care priority board data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [babyId]);

  const handleApprovalDecision = async (
    approvalId: string,
    decision: 'approved' | 'rejected' | 'cancelled',
  ) => {
    setProcessingApprovalId(approvalId);
    try {
      await decideCareApprovalRequest(approvalId, decision);
      await loadBoard();
    } catch (error) {
      console.error('Failed to update approval request:', error);
      window.alert('Could not update request right now. Please try again.');
    } finally {
      setProcessingApprovalId(null);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-sm font-semibold text-text-light">Loading priority board...</div>;
  }

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
            <ShieldCheck className="h-5 w-5 text-secondary" />
            Care Priority Board
          </CardTitle>
          <p className="text-sm text-text-light">
            High-priority care actions for <span className="font-semibold text-foreground">{babyName}</span>.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <AlertTriangle className="h-4 w-4 mx-auto text-red-500" />
                <p className="text-lg font-black mt-2">{overdueVaccines.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Overdue Vax</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Clock3 className="h-4 w-4 mx-auto text-amber-500" />
                <p className="text-lg font-black mt-2">{refillAlerts.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Refill Alerts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <ShieldCheck className="h-4 w-4 mx-auto text-blue-500" />
                <p className="text-lg font-black mt-2">{pendingApprovals.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Approvals</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadBoard}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {onOpenVaccines && (
              <Button variant="outline" size="sm" onClick={onOpenVaccines}>
                <Syringe className="h-4 w-4 mr-2" />
                Open Vaccines
              </Button>
            )}
            {onOpenHealthRecords && (
              <Button variant="outline" size="sm" onClick={onOpenHealthRecords}>
                <Clock3 className="h-4 w-4 mr-2" />
                Open Health Tracker
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Urgent Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overdueVaccines.map((record) => (
            <div key={record.id} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{record.name}</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Overdue since {new Date(record.dueDate).toLocaleDateString()}
              </p>
            </div>
          ))}

          {refillAlerts.map((alert) => (
            <div key={alert.scheduleId} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{alert.medicationName}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {alert.reason === 'low_stock' ? 'Low stock' : 'Refill due'} - {alert.stockQuantity ?? '-'}{' '}
                {alert.stockUnit || ''}
              </p>
            </div>
          ))}

          {pendingApprovals.map((request) => (
            <div key={request.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{request.request_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[10px] uppercase font-bold ${toneByApprovalStatus(request.status)}`}>
                  {request.status}
                </span>
              </div>

              {request.reason && <p className="text-xs text-gray-600 dark:text-gray-300">{request.reason}</p>}

              {request.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  {canDecideApprovals && (
                    <>
                      <Button
                        size="sm"
                        disabled={processingApprovalId === request.id}
                        onClick={() => handleApprovalDecision(request.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingApprovalId === request.id}
                        onClick={() => handleApprovalDecision(request.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={processingApprovalId === request.id}
                    onClick={() => handleApprovalDecision(request.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}

          {urgentCount === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                No urgent care actions right now.
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                Keep up this rhythm. Upcoming reminders are listed below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingVaccines.map((record) => (
            <div key={record.id} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{record.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Due {new Date(record.dueDate).toLocaleDateString()}
              </p>
            </div>
          ))}

          {upcomingVaccines.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No vaccines due in the next 7 days.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
