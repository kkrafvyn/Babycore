import React, { useState } from 'react';
import { ChevronLeft, Bell, Plus, Trash2, Edit2, LogOut, Ruler, Download, ChevronRight, Moon, Sun, Monitor, Clock, X, Check, Globe, Users, Activity, Lock, Shield, Scale, Stethoscope, Search, Link2, Copy, UserPlus2, RefreshCw } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { addBaby, deleteBaby, updateBaby } from '../../lib/supabase-storage';
import { getDefaultAvatar, getBabyAge, getUserAvatar } from '../../lib/baby-utils';
import {
  getLanguageDisplayName,
  getLanguageOptions,
  i18nT,
  i18nInstance,
  isValidLocaleCode,
  normalizeLanguageCode,
  type SupportedLanguage,
} from '../../lib/i18n';
import { NotificationsManager, type RemotePushStatus } from '../../lib/notifications';
import { toast } from 'sonner';
import { COUNTRIES } from '../../lib/countries';
import {
  createPublicFamilyInviteLink,
  searchCareTeamCandidates,
  sendFamilySharingInvite,
  type CareTeamSearchCandidate,
  type FamilySharingRole,
} from '../../lib/family-sharing-service';
import {
  deriveSettingsFromCareProfile,
  getCareProfileBadges,
  getCareProfileSummary,
  normalizeCareProfile,
  type CareProfileRole,
} from '../../lib/care-profile';
import { getCountryCareDefaults } from '../../lib/country-care-defaults';
import { CareProfileEditorModal } from './CareProfileEditorModal';
import { updateCurrentUserMetadata } from '../../lib/supabase';

const MotionDiv = motion.div as any;

const getRemotePushStatusCopy = (status: RemotePushStatus | null): { badge: string; detail: string } => {
  if (!status) {
    return {
      badge: 'Checking',
      detail: 'Looking up whether this device can receive remote push alerts.',
    };
  }

  if (status.subscribed) {
    return {
      badge: 'Remote Push Active',
      detail: 'Remote reminders are linked to this device and can arrive even when BabyLog is closed.',
    };
  }

  switch (status.reason) {
    case 'native-disabled':
      return {
        badge: 'Local Only',
        detail: 'Native remote push is not configured for this build yet, so reminders stay on this device for now.',
      };
    case 'vapid-missing':
      return {
        badge: 'Web Push Not Configured',
        detail: 'Browser push keys are missing, so remote web notifications cannot be enabled in this environment yet.',
      };
    case 'install-required':
      return {
        badge: 'Install Required',
        detail: 'Install BabyLog to your home screen on iPhone or iPad before enabling remote push.',
      };
    case 'permission-denied':
      return {
        badge: 'Permission Blocked',
        detail: 'Browser or system notification permission is blocked for BabyLog. Re-enable it in settings to use remote push.',
      };
    case 'service-worker-unavailable':
    case 'push-manager-unavailable':
    case 'unsupported':
      return {
        badge: 'Unsupported',
        detail: 'This device/browser can still use in-app reminders, but remote push is not available here.',
      };
    default:
      return {
        badge: status.available ? 'Ready to Enable' : 'Local Only',
        detail: status.available
          ? 'This device supports remote push. Turn it on to keep reminders synced beyond the current browser session.'
          : 'Local reminders are available, but remote push could not be prepared on this device.',
      };
  }
};

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  showBackButton?: boolean;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
}

type AdminAccountMode = 'admin' | 'child_profile';

const PRIMARY_ADMIN_EMAIL = 'ponk3020@gmail.com';

const normalizeAdminEmail = (email?: string | null) => (email || '').trim().toLowerCase();

