import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  CheckCircle2,
  ChevronLeft,
  MessageCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Stethoscope,
  UserCheck2,
  UserPlus2,
  Users,
} from 'lucide-react';
import {
  acceptIncomingSharingInvite,
  getIncomingSharingInvites,
  type FamilySharingInvite,
} from '@/lib/family-sharing-service';
import {
  getDoctorAssignedBabies,
  getOwnDoctorProfile,
  saveDoctorProfile,
  type DoctorAssignedBaby,
  type DoctorProfile,
} from '@/lib/doctor-api';
import { useAuthStore } from '@/app/AppContext';
import { CareTeamChat } from './CareTeamChat';
import { getDefaultAvatar } from '@/lib/baby-utils';
import type { Baby } from '@/types';

interface PatientAssignmentsProps {
  onBack?: () => void;
}

type DoctorProfileFormState = {
  fullName: string;
  specialization: string;
  qualification: string;
  licenseNumber: string;
  medicalBoard: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  bio: string;
  yearsOfExperience: string;
  languagesSpoken: string;
  consultationFee: string;
  availabilityHours: string;
};

const roleLabel: Record<string, string> = {
  doctor: 'Doctor',
  caregiver: 'Caregiver',
  viewer: 'Viewer',
  editor: 'Editor',
  owner: 'Owner',
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const formatAvailabilityHours = (value?: Record<string, string | null> | null): string => {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return Object.entries(value)
    .map(([day, hours]) => `${day}: ${hours || 'Unavailable'}`)
    .join('\n');
};

const parseAvailabilityHours = (value: string): Record<string, string | null> | null => {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const availability = Object.fromEntries(
    lines.map((line) => {
      const [day, ...rest] = line.split(':');
      const normalizedDay = day.trim().toLowerCase().replace(/\s+/g, '_');
      return [normalizedDay, rest.join(':').trim() || null];
    }),
  );

  return Object.keys(availability).length > 0 ? availability : null;
};

const buildDoctorProfileForm = (
  user: any,
  profile?: DoctorProfile | null,
): DoctorProfileFormState => ({
  fullName:
    profile?.full_name ||
    user?.user_metadata?.doctor_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '',
  specialization: profile?.specialization || user?.user_metadata?.doctor_specialty || '',
  qualification: profile?.qualification || '',
  licenseNumber: profile?.license_number || '',
  medicalBoard: profile?.medical_board || '',
  clinicName: profile?.clinic_name || '',
  clinicAddress: profile?.clinic_address || '',
  clinicPhone: profile?.clinic_phone || '',
  clinicEmail: profile?.clinic_email || user?.email || '',
  bio: profile?.bio || '',
  yearsOfExperience:
    profile?.years_of_experience !== undefined && profile?.years_of_experience !== null
      ? String(profile.years_of_experience)
      : '',
  languagesSpoken: profile?.languages_spoken?.join(', ') || 'English',
  consultationFee:
    profile?.consultation_fee !== undefined && profile?.consultation_fee !== null
      ? String(profile.consultation_fee)
      : '',
  availabilityHours: formatAvailabilityHours(profile?.availability_hours),
});

const resolveInviteBabyName = (invite: FamilySharingInvite) =>
  invite.baby_name_snapshot?.trim() || `Baby ${invite.baby_id.slice(0, 8)}`;

const resolveInviteBabyAvatar = (invite: FamilySharingInvite): string => {
  const name = resolveInviteBabyName(invite);
  return invite.baby_photo_url_snapshot || getDefaultAvatar(undefined, name);
};

const resolveDoctorPatientAvatar = (patient: DoctorAssignedBaby): string =>
  patient.babyPhotoUrl || getDefaultAvatar(undefined, patient.babyName);

const toBabyFromDoctorPatient = (patient: DoctorAssignedBaby): Baby => ({
  id: patient.babyId,
  name: patient.babyName,
  dateOfBirth: patient.babyDateOfBirth || patient.babyCreatedAt || new Date().toISOString(),
  gender:
    patient.babyGender === 'boy' || patient.babyGender === 'girl' || patient.babyGender === 'other'
      ? patient.babyGender
      : 'other',
  photoUrl: patient.babyPhotoUrl || undefined,
  country: patient.babyCountry || 'US',
  createdAt: patient.babyCreatedAt || new Date().toISOString(),
});

export function PatientAssignments({ onBack }: PatientAssignmentsProps) {
  const { user, babies, currentBaby, setCurrentBaby, refreshBabies } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<FamilySharingInvite[]>([]);
  const [assignedInvites, setAssignedInvites] = useState<FamilySharingInvite[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<DoctorAssignedBaby[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [doctorProfileForm, setDoctorProfileForm] = useState<DoctorProfileFormState>(() =>
    buildDoctorProfileForm(user),
  );
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [chatBabyId, setChatBabyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    'baby';

  const isDoctor = profileType === 'doctor';
  const isCareTeamUser = isDoctor || profileType === 'caregiver';

  const heading = useMemo(() => {
    if (profileType === 'doctor') return 'My Patients';
    if (profileType === 'caregiver') return 'Assigned Babies';
    return 'Shared Baby Profiles';
  }, [profileType]);

  const loadAssignments = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isDoctor) {
        const [pending, patients, profile] = await Promise.all([
          getIncomingSharingInvites('pending'),
          getDoctorAssignedBabies(),
          getOwnDoctorProfile(),
        ]);

        setPendingInvites(pending.filter((invite) => invite.role === 'doctor'));
        setAssignedInvites([]);
        setDoctorPatients(patients);
        setDoctorProfile(profile);
        setDoctorProfileForm(buildDoctorProfileForm(user, profile));
      } else {
        const [pending, assigned] = await Promise.all([
          getIncomingSharingInvites('pending'),
          getIncomingSharingInvites('accepted'),
        ]);

        setPendingInvites(pending);
        setAssignedInvites(assigned);
        setDoctorPatients([]);
        setDoctorProfile(null);
      }
    } catch (error: any) {
      console.error('Failed to load patient assignments:', error);
      setErrorMessage(error?.message || 'Failed to load your assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, [isDoctor, user?.id]);

  useEffect(() => {
    const availableChatIds = isDoctor
      ? doctorPatients.map((patient) => patient.babyId)
      : assignedInvites.map((invite) => invite.baby_id);

    if (availableChatIds.length === 0) {
      setChatBabyId(null);
      return;
    }

    setChatBabyId((previous) => {
      if (previous && availableChatIds.includes(previous)) {
        return previous;
      }

      if (currentBaby?.id && availableChatIds.includes(currentBaby.id)) {
        return currentBaby.id;
      }

      return availableChatIds[0];
    });
  }, [assignedInvites, currentBaby?.id, doctorPatients, isDoctor]);

  const activateBaby = (baby: Baby, successMessage: string) => {
    setCurrentBaby(baby);
    setChatBabyId(baby.id);
    setStatusMessage(successMessage);
    setErrorMessage(null);
  };

  const handleActivateInviteBaby = (invite: FamilySharingInvite) => {
    const matchedBaby = babies.find((baby) => baby.id === invite.baby_id);
    activateBaby(
      matchedBaby || {
        id: invite.baby_id,
        name: resolveInviteBabyName(invite),
        dateOfBirth: invite.created_at || new Date().toISOString(),
        gender: 'other',
        photoUrl: invite.baby_photo_url_snapshot || undefined,
        country: 'US',
        createdAt: invite.created_at || new Date().toISOString(),
      },
      `${resolveInviteBabyName(invite)} is now your active profile.`,
    );
  };

  const handleActivateDoctorPatient = (patient: DoctorAssignedBaby) => {
    const matchedBaby = babies.find((baby) => baby.id === patient.babyId);
    activateBaby(
      matchedBaby || toBabyFromDoctorPatient(patient),
      `${patient.babyName} is now your active patient.`,
    );
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setAcceptingInviteId(inviteId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const acceptedInvite = await acceptIncomingSharingInvite(inviteId);
      if (!acceptedInvite) {
        throw new Error('The invite could not be accepted.');
      }

      await refreshBabies();
      await loadAssignments();

      if (isDoctor && !doctorProfile) {
        setStatusMessage('Invite accepted. Save your doctor profile to activate full doctor access for this patient.');
      } else {
        setStatusMessage('Invite accepted and patient access refreshed.');
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to accept invite.');
    } finally {
      setAcceptingInviteId(null);
    }
  };

  const handleSaveDoctorProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (
        !doctorProfileForm.fullName.trim() ||
        !doctorProfileForm.specialization.trim() ||
        !doctorProfileForm.qualification.trim() ||
        !doctorProfileForm.licenseNumber.trim()
      ) {
        throw new Error('Full name, specialization, qualification, and license number are required.');
      }

      const savedProfile = await saveDoctorProfile({
        fullName: doctorProfileForm.fullName.trim(),
        specialization: doctorProfileForm.specialization.trim(),
        qualification: doctorProfileForm.qualification.trim(),
        licenseNumber: doctorProfileForm.licenseNumber.trim(),
        medicalBoard: doctorProfileForm.medicalBoard.trim() || undefined,
        clinicName: doctorProfileForm.clinicName.trim() || undefined,
        clinicAddress: doctorProfileForm.clinicAddress.trim() || undefined,
        clinicPhone: doctorProfileForm.clinicPhone.trim() || undefined,
        clinicEmail: doctorProfileForm.clinicEmail.trim() || undefined,
        bio: doctorProfileForm.bio.trim() || undefined,
        yearsOfExperience: doctorProfileForm.yearsOfExperience.trim()
          ? Number(doctorProfileForm.yearsOfExperience)
          : null,
        languagesSpoken: doctorProfileForm.languagesSpoken
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        consultationFee: doctorProfileForm.consultationFee.trim()
          ? Number(doctorProfileForm.consultationFee)
          : null,
        availabilityHours: parseAvailabilityHours(doctorProfileForm.availabilityHours),
      });

      setDoctorProfile(savedProfile);
      setDoctorProfileForm(buildDoctorProfileForm(user, savedProfile));
      await refreshBabies();
      await loadAssignments();
      setStatusMessage('Doctor profile saved and patient assignments refreshed.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to save doctor profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-10 text-center">
        <p className="text-sm font-semibold text-text-light">Loading your assigned profiles...</p>
      </div>
    );
  }

  const selectedDoctorPatient = doctorPatients.find((patient) => patient.babyId === chatBabyId) || null;
  const selectedInviteForChat = assignedInvites.find((invite) => invite.baby_id === chatBabyId) || null;
  const selectedChatTarget = isDoctor
    ? selectedDoctorPatient
      ? { babyId: selectedDoctorPatient.babyId, babyName: selectedDoctorPatient.babyName }
      : null
    : selectedInviteForChat
      ? { babyId: selectedInviteForChat.baby_id, babyName: resolveInviteBabyName(selectedInviteForChat) }
      : null;
  const assignedCount = isDoctor ? doctorPatients.length : assignedInvites.length;
  const careTeamStats = [
    { label: 'Assigned', value: assignedCount },
    { label: 'Pending', value: pendingInvites.length },
    {
      label: isDoctor ? 'Profile' : 'Active baby',
      value: isDoctor ? (doctorProfile ? 'Ready' : 'Needed') : currentBaby ? 'Set' : 'Choose',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/85 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-sky-200/70 blur-3xl dark:bg-sky-500/10" />
        <CardHeader className="relative space-y-5 p-6 sm:p-8">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-fit px-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.9fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
                {isDoctor ? <Stethoscope className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                {isDoctor ? 'Doctor workspace' : 'Caregiver workspace'}
              </div>
              <CardTitle className="max-w-xl text-3xl font-headline font-black tracking-[-0.05em] text-foreground sm:text-4xl">
                {heading}
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-text-dim">
                {isDoctor
                  ? 'Complete your doctor profile, accept doctor invites, and activate shared patients for the medical workspace.'
                  : 'Accept shared baby profiles to add them to your list.'}
              </CardDescription>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {careTeamStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-slate-200/80 bg-white/75 px-3 py-4 text-center shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-text-light">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-headline font-black text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={loadAssignments} className="col-span-3 h-11 rounded-2xl">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh assignments
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {statusMessage && (
        <Card className="border border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30">
          <CardContent className="py-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="border border-rose-500/30 bg-rose-500/5 dark:border-rose-400/30">
          <CardContent className="py-4 text-sm font-medium text-rose-700 dark:text-rose-300">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {isDoctor && (
        <Card className="border border-border-gray dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              Doctor Profile
            </CardTitle>
            <CardDescription>
              This feeds the real `/api/doctor/profile` record and unlocks patient assignments for doctor-only tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {doctorProfile ? 'Profile on file' : 'Profile needed'}
              </Badge>
              <Badge
                className={
                  doctorProfile?.is_verified
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                }
              >
                {doctorProfile?.is_verified ? 'Verified' : 'Pending verification'}
              </Badge>
            </div>

            <form onSubmit={handleSaveDoctorProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Full name</span>
                  <Input
                    value={doctorProfileForm.fullName}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, fullName: event.target.value }))
                    }
                    placeholder="Dr. Jane Doe"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Specialization</span>
                  <Input
                    value={doctorProfileForm.specialization}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, specialization: event.target.value }))
                    }
                    placeholder="Pediatrics"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Qualification</span>
                  <Input
                    value={doctorProfileForm.qualification}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, qualification: event.target.value }))
                    }
                    placeholder="MD, Pediatrics"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>License number</span>
                  <Input
                    value={doctorProfileForm.licenseNumber}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, licenseNumber: event.target.value }))
                    }
                    placeholder="MED-123456"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Medical board</span>
                  <Input
                    value={doctorProfileForm.medicalBoard}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, medicalBoard: event.target.value }))
                    }
                    placeholder="Medical Council"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Years of experience</span>
                  <Input
                    type="number"
                    min="0"
                    value={doctorProfileForm.yearsOfExperience}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, yearsOfExperience: event.target.value }))
                    }
                    placeholder="8"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Clinic name</span>
                  <Input
                    value={doctorProfileForm.clinicName}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, clinicName: event.target.value }))
                    }
                    placeholder="Sunrise Pediatrics"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Clinic email</span>
                  <Input
                    type="email"
                    value={doctorProfileForm.clinicEmail}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, clinicEmail: event.target.value }))
                    }
                    placeholder="doctor@clinic.com"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Clinic phone</span>
                  <Input
                    value={doctorProfileForm.clinicPhone}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, clinicPhone: event.target.value }))
                    }
                    placeholder="+1 555 123 4567"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light">
                  <span>Consultation fee</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={doctorProfileForm.consultationFee}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, consultationFee: event.target.value }))
                    }
                    placeholder="75"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light md:col-span-2">
                  <span>Clinic address</span>
                  <Input
                    value={doctorProfileForm.clinicAddress}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, clinicAddress: event.target.value }))
                    }
                    placeholder="123 Clinic St, City, State"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light md:col-span-2">
                  <span>Languages spoken</span>
                  <Input
                    value={doctorProfileForm.languagesSpoken}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, languagesSpoken: event.target.value }))
                    }
                    placeholder="English, Spanish"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light md:col-span-2">
                  <span>Availability hours</span>
                  <Textarea
                    value={doctorProfileForm.availabilityHours}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, availabilityHours: event.target.value }))
                    }
                    placeholder={'monday: 09:00-17:00\ntuesday: 09:00-17:00'}
                    className="min-h-[96px]"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-text-light md:col-span-2">
                  <span>Professional bio</span>
                  <Textarea
                    value={doctorProfileForm.bio}
                    onChange={(event) =>
                      setDoctorProfileForm((previous) => ({ ...previous, bio: event.target.value }))
                    }
                    placeholder="Short introduction for parents and staff."
                    className="min-h-[120px]"
                  />
                </label>
              </div>

              <Button type="submit" disabled={savingProfile}>
                <Save className="mr-2 h-4 w-4" />
                {savingProfile ? 'Saving profile...' : 'Save Doctor Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
          <TabsTrigger value="assigned">
            My List ({isDoctor ? doctorPatients.length : assignedInvites.length})
          </TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-4 space-y-3">
          {isDoctor ? (
            doctorPatients.length === 0 ? (
              <Card className="rounded-[2rem] border border-dashed border-sky-300/70 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-950/20">
                <CardContent className="py-8 text-center">
                  <Stethoscope className="mx-auto h-7 w-7 text-sky-600 dark:text-sky-300" />
                  <p className="mt-3 text-sm font-headline font-black text-foreground">No active patients yet.</p>
                  <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                    Save your doctor profile, then accept a doctor invite to activate patients here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              doctorPatients.map((patient) => (
                <Card key={patient.babyId} className="border border-border-gray dark:border-zinc-800">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900">
                          <img
                            src={resolveDoctorPatientAvatar(patient)}
                            alt={`${patient.babyName} avatar`}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src = getDefaultAvatar(undefined, patient.babyName);
                            }}
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-bold text-foreground">{patient.babyName}</p>
                          <p className="text-xs text-text-light">
                            DOB {formatDate(patient.babyDateOfBirth)}{patient.parentEmail ? ` · ${patient.parentEmail}` : ''}
                          </p>
                          {patient.assignmentReason && (
                            <p className="text-xs text-text-light">{patient.assignmentReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Doctor</Badge>
                        {currentBaby?.id === patient.babyId && (
                          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleActivateDoctorPatient(patient)}>
                          <UserCheck2 className="mr-2 h-4 w-4" />
                          Use Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChatBabyId(patient.babyId)}
                          className="h-9"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : assignedInvites.length === 0 ? (
            <Card className="rounded-[2rem] border border-dashed border-emerald-300/70 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-950/20">
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                <p className="mt-3 text-sm font-headline font-black text-foreground">No assigned profiles yet.</p>
                <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                  When a parent shares a baby profile with you, it will appear here as a simple care card.
                </p>
              </CardContent>
            </Card>
          ) : (
            assignedInvites.map((invite) => (
              <Card key={invite.id} className="border border-border-gray dark:border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900">
                        <img
                          src={resolveInviteBabyAvatar(invite)}
                          alt={`${resolveInviteBabyName(invite)} avatar`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = getDefaultAvatar(undefined, resolveInviteBabyName(invite));
                          }}
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-bold text-foreground">{resolveInviteBabyName(invite)}</p>
                        <p className="text-xs text-text-light">Shared on {formatDate(invite.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{roleLabel[invite.role] || invite.role}</Badge>
                      {currentBaby?.id === invite.baby_id && (
                        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleActivateInviteBaby(invite)}>
                        <UserCheck2 className="mr-2 h-4 w-4" />
                        Use Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatBabyId(invite.baby_id)}
                        className="h-9"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingInvites.length === 0 ? (
            <Card className="rounded-[2rem] border border-dashed border-border-gray bg-surface/70 dark:border-zinc-800">
              <CardContent className="py-8 text-center">
                <UserPlus2 className="mx-auto h-7 w-7 text-text-light" />
                <p className="mt-3 text-sm font-headline font-black text-foreground">No pending shares.</p>
                <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
                  New invitations sent to this email will wait here for approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingInvites.map((invite) => (
              <Card key={invite.id} className="border border-border-gray dark:border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900">
                        <img
                          src={resolveInviteBabyAvatar(invite)}
                          alt={`${resolveInviteBabyName(invite)} avatar`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = getDefaultAvatar(undefined, resolveInviteBabyName(invite));
                          }}
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-bold text-foreground">{resolveInviteBabyName(invite)}</p>
                        <p className="text-xs text-text-light">Role: {roleLabel[invite.role] || invite.role}</p>
                        <p className="text-xs text-text-light">Shared on {formatDate(invite.created_at)}</p>
                      </div>
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

      {selectedChatTarget && (
        <CareTeamChat babyId={selectedChatTarget.babyId} babyName={selectedChatTarget.babyName} />
      )}
    </div>
  );
}
