import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Image, Plus, Calendar, Search, Link2, Copy, UserPlus2 } from 'lucide-react';
import { BabyPhoto, uploadBabyPhoto, getBabyPhotos, deletePhoto } from '@/lib/photo-management-service';
import {
  createPublicFamilyInviteLink,
  searchCareTeamCandidates,
  sendFamilySharingInvite,
  type CareTeamSearchCandidate,
  type FamilySharingRole,
} from '@/lib/family-sharing-service';
import { useAppContext } from '../AppContext';
import { toast } from 'sonner';

interface PhotoGalleryProps {
  babyId: string;
  babyName: string;
}

export function PhotoGallery({ babyId, babyName }: PhotoGalleryProps) {
  const { user, currentBaby } = useAppContext();
  const [photos, setPhotos] = useState<BabyPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inviteRole, setInviteRole] = useState<Extract<FamilySharingRole, 'viewer' | 'caregiver' | 'doctor'>>(
    'viewer',
  );
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<CareTeamSearchCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  useEffect(() => {
    loadPhotos();
  }, [babyId]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const query = inviteQuery.trim();
      if (query.length < 2) {
        setInviteCandidates([]);
        return;
      }

      setSearchingCandidates(true);
      const results = await searchCareTeamCandidates(query);
      setInviteCandidates(results);
      setSearchingCandidates(false);
    }, 220);

    return () => window.clearTimeout(handle);
  }, [inviteQuery]);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getBabyPhotos(babyId, 50);
    setPhotos(data);
    setLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const today = new Date().toISOString().split('T')[0];
    const photo = await uploadBabyPhoto(
      babyId,
      file,
      today,
      `Photo from ${new Date().toLocaleDateString()}`,
      ['daily']
    );

    if (photo) {
      setPhotos([photo, ...photos]);
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: string, storageKey: string) => {
    if (!confirm('Delete this photo?')) return;

    const success = await deletePhoto(photoId, storageKey);
    if (success) {
      setPhotos(photos.filter((p) => p.id !== photoId));
    }
  };

  const handleInviteByEmail = async () => {
    if (!user?.id) {
      toast.error('Please login to send invites.');
      return;
    }

    if (!inviteEmail.trim()) {
      toast.error('Enter an email address first.');
      return;
    }

    setSendingInvite(true);
    const invite = await sendFamilySharingInvite(
      babyId,
      inviteEmail.trim().toLowerCase(),
      inviteRole,
      user.id,
      {
        invitedName: inviteName.trim() || undefined,
        babyNameSnapshot: babyName,
        babyPhotoUrlSnapshot: currentBaby?.photoUrl,
      },
    );
    setSendingInvite(false);

    if (!invite) {
      toast.error('Invite failed. Please try again.');
      return;
    }

    toast.success(`Invitation sent to ${inviteEmail.trim()}`);
    setInviteQuery('');
    setInviteCandidates([]);
    setInviteName('');
    setInviteEmail('');
  };

  const handleCreateLinkInvite = async () => {
    if (!user?.id) {
      toast.error('Please login to create invite links.');
      return;
    }

    setCreatingLink(true);
    const payload = await createPublicFamilyInviteLink(babyId, inviteRole, user.id, {
      invitedName: inviteName.trim() || undefined,
      babyNameSnapshot: babyName,
      babyPhotoUrlSnapshot: currentBaby?.photoUrl,
      view: 'patients',
    });
    setCreatingLink(false);

    if (!payload?.inviteLink) {
      toast.error('Could not create invite link. Run latest database migrations and try again.');
      return;
    }

    setGeneratedInviteLink(payload.inviteLink);
    await navigator.clipboard.writeText(payload.inviteLink);
    toast.success('Invite link copied to clipboard.');
  };

  const handleCopyGeneratedLink = async () => {
    if (!generatedInviteLink) return;
    await navigator.clipboard.writeText(generatedInviteLink);
    toast.success('Invite link copied.');
  };

  // Group by month
  const photosByMonth = photos.reduce(
    (acc, photo) => {
      const month = photo.photo_date.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(photo);
      return acc;
    },
    {} as Record<string, BabyPhoto[]>
  );

  const months = Object.keys(photosByMonth).sort().reverse();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {babyName}'s Photos
            </CardTitle>
            <CardDescription>Monthly milestone photos and memories</CardDescription>
          </div>
          <label>
            <Button asChild disabled={uploading}>
              <span>
                <Plus className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Add Photo'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-2xl border border-border-gray bg-surface-gray/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus2 className="h-4 w-4 text-secondary" />
            <p className="text-sm font-black text-foreground">Invite To Gallery</p>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-background p-1 dark:bg-zinc-900">
              {(['viewer', 'caregiver', 'doctor'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setInviteRole(role)}
                  className={`rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                    inviteRole === role
                      ? 'bg-secondary text-white shadow'
                      : 'text-text-light hover:text-foreground'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" />
              <input
                type="text"
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.target.value)}
                placeholder="Search by name"
                className="w-full rounded-xl border border-border-gray bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-secondary dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            {searchingCandidates && (
              <p className="text-xs font-semibold text-text-light">Searching…</p>
            )}

            {!searchingCandidates && inviteCandidates.length > 0 && (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border-gray bg-background p-2 dark:border-zinc-700 dark:bg-zinc-900">
                {inviteCandidates.map((candidate) => (
                  <button
                    key={`${candidate.source}-${candidate.email}`}
                    onClick={() => {
                      setInviteName(candidate.name);
                      setInviteEmail(candidate.email);
                      if (candidate.roleHint === 'doctor' || candidate.roleHint === 'caregiver') {
                        setInviteRole(candidate.roleHint);
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-surface-gray dark:hover:bg-zinc-800"
                  >
                    <div>
                      <p className="text-xs font-black text-foreground">{candidate.name}</p>
                      <p className="text-[10px] font-semibold text-text-light">{candidate.email}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      {candidate.roleHint}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-xl border border-border-gray bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all focus:border-secondary dark:border-zinc-700 dark:bg-zinc-900"
            />

            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-border-gray bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all focus:border-secondary dark:border-zinc-700 dark:bg-zinc-900"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleInviteByEmail} disabled={sendingInvite}>
                <UserPlus2 className="mr-2 h-4 w-4" />
                {sendingInvite ? 'Sending…' : 'Send Invite'}
              </Button>
              <Button variant="outline" onClick={handleCreateLinkInvite} disabled={creatingLink}>
                <Link2 className="mr-2 h-4 w-4" />
                {creatingLink ? 'Creating…' : 'Create Link'}
              </Button>
            </div>

            {generatedInviteLink && (
              <div className="flex items-center gap-2 rounded-xl border border-border-gray bg-background p-2 dark:border-zinc-700 dark:bg-zinc-900">
                <input
                  readOnly
                  value={generatedInviteLink}
                  className="flex-1 bg-transparent px-2 text-xs font-semibold text-foreground outline-none"
                />
                <Button variant="outline" size="sm" onClick={handleCopyGeneratedLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading photos...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No photos yet. Upload your first photo!</div>
        ) : (
          <Tabs defaultValue={months[0]} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(months.length, 6)}, 1fr)` }}>
              {months.map((month) => (
                <TabsTrigger key={month} value={month} className="text-xs">
                  {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </TabsTrigger>
              ))}
            </TabsList>

            {months.map((month) => (
              <TabsContent key={month} value={month} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {photosByMonth[month].map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square"
                    >
                      <img
                        src={photo.url}
                        alt={photo.description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id, photo.storage_key || '')}
                        >
                          Delete
                        </Button>
                      </div>
                      {photo.is_monthly_milestone && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                          Monthly
                        </div>
                      )}
                      {photo.age_days && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                          {photo.age_days} days
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
