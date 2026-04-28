import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Users,
  UserPlus,
  Shield,
  Copy,
  Check,
  Info,
  Heart,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserAvatar } from '../../lib/baby-utils';
import {
  acceptFamilySharingInvite,
  createPublicFamilyInviteLink,
  getFamilyMembers,
  type FamilySharingInvite,
} from '../../lib/family-sharing-service';

interface PartnerSyncScreenProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

export const PartnerSyncScreen: React.FC<PartnerSyncScreenProps> = ({ onBack }) => {
  const { currentBaby, user } = useAppContext();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<FamilySharingInvite[]>([]);

  const acceptedMembers = useMemo(
    () => members.filter((member) => Boolean(member.accepted_at)),
    [members],
  );

  const loadMembers = async () => {
    if (!currentBaby?.id) return;
    const familyMembers = await getFamilyMembers(currentBaby.id);
    setMembers(familyMembers);
  };

  const createInvite = async () => {
    if (!currentBaby?.id || !user?.id) return;
    setInviteLoading(true);
    setError('');

    const inviteBundle = await createPublicFamilyInviteLink(currentBaby.id, 'caregiver', user.id, {
      babyNameSnapshot: currentBaby.name,
      babyPhotoUrlSnapshot: currentBaby.photoUrl,
      view: 'patients',
    });

    if (!inviteBundle) {
      setError('Could not create invite link. Please try again.');
      setInviteLoading(false);
      return;
    }

    setInviteCode(inviteBundle.invite.invite_token);
    setInviteLink(inviteBundle.inviteLink);
    setInviteLoading(false);
  };

  useEffect(() => {
    if (!currentBaby?.id || !user?.id) {
      return;
    }

    void createInvite();
    void loadMembers();
  }, [currentBaby?.id, user?.id]);

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = async () => {
    if (!partnerCode || !user?.id) return;
    setLoading(true);
    setError('');

    const accepted = await acceptFamilySharingInvite(partnerCode.trim(), user.id);
    setLoading(false);

    if (!accepted) {
      setError('Invalid or expired code. Please check and try again.');
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setPartnerCode('');
    await loadMembers();
  };

  const renderInviteCode = inviteCode
    ? inviteCode.slice(-6).toUpperCase()
    : inviteLoading
    ? '......'
    : '------';

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Partner Sync</span>
        </div>
      </header>

      <main className="flex-1 pt-24 px-6 pb-20 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full space-y-10">
          <div className="text-center space-y-4 pt-4">
            <div className="w-24 h-24 bg-secondary/10 text-secondary rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-glow transition-transform hover:scale-110">
              <Users size={48} />
            </div>
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tight">Better Together</h2>
            <p className="text-text-dim text-sm max-w-[280px] mx-auto leading-relaxed">
              Connect with your partner or caregiver to track {currentBaby?.name || 'baby'}&apos;s journey in real-time.
            </p>
          </div>

          <div className="space-y-6">
            <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Your Invite Code</span>
            <div className="bg-surface p-8 rounded-[3rem] border-2 border-dashed border-border-gray dark:border-zinc-800 text-center space-y-6">
              <span className="text-5xl font-headline font-black text-foreground tracking-[0.2em]">{renderInviteCode}</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  disabled={!inviteCode}
                  className="w-full py-4 bg-surface-gray dark:bg-zinc-800 text-text-dim rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40"
                >
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  <span className="text-xs font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={!inviteLink}
                  className="w-full py-4 bg-surface-gray dark:bg-zinc-800 text-text-dim rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40"
                >
                  {copiedLink ? <Check size={18} className="text-emerald-500" /> : <LinkIcon size={18} />}
                  <span className="text-xs font-black uppercase tracking-widest">{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <button
                onClick={() => void createInvite()}
                disabled={inviteLoading}
                className="w-full py-3 rounded-2xl border border-border-gray dark:border-zinc-800 text-text-dim text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <RefreshCw size={14} className={inviteLoading ? 'animate-spin' : ''} />
                <span>{inviteLoading ? 'Creating…' : 'Refresh Invite'}</span>
              </button>
              <p className="text-[10px] text-text-light font-bold">Share this code or link with your care team.</p>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Join a Sanctuary</span>
            <div className="space-y-4">
              <div className="relative">
                <input
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  placeholder="PASTE INVITE CODE"
                  className="w-full bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 text-center text-xl font-headline font-black text-foreground placeholder:text-text-light placeholder:text-sm uppercase tracking-widest outline-none focus:border-secondary transition-all"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={!partnerCode || loading}
                className={`w-full py-6 rounded-[2.5rem] font-headline font-black text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${partnerCode && !loading ? 'bg-secondary' : 'bg-surface-gray dark:bg-zinc-800 text-text-light opacity-50'}`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={24} />
                    <span>Connect Sanctuary</span>
                  </>
                )}
              </button>
              {error && <p className="text-xs text-rose-500 text-center font-semibold">{error}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Sanctuary Members</span>
              <div className="flex items-center gap-1 text-emerald-500">
                <Shield size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-surface p-5 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-gray dark:bg-zinc-800 overflow-hidden border border-border-gray dark:border-zinc-700">
                    <img src={getUserAvatar(user?.email || user?.user_metadata?.name || 'user')} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-headline font-black text-foreground">{user?.user_metadata?.name || 'You'}</p>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Administrator</p>
                  </div>
                </div>
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-full flex items-center justify-center">
                  <Check size={16} />
                </div>
              </div>

              {acceptedMembers.length > 0 ? (
                acceptedMembers.map((member) => (
                  <div key={member.id} className="bg-surface p-5 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-headline font-black text-foreground">{member.invited_name || member.invited_email}</p>
                      <p className="text-[9px] font-black text-text-light uppercase tracking-widest">{member.role}</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-full flex items-center justify-center">
                      <Check size={16} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-surface-gray/50 dark:bg-zinc-900/10 p-6 rounded-[2.5rem] border border-dashed border-border-gray dark:border-zinc-800 flex items-center justify-center gap-4 text-text-light italic text-sm">
                  <Heart size={16} />
                  <span>Waiting for first connection...</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[3rem] border border-amber-200 dark:border-amber-900/30">
            <div className="flex items-start gap-5">
              <Info size={24} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase tracking-widest">
                Partners and caregivers will have full editing access to logs, measurements, and milestones. You can revoke access at any time from this dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {success && (
          <MotionDiv
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-8"
          >
            <div className="text-center space-y-8">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <Check size={48} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-headline font-black text-foreground">Sanctuary Sync Complete</h3>
                <p className="text-text-dim max-w-xs mx-auto">Your caregiver has been verified and shared access is now active.</p>
              </div>
              <button onClick={() => setSuccess(false)} className="btn-primary">
                <span>Continue</span>
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
