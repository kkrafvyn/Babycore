import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle2, ChevronLeft, RefreshCw, Stethoscope, UserPlus2, UsersRound } from 'lucide-react';
import {
  acceptIncomingSharingInvite,
  getIncomingSharingInvites,
  type FamilySharingInvite,
} from '@/lib/family-sharing-service';
import { useAuthStore } from '@/app/AppContext';

interface PatientAssignmentsProps {
  onBack?: () => void;
}

const roleLabel: Record<string, string> = {
  doctor: 'Doctor',
  caregiver: 'Caregiver',
  viewer: 'Viewer',
  editor: 'Editor',
  owner: 'Owner',
};

const formatDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const resolveBabyName = (invite: FamilySharingInvite) =>
  invite.baby_name_snapshot?.trim() || `Baby ${invite.baby_id.slice(0, 8)}`;

export function PatientAssignments({ onBack }: PatientAssignmentsProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<FamilySharingInvite[]>([]);
  const [assignedInvites, setAssignedInvites] = useState<FamilySharingInvite[]>([]);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);

  const profileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    'baby';

  const isCareTeamUser = profileType === 'doctor' || profileType === 'caregiver';

  const heading = useMemo(() => {
    if (profileType === 'doctor') return 'My Patients';
    if (profileType === 'caregiver') return 'Assigned Babies';
    return 'Shared Baby Profiles';
  }, [profileType]);

  const loadInvites = async () => {
    setLoading(true);
    const [pending, assigned] = await Promise.all([
      getIncomingSharingInvites('pending'),
      getIncomingSharingInvites('accepted'),
    ]);
    setPendingInvites(pending);
    setAssignedInvites(assigned);
    setLoading(false);
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    setAcceptingInviteId(inviteId);
    await acceptIncomingSharingInvite(inviteId);
    await loadInvites();
    setAcceptingInviteId(null);
  };

  if (loading) {
    return (
      <div className="w-full py-10 text-center">
        <p className="text-sm font-semibold text-text-light">Loading your assigned profiles...</p>
      </div>
    );
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {profileType === 'doctor' ? <Stethoscope className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                {heading}
              </CardTitle>
              <CardDescription>
                Accept shared baby profiles to add them to your patient list.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadInvites}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!isCareTeamUser && (
        <Card className="border border-border-gray dark:border-zinc-800">
          <CardContent className="py-6 text-sm font-medium text-text-light">
            This view is focused on doctor and caregiver assignment flows. You can still accept shares sent to your
            account email.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned">My List ({assignedInvites.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-4 space-y-3">
          {assignedInvites.length === 0 ? (
            <Card className="border border-dashed border-border-gray dark:border-zinc-800">
              <CardContent className="py-8 text-center">
                <p className="text-sm font-semibold text-text-light">No assigned profiles yet.</p>
              </CardContent>
            </Card>
          ) : (
            assignedInvites.map((invite) => (
              <Card key={invite.id} className="border border-border-gray dark:border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{resolveBabyName(invite)}</p>
                      <p className="text-xs text-text-light">Shared on {formatDate(invite.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleLabel[invite.role] || invite.role}</Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Added
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingInvites.length === 0 ? (
            <Card className="border border-dashed border-border-gray dark:border-zinc-800">
              <CardContent className="py-8 text-center">
                <p className="text-sm font-semibold text-text-light">No pending shares.</p>
              </CardContent>
            </Card>
          ) : (
            pendingInvites.map((invite) => (
              <Card key={invite.id} className="border border-border-gray dark:border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{resolveBabyName(invite)}</p>
                      <p className="text-xs text-text-light">Role: {roleLabel[invite.role] || invite.role}</p>
                      <p className="text-xs text-text-light">Shared on {formatDate(invite.created_at)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(invite.id)}
                      disabled={acceptingInviteId === invite.id}
                    >
                      <UserPlus2 className="mr-2 h-4 w-4" />
                      {acceptingInviteId === invite.id ? 'Adding...' : 'Add to My List'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

