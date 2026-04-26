import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronLeft, Mail, Plus, Users } from 'lucide-react';
import {
  type FamilySharingRole,
  sendFamilySharingInvite,
  getFamilyMembers,
  updateFamilyMemberRole,
} from '@/lib/family-sharing-service';
import { useAuthStore } from '@/app/AppContext';

interface FamilySharingProps {
  babyId?: string;
  babyName?: string;
  onBack?: () => void;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: FamilySharingRole;
  status: 'accepted' | 'pending' | 'declined';
  user_email: string;
}

const ROLES = [
  { value: 'owner', label: 'Owner - Full Access', desc: 'Manage all data and family access' },
  { value: 'editor', label: 'Editor - Add/Edit', desc: 'Can add and edit logs' },
  { value: 'viewer', label: 'Viewer - Read Only', desc: 'View data only' },
  { value: 'caregiver', label: 'Caregiver - Ongoing', desc: 'Can support daily logging and updates' },
  { value: 'doctor', label: 'Doctor - Clinical Access', desc: 'Assigned to patient for medical follow-up' },
];

export function FamilySharing({ babyId, babyName, onBack }: FamilySharingProps) {
  const { user, currentBaby } = useAuthStore();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'caregiver' | 'doctor'>(
    'caregiver',
  );
  const [inviting, setInviting] = useState(false);
  const resolvedBabyId = babyId ?? currentBaby?.id;
  const resolvedBabyName = babyName ?? currentBaby?.name ?? 'your baby';

  useEffect(() => {
    if (!resolvedBabyId) {
      setMembers([]);
      return;
    }

    loadMembers();
  }, [resolvedBabyId]);

  const loadMembers = async () => {
    if (!resolvedBabyId) return;

    setLoading(true);
    const familyMembers = await getFamilyMembers(resolvedBabyId);
    // Map FamilySharingInvite to FamilyMember structure
    const mappedMembers = familyMembers.map((invite: any) => ({
      id: invite.id,
      user_id: invite.user_id || '',
      user_email: invite.invited_email || '',
      role: (invite.role || 'viewer') as FamilySharingRole,
      status: invite.accepted_at ? 'accepted' : 'pending',
    }));
    setMembers(mappedMembers);
    setLoading(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !user?.id || !resolvedBabyId) return;

    setInviting(true);
    const invite = await sendFamilySharingInvite(
      resolvedBabyId,
      inviteEmail.trim().toLowerCase(),
      inviteRole,
      user.id,
      {
        babyNameSnapshot: resolvedBabyName,
        babyPhotoUrlSnapshot: currentBaby?.photoUrl,
      },
    );

    if (invite) {
      setInviteEmail('');
      await loadMembers();
    }
    setInviting(false);
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: FamilySharingRole,
  ) => {
    const success = await updateFamilyMemberRole(memberId, newRole);

    if (success) {
      await loadMembers();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading family members...</div>;
  }

  const acceptedMembers = members.filter((m) => m.status === 'accepted');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Invite Card */}
      <Card>
        <CardHeader>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-fit px-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Invite Member
          </CardTitle>
          <CardDescription>Add someone to {resolvedBabyName}'s family</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer (Read-Only)</SelectItem>
              <SelectItem value="editor">Editor (Add/Edit)</SelectItem>
              <SelectItem value="caregiver">Caregiver (Daily Care)</SelectItem>
              <SelectItem value="doctor">Doctor (Patient Access)</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSendInvite} disabled={inviting} className="w-full">
            <Mail className="mr-2 h-4 w-4" />
            {inviting ? 'Sending...' : 'Send Invite'}
          </Button>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accepted" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="accepted">Accepted ({acceptedMembers.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingMembers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="accepted" className="space-y-2 mt-3">
              {acceptedMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No accepted members yet</p>
              ) : (
                acceptedMembers.map((member) => (
                  <Card key={member.id} className="border">
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">{member.user_email}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {ROLES.find((r) => r.value === member.role)?.label}
                          </div>
                        </div>

                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            handleUpdateRole(
                              member.id,
                              v as FamilySharingRole,
                            )
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.filter((role) => role.value !== 'owner').map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-2 mt-3">
              {pendingMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No pending invites</p>
              ) : (
                pendingMembers.map((member) => (
                  <Card key={member.id} className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                            {member.user_email}
                          </div>
                          <div className="text-xs text-yellow-700 dark:text-yellow-300">
                            Pending acceptance
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                          {ROLES.find((r) => r.value === member.role)?.value}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
