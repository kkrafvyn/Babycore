import React, { useState } from 'react';
import { ChevronLeft, Bell, Plus, Trash2, Edit2, LogOut, Ruler, Download, ChevronRight, Moon, Sun, Monitor, Clock, X, Check, Globe, Users, Activity, Lock, Shield, Scale, Stethoscope, Search, Link2, Copy, UserPlus2, RefreshCw } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { addBaby, deleteBaby, updateBaby } from '../../lib/supabase-storage';
import { getDefaultAvatar, getBabyAge, getUserAvatar } from '../../lib/baby-utils';
import { i18nT, i18nInstance, SupportedLanguage } from '../../lib/i18n';
import { NotificationsManager } from '../../lib/notifications';
import { toast } from 'sonner';
import { COUNTRIES } from '../../lib/countries';
import {
  createPublicFamilyInviteLink,
  searchCareTeamCandidates,
  sendFamilySharingInvite,
  type CareTeamSearchCandidate,
  type FamilySharingRole,
} from '../../lib/family-sharing-service';

const MotionDiv = motion.div as any;

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  showBackButton?: boolean;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

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
  const { babies, currentBaby, settings, updateSettings, user, refreshBabies } = useAppContext();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showEditBaby, setShowEditBaby] = useState(false);
  const [editBabyName, setEditBabyName] = useState('');
  const [editBabyDob, setEditBabyDob] = useState('');
  const [editBabyGender, setEditBabyGender] = useState<'boy' | 'girl' | 'other' | undefined>();
  const [editBabyCountry, setEditBabyCountry] = useState('');
  const [editBabyId, setEditBabyId] = useState('');
  const [showLangSettings, setShowLangSettings] = useState(false);
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

  const handleUnitChange = async (unit: 'metric' | 'imperial') => {
    await updateSettings({ units: unit });
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateSettings({ theme });
  };

  const handleLanguageSelect = async (code: string) => {
    i18nInstance.setLanguage(code as SupportedLanguage);
    await updateSettings({ language: code });
    setShowLangSettings(false);
    window.location.reload();
  };

  const handleDeleteBaby = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteBaby(deleteTarget.id);
      await refreshBabies();
    } catch (err) {
      console.error('Failed to delete baby', err);
    }
    setDeleting(null);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const handleNotificationToggle = async () => {
    const isEnabled = !settings?.notificationsEnabled;
    if (isEnabled) {
      const granted = await NotificationsManager.requestPermission();
      if (!granted) return;
    } else {
      await NotificationsManager.unsubscribeFromPush();
    }
    await updateSettings({ notificationsEnabled: isEnabled });
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

  const handlePushSubscribe = async () => {
    const subscription = await NotificationsManager.subscribeToPush();
    if (subscription) {
      toast.success(i18nT('settings.pushEnabled'));
    } else {
      toast.error(i18nT('settings.pushDisabled'));
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
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('screens.settings')}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 sm:pt-24 px-3 sm:px-6 pb-20">
        <div className="max-w-md mx-auto w-full space-y-8 sm:space-y-10">
           
           <div className="card-onboarding text-center p-6 sm:p-12 bg-surface">
              <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-surface-gray dark:bg-zinc-800 flex items-center justify-center overflow-hidden mb-5 sm:mb-8 border-4 border-white dark:border-zinc-900 shadow-2xl">
                 <img src={getUserAvatar(user?.email || user?.user_metadata?.name || 'parent')} alt="User" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-headline font-black text-foreground tracking-tighter mb-2">{user?.user_metadata?.name || 'Parent'}</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 break-all">{user?.email}</p>
           </div>

           <div className="space-y-4 sm:space-y-6">
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
                          <button onClick={() => { setDeleteTarget({ id: baby.id, name: baby.name }); setShowDeleteConfirm(true); }} title={`Delete ${baby.name}`} className="w-10 h-10 flex items-center justify-center text-text-light hover:text-error transition-all"><Trash2 size={16} /></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="space-y-4 sm:space-y-6">
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
                       <button 
                         onClick={handlePushSubscribe}
                         title="Subscribe to push notifications"
                         className="w-full py-3.5 sm:py-4 bg-secondary text-white rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                       >
                         {i18nT('settings.subscribe')}
                       </button>
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
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">{LANGUAGES.find(l => l.code === i18nInstance.getLanguage())?.name}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-text-light shrink-0" />
                 </button>
                 <button
                   onClick={() =>
                     toast.message(
                       'Health Sync uses your connected wearable integrations. Open "Wearables" from dashboard tools to connect Apple Health / Fitbit.',
                     )
                   }
                   className="w-full p-4 sm:p-8 flex items-center justify-between gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all text-left"
                 >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0"><Activity size={22} className="sm:h-6 sm:w-6" /></div>
                       <div className="min-w-0">
                          <p className="text-base sm:text-lg font-headline font-black text-foreground leading-tight">Health Sync</p>
                          <p className="text-[8px] sm:text-[9px] font-black text-text-light uppercase tracking-widest mt-1 leading-tight">Apple Health / Google Fit</p>
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
                className="w-full max-w-xs bg-surface rounded-[3rem] p-8 space-y-6 shadow-2xl"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-headline font-black text-foreground">{i18nT('settings.language')}</h3>
                   <button onClick={() => setShowLangSettings(false)} title="Close language settings" className="text-text-light"><X size={20} /></button>
                </div>
                <div className="space-y-2">
                   {LANGUAGES.map(l => (
                     <button key={l.code} onClick={() => handleLanguageSelect(l.code)} className="w-full p-4 rounded-2xl flex items-center justify-between bg-surface-gray dark:bg-zinc-800 hover:bg-border-gray transition-all">
                        <div className="flex items-center gap-3">
                           <span className="text-xl">{l.flag}</span>
                           <span className="text-sm font-bold text-foreground">{l.name}</span>
                        </div>
                        {i18nInstance.getLanguage() === l.code && <Check size={16} className="text-secondary" />}
                     </button>
                   ))}
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
             </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