const decodeLegacyUtf8 = (value: string): string => {
  if (!/[\u00C3\u00E2]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onLogout,
  showBackButton = true,
  isAdmin = false,
  onOpenAdminPanel,
}) => {
  const { babies, currentBaby, settings, updateSettings, user, refreshBabies, refreshUser } = useAppContext();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showEditBaby, setShowEditBaby] = useState(false);
  const [editBabyName, setEditBabyName] = useState('');
  const [editBabyDob, setEditBabyDob] = useState('');
  const [editBabyGender, setEditBabyGender] = useState<'boy' | 'girl' | 'other' | undefined>();
  const [editBabyCountry, setEditBabyCountry] = useState('');
  const [editBabyId, setEditBabyId] = useState('');
  const [showLangSettings, setShowLangSettings] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [careRole, setCareRole] = useState<Extract<FamilySharingRole, 'caregiver' | 'doctor'>>('caregiver');
  const [careQuery, setCareQuery] = useState('');
  const [careCandidates, setCareCandidates] = useState<CareTeamSearchCandidate[]>([]);
  const [searchingCareCandidates, setSearchingCareCandidates] = useState(false);
  const [careInviteName, setCareInviteName] = useState('');
  const [careInviteEmail, setCareInviteEmail] = useState('');
  const [sendingCareInvite, setSendingCareInvite] = useState(false);
  const [creatingCareLink, setCreatingCareLink] = useState(false);
  const [careInviteLink, setCareInviteLink] = useState('');
  const [showCareProfileEditor, setShowCareProfileEditor] = useState(false);
  const [savingCareProfile, setSavingCareProfile] = useState(false);
  const [remotePushStatus, setRemotePushStatus] = useState<RemotePushStatus | null>(null);
  const [togglingRemotePush, setTogglingRemotePush] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [savingAdminAccountMode, setSavingAdminAccountMode] = useState(false);
  const profilePhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const accountProfileType: CareProfileRole =
    (user?.user_metadata?.onboarding_profile_type as CareProfileRole | undefined) || 'baby';
  const isPrimaryAdminAccount = normalizeAdminEmail(user?.email) === PRIMARY_ADMIN_EMAIL;
  const canManageAdminAccountMode = isPrimaryAdminAccount;
  const adminAccountMode: AdminAccountMode =
    user?.user_metadata?.admin_account_mode === 'child_profile' ? 'child_profile' : 'admin';
  const adminModeActive = canManageAdminAccountMode && adminAccountMode === 'admin';
  const profileDisplayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.doctor_name ||
    user?.user_metadata?.caregiver_name ||
    'Parent';
  const profilePhotoUrl =
    user?.user_metadata?.profile_photo_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const handleProfilePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePhoto(true);
    try {
      const photoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error || new Error('Could not read image'));
        reader.readAsDataURL(file);
      });

      await updateCurrentUserMetadata({
        avatar_url: photoUrl,
        profile_photo_url: photoUrl,
        picture: photoUrl,
      });
      await refreshUser();
      toast.success('Profile photo updated.');
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      toast.error('Could not update profile photo.');
    } finally {
      setUploadingProfilePhoto(false);
      event.target.value = '';
    }
  };

  const handleUnitChange = async (unit: 'metric' | 'imperial') => {
    await updateSettings({ units: unit });
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateSettings({ theme });
  };

  const handleLanguageSelect = async (code: string) => {
    const normalized = normalizeLanguageCode(code);
    i18nInstance.setLanguage(normalized as SupportedLanguage);
    await updateSettings({ language: normalized });
    setLanguageQuery('');
    setShowLangSettings(false);
    window.location.reload();
  };

  const handleDeleteBaby = async () => {
    if (!deleteTarget || deleting) return;

    const target = deleteTarget;
    setDeleting(target.id);
    try {
      await deleteBaby(target.id);
      await refreshBabies();
      if (editBabyId === target.id) {
        setShowEditBaby(false);
        setEditBabyId('');
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      toast.success(`${target.name} deleted.`);
    } catch (error) {
      console.error('Failed to delete baby', error);
      toast.error('Could not delete baby. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const openDeleteBabyConfirm = (baby: { id: string; name: string }) => {
    setDeleteTarget({
      id: baby.id,
      name: baby.name?.trim() || 'this baby',
    });
    setShowDeleteConfirm(true);
  };

  const handleNotificationToggle = async () => {
    const isEnabled = !settings?.notificationsEnabled;
    if (isEnabled) {
      const permissionGranted = await NotificationsManager.requestPermission();
      await updateSettings({ notificationsEnabled: true });
      const nextRemoteStatus = await NotificationsManager.getRemotePushStatus();
      setRemotePushStatus(nextRemoteStatus);

      if (permissionGranted) {
        toast.success('Local reminders enabled.');
      } else {
        toast('Local reminders are on, but system notification permissions are limited on this device.');
      }
      return;
    } else {
      await NotificationsManager.unsubscribeFromPush();
    }
    await updateSettings({ notificationsEnabled: false });
    const nextRemoteStatus = await NotificationsManager.getRemotePushStatus();
    setRemotePushStatus(nextRemoteStatus);
  };

  const syncRemotePushStatus = React.useCallback(async () => {
    const nextStatus = await NotificationsManager.getRemotePushStatus();
    setRemotePushStatus(nextStatus);
    return nextStatus;
  }, []);

  React.useEffect(() => {
    void syncRemotePushStatus();
  }, [syncRemotePushStatus, settings?.notificationsEnabled]);

  const handleRemotePushToggle = async () => {
    setTogglingRemotePush(true);

    try {
      let nextStatus = remotePushStatus;

      if (!settings?.notificationsEnabled) {
        const permissionGranted = await NotificationsManager.requestPermission();
        await updateSettings({ notificationsEnabled: true });
        if (!permissionGranted) {
          toast('System permissions are limited on this device, but BabyLog will still keep in-app reminders active.');
        }
      }

      if (remotePushStatus?.subscribed) {
        await NotificationsManager.unsubscribeFromPush();
        nextStatus = await syncRemotePushStatus();
        toast.success('Remote push disabled for this device.');
        return;
      }

      const subscription = await NotificationsManager.subscribeToPush();
      nextStatus = await syncRemotePushStatus();

      if (subscription && nextStatus.subscribed) {
        toast.success('Remote push enabled for this device.');
        return;
      }

      const copy = getRemotePushStatusCopy(nextStatus);
      toast(copy.detail);
    } finally {
      setTogglingRemotePush(false);
    }
  };

  const handleBiometricToggle = async () => {
    const isEnabled = !settings?.biometricLockEnabled;
    if (isEnabled) {
      const hasWebAuthn =
        typeof window !== 'undefined' &&
        'PublicKeyCredential' in window &&
        typeof window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

      if (!hasWebAuthn) {
        toast.error('Biometric authentication is not supported on this device/browser.');
        return;
      }

      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error('Biometric hardware was not detected on this device.');
        return;
      }
    }
    await updateSettings({ biometricLockEnabled: isEnabled });
  };

  const handleSaveCareProfile = async (profile: React.ComponentProps<typeof CareProfileEditorModal>['initialProfile']) => {
    const normalizedProfile = normalizeCareProfile(accountProfileType, profile);
    const personalizedDefaults = deriveSettingsFromCareProfile(accountProfileType, normalizedProfile);

    setSavingCareProfile(true);
    try {
      await updateSettings({
        careProfilePreferences: normalizedProfile,
        feedingInterval: personalizedDefaults.feedingInterval,
        reminderPreferences: {
          ...(settings?.reminderPreferences || {}),
          ...(personalizedDefaults.reminderPreferences || {}),
        },
      });
      setShowCareProfileEditor(false);
      toast.success('Care plan updated.');
    } finally {
      setSavingCareProfile(false);
    }
  };

  const openEditBaby = (baby: any) => {
    setEditBabyId(baby.id);
    setEditBabyName(baby.name);
    setEditBabyDob(baby.dateOfBirth?.split('T')[0] || '');
    setEditBabyGender(baby.gender);
    setEditBabyCountry(baby.country || '');
    setShowEditBaby(true);
  };

  const openAddBaby = () => {
    setEditBabyId('');
    setEditBabyName('');
    setEditBabyDob('');
    setEditBabyGender('other');
    setEditBabyCountry(babies[0]?.country || 'US');
    setShowEditBaby(true);
  };

  const handleAdminAccountModeChange = async (mode: AdminAccountMode) => {
    if (!canManageAdminAccountMode) {
      toast.error('Only the primary admin account can change this mode.');
      return;
    }

    if (mode === adminAccountMode) {
      if (mode === 'child_profile' && babies.length === 0) {
        openAddBaby();
      }
      return;
    }

    setSavingAdminAccountMode(true);
    try {
      await updateCurrentUserMetadata({
        admin_account_mode: mode,
        ...(mode === 'child_profile' ? { onboarding_profile_type: 'baby' } : {}),
      });
      await refreshUser();

      if (mode === 'child_profile' && babies.length === 0) {
        openAddBaby();
      }

      toast.success(
        mode === 'child_profile'
          ? 'Child profile mode is ready. Add a child profile to test the app.'
          : 'Admin mode is active.'
      );

      if (mode === 'admin' && isAdmin && onOpenAdminPanel) {
        onOpenAdminPanel();
      }
    } catch (error) {
      console.error('Failed to update admin account mode:', error);
      toast.error('Could not update admin account mode.');
    } finally {
      setSavingAdminAccountMode(false);
    }
  };

  const handleSaveBaby = async () => {
    if (!editBabyName.trim()) {
      toast.error('Baby name is required');
      return;
    }

    if (!editBabyDob) {
      toast.error('Date of birth is required');
      return;
    }

    if (!editBabyCountry) {
      toast.error('Country is required');
      return;
    }

    if (editBabyId) {
      const baby = babies.find(b => b.id === editBabyId);
      if (!baby) return;

      await updateBaby({
        ...baby,
        name: editBabyName.trim(),
        dateOfBirth: editBabyDob,
        gender: editBabyGender,
        country: editBabyCountry,
      });
    } else {
      await addBaby({
        id: crypto.randomUUID(),
        name: editBabyName.trim(),
        dateOfBirth: editBabyDob,
        gender: editBabyGender || 'other',
        country: editBabyCountry,
        createdAt: new Date().toISOString(),
      });
    }

    await refreshBabies();
    setShowEditBaby(false);
    toast.success(editBabyId ? 'Baby profile updated' : 'Baby profile added');
  };

  const countryOptions = (COUNTRIES as Array<{ code: string; name: string }>).map((country) => ({
    code: country.code,
    name: decodeLegacyUtf8(country.name),
  }));
  const currentLanguageCode = i18nInstance.getLanguage();
  const currentCountryDefaults = currentBaby ? getCountryCareDefaults(currentBaby.country) : null;
  const currentCountryName =
    currentBaby &&
    countryOptions.find((country) => country.code === currentBaby.country)?.name;
  const careProfileSummary = getCareProfileSummary(accountProfileType, settings?.careProfilePreferences);
  const careProfileBadges = getCareProfileBadges(accountProfileType, settings?.careProfilePreferences);
  const remotePushCopy = getRemotePushStatusCopy(remotePushStatus);
  const languageOptions = React.useMemo(
    () => getLanguageOptions(languageQuery, currentLanguageCode),
    [languageQuery, currentLanguageCode],
  );
  const normalizedCustomLanguage = normalizeLanguageCode(languageQuery);
  const canUseCustomLanguage =
    languageQuery.trim().length > 0 &&
    isValidLocaleCode(normalizedCustomLanguage) &&
    !languageOptions.some((option) => option.code.toLowerCase() === normalizedCustomLanguage.toLowerCase());

  React.useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const query = careQuery.trim();
      if (query.length < 2 || !showCareTeamModal) {
        setCareCandidates([]);
        return;
      }

      setSearchingCareCandidates(true);
      const matches = await searchCareTeamCandidates(query);
      setCareCandidates(matches);
      setSearchingCareCandidates(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [careQuery, showCareTeamModal]);

  const openCareTeamModal = (role: Extract<FamilySharingRole, 'caregiver' | 'doctor'>) => {
    setCareRole(role);
    setCareQuery('');
    setCareCandidates([]);
    setCareInviteName('');
    setCareInviteEmail('');
    setCareInviteLink('');
    setShowCareTeamModal(true);
  };

  const handleSendCareInvite = async () => {
    if (!user?.id) {
      toast.error('Please login again to send invite.');
      return;
    }

    const targetBaby = currentBaby || babies[0];
    if (!targetBaby) {
      toast.error('Add a baby profile first before inviting care team members.');
      return;
    }

    if (!careInviteEmail.trim()) {
      toast.error('Enter an email address first.');
      return;
    }

    setSendingCareInvite(true);
    const invite = await sendFamilySharingInvite(
      targetBaby.id,
      careInviteEmail.trim().toLowerCase(),
      careRole,
      user.id,
      {
        invitedName: careInviteName.trim() || undefined,
        babyNameSnapshot: targetBaby.name,
        babyPhotoUrlSnapshot: targetBaby.photoUrl,
      },
    );
    setSendingCareInvite(false);

    if (!invite) {
      toast.error('Could not send invite. Please try again.');
      return;
    }

    toast.success(`${careRole === 'doctor' ? 'Doctor' : 'Caregiver'} invite sent.`);
    setCareInviteName('');
    setCareInviteEmail('');
    setCareQuery('');
    setCareCandidates([]);
  };

  const handleCreateCareInviteLink = async () => {
    if (!user?.id) {
      toast.error('Please login again to create link.');
      return;
    }

    const targetBaby = currentBaby || babies[0];
    if (!targetBaby) {
      toast.error('Add a baby profile first before creating invite links.');
      return;
    }

    setCreatingCareLink(true);
    const payload = await createPublicFamilyInviteLink(targetBaby.id, careRole, user.id, {
      invitedName: careInviteName.trim() || undefined,
      babyNameSnapshot: targetBaby.name,
      babyPhotoUrlSnapshot: targetBaby.photoUrl,
      view: 'patients',
    });
    setCreatingCareLink(false);

    if (!payload?.inviteLink) {
      toast.error('Could not create invite link. Run latest database migrations and try again.');
      return;
    }

    setCareInviteLink(payload.inviteLink);
    await navigator.clipboard.writeText(payload.inviteLink);
    toast.success('Invite link copied to clipboard.');
  };

  const handleCopyCareInviteLink = async () => {
    if (!careInviteLink) return;
    await navigator.clipboard.writeText(careInviteLink);
    toast.success('Invite link copied.');
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-16 sm:h-20 px-3 sm:px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-3 sm:gap-4">
          {showBackButton ? (
            <button onClick={onBack} title="Go back" className="p-2 -ml-1 sm:-ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
              <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
            </button>
          ) : (
            <div className="w-2" />
          )}
          <span className="text-xl font-headline font-black text-foreground tracking-tight">
            {adminModeActive ? 'Admin Settings' : i18nT('screens.settings')}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 sm:pt-24 px-3 sm:px-6 pb-20">
        <div className="max-w-md mx-auto w-full space-y-8 sm:space-y-10">
           
           {adminModeActive ? (
             <div className="overflow-hidden rounded-[3rem] border border-secondary/25 bg-gradient-to-br from-secondary via-cyan-600 to-slate-950 p-6 text-white shadow-2xl shadow-secondary/20 sm:p-8">
               <div className="flex items-start justify-between gap-4">
                 <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/15 text-white shadow-xl backdrop-blur">
                   <Shield size={28} />
                 </div>
                 <span className="rounded-full bg-white/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                   Admin Mode
                 </span>
               </div>
               <div className="mt-8 space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100">
                   Primary Admin Console
                 </p>
                 <h2 className="font-headline text-3xl font-black tracking-tight sm:text-4xl">
                   Platform controls, not user profile.
                 </h2>
                 <p className="text-sm font-bold leading-relaxed text-cyan-50/85">
                   {PRIMARY_ADMIN_EMAIL} is locked as the primary admin. Child, family, and care-team setup stays hidden until you switch to Child Profile mode.
                 </p>
               </div>
               <div className="mt-6 flex flex-wrap gap-3">
                 {isAdmin && onOpenAdminPanel && (
                   <button
                     type="button"
                     onClick={onOpenAdminPanel}
                     className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-secondary shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                   >
                     <Shield size={14} />
                     Open Dashboard
                   </button>
                 )}
                 <button
                   type="button"
                   onClick={() => handleAdminAccountModeChange('child_profile')}
                   disabled={savingAdminAccountMode}
                   className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur transition-all hover:bg-white/20 disabled:opacity-60"
                 >
                   <Plus size={14} />
                   Child Profile
                 </button>
               </div>
             </div>
           ) : (
             <div className="card-onboarding text-center p-6 sm:p-12 bg-surface">
                <div className="relative mx-auto mb-5 h-20 w-20 rounded-[2rem] border-4 border-white bg-surface-gray shadow-2xl dark:border-zinc-900 dark:bg-zinc-800 sm:mb-8 sm:h-28 sm:w-28 sm:rounded-[2.5rem]">
                   <div className="h-full w-full overflow-hidden rounded-[1.55rem] sm:rounded-[2rem]">
                     <img
                       src={profilePhotoUrl || getUserAvatar(user?.email || profileDisplayName)}
                       alt="User"
                       onError={(event) => {
                         event.currentTarget.src = getUserAvatar(user?.email || profileDisplayName);
                       }}
                       className="h-full w-full object-cover"
                     />
                   </div>
                   <button
                     type="button"
                     onClick={() => profilePhotoInputRef.current?.click()}
                     disabled={uploadingProfilePhoto}
                     className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition-all hover:scale-105 disabled:opacity-60"
                     title="Update profile photo"
                   >
                     <Edit2 size={14} />
                   </button>
                   <input
                     ref={profilePhotoInputRef}
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={handleProfilePhotoSelect}
                   />
                </div>
                <h2 className="text-2xl sm:text-3xl font-headline font-black text-foreground tracking-tighter mb-2">{profileDisplayName}</h2>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 break-all">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  disabled={uploadingProfilePhoto}
                  className="rounded-full bg-surface-gray px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-secondary transition-all hover:bg-secondary hover:text-white disabled:opacity-60 dark:bg-zinc-800"
                >
                  {uploadingProfilePhoto ? 'Uploading...' : 'Change Photo'}
                </button>
             </div>
           )}

           {canManageAdminAccountMode && (
             <div className="rounded-[2rem] border border-secondary/20 bg-secondary/5 p-5 shadow-sm dark:border-cyan-900/40 dark:bg-cyan-950/20 sm:p-6">
               <div className="mb-4 flex items-start justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20">
                     <Shield size={20} />
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.22em] text-secondary">
                       Primary Admin
                     </p>
                     <h3 className="font-headline text-lg font-black text-foreground">
                       Account Mode
                     </h3>
                   </div>
                 </div>
                 <span className="rounded-full bg-white px-3 py-1 text-[8px] font-black uppercase tracking-widest text-secondary shadow-sm dark:bg-zinc-900">
                   Admin Locked
                 </span>
               </div>

               <p className="mb-4 text-xs font-bold leading-relaxed text-text-light">
                 {PRIMARY_ADMIN_EMAIL} stays a trusted admin. This switch only changes whether this account is testing the admin console or setting up a child profile.
               </p>

               <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-inner dark:bg-zinc-900">
                 <button
                   type="button"
                   onClick={() => handleAdminAccountModeChange('admin')}
                   disabled={savingAdminAccountMode}
                   className={`rounded-xl px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                     adminAccountMode === 'admin'
                       ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                       : 'text-text-light hover:bg-surface-gray dark:hover:bg-zinc-800'
                   } disabled:cursor-not-allowed disabled:opacity-60`}
                 >
                   Admin
                 </button>
                 <button
                   type="button"
                   onClick={() => handleAdminAccountModeChange('child_profile')}
                   disabled={savingAdminAccountMode}
                   className={`rounded-xl px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                     adminAccountMode === 'child_profile'
                       ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                       : 'text-text-light hover:bg-surface-gray dark:hover:bg-zinc-800'
                   } disabled:cursor-not-allowed disabled:opacity-60`}
                 >
                   Child Profile
                 </button>
               </div>

               <div className="mt-4 rounded-2xl border border-border-gray bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                 <p className="text-xs font-bold leading-relaxed text-text-light">
                   {adminAccountMode === 'child_profile'
                     ? babies.length > 0
                       ? `${babies.length} child profile${babies.length === 1 ? '' : 's'} available for full app testing.`
                       : 'Child profile mode is on. Add a child profile so this admin can test the family experience.'
                     : 'Admin mode is on. Use the dashboard to manage platform controls, payments, and safety checks.'}
                 </p>
                 <div className="mt-3 flex flex-wrap gap-2">
                   {adminAccountMode === 'admin' && isAdmin && onOpenAdminPanel && (
                     <button
                       type="button"
                       onClick={onOpenAdminPanel}
                       className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
                     >
                       <Shield size={13} />
                       Open Admin
                     </button>
                   )}
                   {adminAccountMode === 'child_profile' && (
                     <button
                       type="button"
                       onClick={openAddBaby}
                       className="inline-flex items-center gap-2 rounded-xl bg-surface-gray px-4 py-2 text-[9px] font-black uppercase tracking-widest text-secondary transition-all hover:bg-secondary hover:text-white dark:bg-zinc-800"
                     >
                       <Plus size={13} />
                       Add Child Profile
                     </button>
                   )}
                 </div>
               </div>
             </div>
           )}

           <div className={adminModeActive ? 'hidden' : 'space-y-4 sm:space-y-6'}>
              <div className="flex items-center gap-4 px-2">
                 <span className="text-[10px] font-black text-text-light uppercase tracking-widest">{i18nT('settings.family')}</span>
                 <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
                 <button
                   onClick={openAddBaby}
                   className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/10 text-secondary text-[9px] font-black uppercase tracking-widest border border-secondary/20 hover:bg-secondary hover:text-white transition-all"
                 >
                   <Plus size={13} />
                   Add Baby
                 </button>
              </div>
              <div className="space-y-4">
                 {babies.map(baby => (
                    <div key={baby.id} className="bg-surface p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex items-center justify-between gap-3">
                       <button onClick={() => openEditBaby(baby)} title={`Edit ${baby.name}`} className="flex items-center gap-3 sm:gap-5 text-left min-w-0 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface-gray dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-border-gray dark:border-zinc-700 shrink-0">
                             <img
                               src={baby.photoUrl || getDefaultAvatar(baby.gender, baby.name)}
                               alt={baby.name}
                               onError={(event) => {
                                 event.currentTarget.src = getDefaultAvatar(baby.gender, baby.name);
                               }}
                               className="w-full h-full object-cover"
                             />
                          </div>
                          <div className="min-w-0">
                             <p className="text-base sm:text-lg font-headline font-black text-foreground truncate">{baby.name}</p>
                             <p className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest mt-1 truncate">{getBabyAge(baby.dateOfBirth)}</p>
                          </div>
                       </button>
                       <div className="flex gap-1 sm:gap-2 shrink-0">
                          <button onClick={() => openEditBaby(baby)} title={`Edit ${baby.name}`} className="w-10 h-10 flex items-center justify-center text-text-light hover:text-secondary transition-all"><Edit2 size={16} /></button>
                          <button
                            onClick={() => openDeleteBabyConfirm(baby)}
                            disabled={deleting === baby.id}
                            title={`Delete ${baby.name}`}
                            className="w-10 h-10 flex items-center justify-center text-text-light hover:text-error transition-all disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deleting === baby.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className={adminModeActive ? 'hidden' : 'space-y-4 sm:space-y-6'}>
              <div className="flex items-center gap-4 px-2">
                 <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Care Team</span>
                 <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
              </div>
              <div className="bg-surface rounded-[3rem] shadow-sm border border-border-gray dark:border-zinc-800 overflow-hidden divide-y divide-border-gray dark:divide-zinc-800">
                 <button
                   onClick={() => openCareTeamModal('caregiver')}
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                         <Users size={22} className="sm:h-6 sm:w-6" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Add Caregiver</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Invite by name, email, or link</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>

                 <button
                   onClick={() => openCareTeamModal('doctor')}
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 rounded-2xl flex items-center justify-center shrink-0">
                         <Stethoscope size={22} className="sm:h-6 sm:w-6" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Add Doctor</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Assign baby profile to doctor</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>

                 <button
                   onClick={() =>
                     window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: 'patients' } }))
                   }
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-secondary/10 dark:bg-blue-900/20 text-secondary rounded-2xl flex items-center justify-center shrink-0">
                         <UserPlus2 size={22} className="sm:h-6 sm:w-6" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">My Care Team List</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Review accepted and pending assignments</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
              </div>
           </div>

           <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-4 px-2">
                 <span className="text-[10px] font-black text-text-light uppercase tracking-widest">{i18nT('settings.preferences')}</span>
                 <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
              </div>
              <div className="bg-surface rounded-[3rem] shadow-sm border border-border-gray dark:border-zinc-800 overflow-hidden divide-y divide-border-gray dark:divide-zinc-800">
                 <div className="p-4 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-accent-blue/10 dark:bg-blue-900/20 text-secondary rounded-2xl flex items-center justify-center shrink-0"><Ruler size={22} className="sm:h-6 sm:w-6" /></div>
                       <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">{i18nT('settings.units')}</p>
                    </div>
                    <div className="w-full sm:w-auto bg-surface-gray dark:bg-zinc-800/50 p-1 rounded-2xl flex gap-1">
                       {['metric', 'imperial'].map(u => (
                         <button key={u} onClick={() => handleUnitChange(u as any)} title={`Use ${u} units`} className={`flex-1 sm:flex-none min-w-0 px-2.5 sm:px-4 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-[0.14em] sm:tracking-widest transition-all ${settings?.units === u ? 'bg-secondary text-white shadow-lg' : 'text-text-light'}`}>{u}</button>
                       ))}
                    </div>
                 </div>
                 {currentCountryDefaults && !adminModeActive && (
                   <div className="px-4 pb-4 sm:px-8 sm:pb-8">
                     <div className="rounded-[1.6rem] border border-border-gray bg-surface-gray/55 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:rounded-[2rem] sm:p-5">
                       <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                         <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                             {i18nT('settings.careDefaultsTitle', 'Care Defaults')}
                           </p>
                           <p className="text-base font-headline font-black text-foreground">
                             {(currentBaby?.name || i18nT('settings.currentBabyLabel', 'Current baby'))} in{' '}
                             {currentCountryName || currentCountryDefaults.countryCode}
                           </p>
                           <p className="text-sm font-semibold text-text-dim">
                             {currentCountryDefaults.vaccinationScheduleName} · {currentCountryDefaults.vaccinationRegionName}
                           </p>
                           <p className="text-xs font-semibold leading-relaxed text-text-dim">
                             {currentCountryDefaults.careGuidanceSummary}
                           </p>
                         </div>
                         {settings?.units !== currentCountryDefaults.recommendedUnits && (
                           <button
                             onClick={() => handleUnitChange(currentCountryDefaults.recommendedUnits)}
                             className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-secondary shadow-sm transition-all hover:bg-secondary hover:text-white dark:bg-zinc-800 dark:hover:bg-blue-500"
                           >
                             {i18nT('settings.applyCountryUnits', 'Apply {units}').replace(
                               '{units}',
                               currentCountryDefaults.recommendedUnits,
                             )}
                           </button>
                         )}
                       </div>
                       <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.recommendedUnitsTitle', 'Recommended Units')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground">
                             {currentCountryDefaults.recommendedUnits}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {currentCountryDefaults.recommendedUnitsCompactLabel}
                           </p>
                         </div>
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.vaccineScheduleTitle', 'Vaccine Schedule')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground">
                             {currentCountryDefaults.vaccinationScheduleName}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {currentCountryDefaults.vaccinationRegionName}
                           </p>
                         </div>
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.temperatureTitle', 'Temperature')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground">
                             {currentCountryDefaults.temperatureLabel}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {i18nT('settings.temperatureHint', 'Use this scale for fever and medication guidance.')}
                           </p>
                         </div>
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.emergencyNumberTitle', 'Emergency Number')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground">
                             {currentCountryDefaults.emergencyNumber}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {i18nT('settings.emergencyNumberHint', 'Use your local emergency or pediatric triage line as needed.')}
                           </p>
                         </div>
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.newbornVisitsTitle', 'Early Visits')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground">
                             {currentCountryDefaults.newbornVisitCadence}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {i18nT('settings.newbornVisitsHint', 'Typical first checks after birth in this care model.')}
                           </p>
                         </div>
                         <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
                           <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                             {i18nT('settings.scheduleSourceTitle', 'Schedule Source')}
                           </p>
                           <p className="mt-1 text-sm font-black text-foreground capitalize">
                             {currentCountryDefaults.vaccinationScheduleSource}
                           </p>
                           <p className="text-xs font-semibold text-text-dim">
                             {i18nT('settings.scheduleSourceHint', 'Matched from {country}').replace(
                               '{country}',
                               currentCountryDefaults.countryCode,
                             )}
                           </p>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
                 {settings?.careProfilePreferences && !adminModeActive && (
                   <div className="px-4 pb-4 sm:px-8 sm:pb-8">
                     <div className="rounded-[1.6rem] border border-border-gray bg-surface-gray/55 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:rounded-[2rem] sm:p-5">
                       <div className="flex items-start justify-between gap-4">
                         <div className="space-y-2 min-w-0">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                             Care profile
                           </p>
                           <p className="text-base font-headline font-black text-foreground">
                             {accountProfileType === 'baby'
                               ? `${currentBaby?.name || 'Your baby'} starter plan`
                               : accountProfileType === 'doctor'
                                 ? 'Doctor care focus'
                                 : 'Caregiver care focus'}
                           </p>
                           <p className="text-sm font-semibold leading-relaxed text-text-dim">
                             {careProfileSummary}
                           </p>
                         </div>
                         <button
                           onClick={() => setShowCareProfileEditor(true)}
                           className="shrink-0 rounded-full border border-border-gray bg-white/85 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-secondary transition-all hover:border-secondary hover:text-secondary dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-blue-300"
                         >
                           Edit plan
                         </button>
                       </div>
                       {careProfileBadges.length > 0 && (
                         <div className="mt-4 flex flex-wrap gap-2">
                           {careProfileBadges.map((badge) => (
                             <span
                               key={badge}
                               className="rounded-full bg-white/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-text-dim dark:bg-zinc-950/60 dark:text-zinc-300"
                             >
                               {badge}
                             </span>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>
                 )}
                 <div className="p-4 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-accent-pink/10 dark:bg-rose-900/20 text-text-dim rounded-2xl flex items-center justify-center shrink-0"><Sun size={22} className="sm:h-6 sm:w-6" /></div>
                       <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">{i18nT('settings.theme')}</p>
                    </div>
                    <div className="w-full sm:w-auto bg-surface-gray dark:bg-zinc-800/50 p-1 rounded-2xl flex gap-1 justify-between sm:justify-start">
                       {[{v: 'light', i: Sun}, {v: 'dark', i: Moon}, {v: 'system', i: Monitor}].map(t => (
                         <button key={t.v} onClick={() => handleThemeChange(t.v as any)} title={`Switch to ${t.v} theme`} className={`flex-1 sm:flex-none p-2.5 rounded-xl transition-all ${settings?.theme === t.v ? 'bg-secondary text-white shadow-lg' : 'text-text-light'}`}><t.i size={16} /></button>
                       ))}
                    </div>
                 </div>
                 <div className="p-4 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0"><Bell size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">{i18nT('settings.notifications')}</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1">{settings?.notificationsEnabled ? 'Active' : 'Disabled'}</p>
                       </div>
                    </div>
                    <div className="w-full sm:w-auto flex justify-end">
                      <button 
                         onClick={handleNotificationToggle}
                         title="Toggle notifications"
                         className={`w-14 h-8 rounded-full transition-all relative ${settings?.notificationsEnabled ? 'bg-secondary' : 'bg-surface-gray dark:bg-zinc-800'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings?.notificationsEnabled ? 'right-1 shadow-md' : 'left-1'}`} />
                      </button>
                    </div>
                 </div>
                  {settings?.notificationsEnabled && (
                     <div className="p-4 sm:p-8 bg-surface-gray/30 dark:bg-zinc-900/10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-text-light">
                              {remotePushCopy.badge}
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-text-dim">
                              {remotePushCopy.detail}
                            </p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                              {remotePushStatus?.platform === 'ios'
                                ? 'iOS'
                                : remotePushStatus?.platform === 'android'
                                  ? 'Android'
                                  : 'Web browser'}
                            </p>
                          </div>
                          <button
                            onClick={handleRemotePushToggle}
                            disabled={
                              togglingRemotePush ||
                              (!remotePushStatus?.available && !remotePushStatus?.subscribed)
                            }
                            className={`shrink-0 rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                              remotePushStatus?.subscribed
                                ? 'border border-border-gray bg-white/85 text-text-dim hover:text-foreground dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-300'
                                : 'bg-secondary text-white shadow-lg hover:brightness-110'
                            } disabled:cursor-not-allowed disabled:opacity-55`}
                          >
                            {togglingRemotePush
                              ? 'Updating…'
                              : remotePushStatus?.subscribed
                                ? 'Disable Remote Push'
                                : 'Enable Remote Push'}
                          </button>
                        </div>
                     </div>
                  )}
                 {/* Partner Sync */}
                 <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { screen: 'partner-sync' } }))} className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0"><Users size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Partner Sync</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Manage Caregivers</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
                 {isAdmin && onOpenAdminPanel && (
                   <button
                     onClick={onOpenAdminPanel}
                     className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                   >
                      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                         <div className="w-12 h-12 sm:w-14 sm:h-14 bg-secondary/10 dark:bg-cyan-900/20 text-secondary rounded-2xl flex items-center justify-center shrink-0">
                           <Shield size={22} className="sm:h-6 sm:w-6" />
                         </div>
                         <div className="min-w-0">
                            <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Admin Panel</p>
                            <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Platform overview</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-text-light shrink-0" />
                   </button>
                 )}
                 
                 <button onClick={() => setShowLangSettings(true)} className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 dark:bg-zinc-800 text-foreground rounded-2xl flex items-center justify-center border border-border-gray dark:border-zinc-700 shrink-0"><Globe size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">{i18nT('settings.language')}</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">
                            {getLanguageDisplayName(currentLanguageCode)}
                          </p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
                 <button
                   onClick={() =>
                     window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: 'wearable' } }))
                   }
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0"><Activity size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Health Sync</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Manual imports / wearable exports</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
                 <button
                   onClick={() =>
                     window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: 'sync-center' } }))
                   }
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 dark:bg-slate-900/20 text-slate-500 rounded-2xl flex items-center justify-center shrink-0">
                         <RefreshCw size={22} className="sm:h-6 sm:w-6" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Sync Center</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Resolve cross-device conflicts</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
              </div>
           </div>

           <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-4 px-2">
                 <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Security & Privacy</span>
                 <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
              </div>
              <div className="bg-surface rounded-[3rem] shadow-sm border border-border-gray dark:border-zinc-800 overflow-hidden divide-y divide-border-gray dark:divide-zinc-800">
                 <div className="p-4 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0"><Lock size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Biometric Lock</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1">FaceID / TouchID</p>
                       </div>
                    </div>
                    <div className="w-full sm:w-auto flex justify-end">
                      <button 
                         onClick={handleBiometricToggle}
                         title="Toggle biometric lock"
                         className={`w-14 h-8 rounded-full transition-all relative ${settings?.biometricLockEnabled ? 'bg-secondary' : 'bg-surface-gray dark:bg-zinc-800'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings?.biometricLockEnabled ? 'right-1 shadow-md' : 'left-1'}`} />
                      </button>
                    </div>
                 </div>
                 <div className="p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 opacity-50">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0"><Shield size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">End-to-End Encryption</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1">Always Active</p>
                       </div>
                    </div>
                    <Check size={20} className="text-emerald-500 shrink-0" />
                 </div>
                 <button
                   onClick={() => {
                     window.history.pushState(null, '', '/policies');
                     window.dispatchEvent(new PopStateEvent('popstate'));
                   }}
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-surface-gray dark:bg-zinc-800 text-text-dim rounded-2xl flex items-center justify-center shrink-0">
                         <Scale size={22} className="sm:h-6 sm:w-6" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Legal Policies</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1">
                            Privacy, Terms & Disclaimers
                          </p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { screen: 'export' } }))} title="Export data" className="w-full bg-surface p-4 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between gap-3 sm:gap-5 group">
                 <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-surface-gray dark:bg-zinc-800 text-text-dim rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all shrink-0"><Download size={22} className="sm:h-6 sm:w-6" /></div>
                    <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">{i18nT('settings.export')}</p>
                 </div>
                 <ChevronRight size={18} className="text-text-light shrink-0" />
              </button>
              
              <button onClick={onLogout} title="Logout" className="w-full flex items-center justify-center gap-3 py-10 text-[11px] font-black text-error uppercase tracking-[0.4em] hover:opacity-70 transition-all">
                 <LogOut size={16} />
                 <span>{i18nT('settings.logout')}</span>
              </button>
           </div>
        </div>
      </main>

      <CareProfileEditorModal
        isOpen={showCareProfileEditor}
        role={accountProfileType}
        initialProfile={settings?.careProfilePreferences}
        babyName={currentBaby?.name}
        saving={savingCareProfile}
        onClose={() => setShowCareProfileEditor(false)}
        onSave={handleSaveCareProfile}
      />

      <AnimatePresence>
        {showCareTeamModal && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 80, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl bg-surface rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-2xl border border-border-gray dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-headline font-black text-foreground">
                    Invite {careRole === 'doctor' ? 'Doctor' : 'Caregiver'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light mt-1">
                    {currentBaby ? `For ${currentBaby.name}` : babies[0] ? `For ${babies[0].name}` : 'Add a baby first'}
                  </p>
                </div>
                <button onClick={() => setShowCareTeamModal(false)} className="text-text-light hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-gray dark:bg-zinc-900 p-1">
                {(['caregiver', 'doctor'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setCareRole(role)}
                    className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      careRole === role ? 'bg-secondary text-white shadow' : 'text-text-light hover:text-foreground'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light h-4 w-4 pointer-events-none" />
                  <input
                    value={careQuery}
                    onChange={(event) => setCareQuery(event.target.value)}
                    placeholder="Search by name"
                    className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                  />
                </div>

                {searchingCareCandidates && (
                  <p className="text-xs font-semibold text-text-light">Searching…</p>
                )}

                {!searchingCareCandidates && careCandidates.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 p-2 space-y-1">
                    {careCandidates.map((candidate) => (
                      <button
                        key={`${candidate.source}-${candidate.email}`}
                        onClick={() => {
                          setCareInviteName(candidate.name);
                          setCareInviteEmail(candidate.email);
                          if (candidate.roleHint === 'doctor' || candidate.roleHint === 'caregiver') {
                            setCareRole(candidate.roleHint);
                          }
                        }}
                        className="w-full rounded-lg px-2 py-2 text-left hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all"
                      >
                        <p className="text-xs font-black text-foreground">{candidate.name}</p>
                        <p className="text-[10px] font-semibold text-text-light">{candidate.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                <input
                  value={careInviteName}
                  onChange={(event) => setCareInviteName(event.target.value)}
                  placeholder="Name (optional)"
                  className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                />
                <input
                  type="email"
                  value={careInviteEmail}
                  onChange={(event) => setCareInviteEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSendCareInvite}
                    disabled={sendingCareInvite}
                    className="py-3 rounded-xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest shadow active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {sendingCareInvite ? 'Sending…' : 'Send Invite'}
                  </button>
                  <button
                    onClick={handleCreateCareInviteLink}
                    disabled={creatingCareLink}
                    className="py-3 rounded-xl bg-surface-gray dark:bg-zinc-800 text-foreground text-[10px] font-black uppercase tracking-widest border border-border-gray dark:border-zinc-700 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Link2 size={14} />
                    {creatingCareLink ? 'Creating…' : 'Create Link'}
                  </button>
                </div>

                {careInviteLink && (
                  <div className="flex items-center gap-2 rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 p-2">
                    <input
                      readOnly
                      value={careInviteLink}
                      className="flex-1 bg-transparent px-2 text-xs font-semibold text-foreground outline-none"
                    />
                    <button
                      onClick={handleCopyCareInviteLink}
                      className="w-9 h-9 rounded-lg bg-surface-gray dark:bg-zinc-800 border border-border-gray dark:border-zinc-700 flex items-center justify-center text-text-dim hover:text-foreground transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLangSettings && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
             <MotionDiv initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                className="w-full max-w-md bg-surface rounded-[3rem] p-8 space-y-6 shadow-2xl"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-headline font-black text-foreground">{i18nT('settings.language')}</h3>
                   <button onClick={() => setShowLangSettings(false)} title="Close language settings" className="text-text-light"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                   <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light h-4 w-4 pointer-events-none" />
                     <input
                       value={languageQuery}
                       onChange={(event) => setLanguageQuery(event.target.value)}
                       placeholder="Search language or locale code"
                       className="w-full rounded-2xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-800 py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                     />
                   </div>
                   {canUseCustomLanguage && (
                     <button
                       onClick={() => handleLanguageSelect(normalizedCustomLanguage)}
                       className="w-full p-4 rounded-2xl flex items-center justify-between bg-secondary/10 hover:bg-secondary/15 transition-all border border-secondary/20"
                     >
                        <div className="text-left">
                           <p className="text-sm font-bold text-foreground">Use locale code</p>
                           <p className="text-xs font-semibold text-text-light">{normalizedCustomLanguage}</p>
                        </div>
                        <ChevronRight size={16} className="text-secondary" />
                     </button>
                   )}
                   <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                     {languageOptions.map((language) => (
                       <button
                         key={language.code}
                         onClick={() => handleLanguageSelect(language.code)}
                         className="w-full p-4 rounded-2xl flex items-center justify-between bg-surface-gray dark:bg-zinc-800 hover:bg-border-gray transition-all"
                       >
                          <div className="flex items-center gap-3 min-w-0">
                             <div className="h-9 w-9 rounded-full bg-background dark:bg-zinc-900 border border-border-gray dark:border-zinc-700 flex items-center justify-center text-[10px] font-black text-text-light uppercase shrink-0">
                               {language.badge}
                             </div>
                             <div className="min-w-0 text-left">
                               <p className="text-sm font-bold text-foreground truncate">{language.name}</p>
                               <p className="text-xs font-semibold text-text-light truncate">{language.nativeName} · {language.code}</p>
                             </div>
                          </div>
                          {currentLanguageCode.toLowerCase() === language.code.toLowerCase() && <Check size={16} className="text-secondary shrink-0" />}
                       </button>
                     ))}
                   </div>
                </div>
             </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditBaby && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
          >
             <MotionDiv initial={{ y: 100 }} animate={{ y: 0 }}
                className="w-full max-w-md bg-surface rounded-[3rem] p-8 space-y-6 shadow-2xl"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-headline font-black text-foreground">
                     {editBabyId ? i18nT('settings.editBaby') : 'Add Baby'}
                   </h3>
                   <button onClick={() => setShowEditBaby(false)} title="Close edit baby" className="text-text-light"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                   <input 
                     id="baby-name-input"
                     type="text"
                     title="Baby's name"
                     value={editBabyName} 
                     onChange={e => setEditBabyName(e.target.value)} 
                     placeholder="Name" 
                     className="input-onboarding outline-none" 
                   />
                   <input 
                     id="baby-dob-input"
                     type="date" 
                     title="Baby's date of birth"
                     value={editBabyDob} 
                     onChange={e => setEditBabyDob(e.target.value)} 
                     className="input-onboarding outline-none" 
                   />
                   <select
                     id="baby-gender-input"
                     title="Baby's gender"
                     value={editBabyGender || 'other'}
                     onChange={e => setEditBabyGender(e.target.value as 'boy' | 'girl' | 'other')}
                     className="input-onboarding outline-none"
                   >
                     <option value="boy">Boy</option>
                     <option value="girl">Girl</option>
                     <option value="other">Other</option>
                   </select>
                   <select
                     id="baby-country-input"
                     title="Baby's country"
                     value={editBabyCountry}
                     onChange={e => setEditBabyCountry(e.target.value)}
                     className="input-onboarding outline-none"
                   >
                     {countryOptions.map((country) => (
                       <option key={country.code} value={country.code}>
                         {country.name} ({country.code})
                       </option>
                     ))}
                   </select>
                </div>
                <button onClick={handleSaveBaby} className="btn-primary">
                  <Check size={24} />
                  <span>{editBabyId ? i18nT('common.update') : 'Add Baby'}</span>
                </button>
                {editBabyId && (
                  <button
                    type="button"
                    onClick={() => openDeleteBabyConfirm({ id: editBabyId, name: editBabyName })}
                    disabled={deleting === editBabyId}
                    className="w-full rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-error transition-all hover:bg-error hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting === editBabyId ? 'Deleting...' : 'Delete Baby'}
                  </button>
                )}
             </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && deleteTarget && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
             <MotionDiv
                initial={{ y: 100, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="w-full max-w-md bg-surface rounded-[3rem] p-8 space-y-6 shadow-2xl border border-border-gray dark:border-zinc-800"
             >
                <div className="flex items-start justify-between gap-4">
                   <div className="space-y-2">
                     <div className="h-12 w-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                       <Trash2 size={22} />
                     </div>
                     <h3 className="text-2xl font-headline font-black text-foreground">Delete {deleteTarget.name}?</h3>
                     <p className="text-sm font-semibold leading-relaxed text-text-dim">
                       This removes the baby profile and the care logs saved for this baby. This cannot be undone.
                     </p>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       if (deleting) return;
                       setShowDeleteConfirm(false);
                       setDeleteTarget(null);
                     }}
                     title="Cancel delete baby"
                     className="text-text-light hover:text-foreground transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteTarget(null);
                    }}
                    disabled={Boolean(deleting)}
                    className="rounded-2xl bg-surface-gray px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800"
                  >
                    Keep Baby
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBaby}
                    disabled={Boolean(deleting)}
                    className="rounded-2xl bg-error px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting === deleteTarget.id ? 'Deleting...' : 'Delete Baby'}
                  </button>
                </div>
             </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
