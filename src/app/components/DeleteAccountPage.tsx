import React from 'react';
import { ChevronLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { APP_SUPPORT_EMAIL } from '../../lib/app-domain';
import { clientAppPath } from '../../lib/app-branding-client';

interface DeleteAccountPageProps {
  onBack: () => void;
}

const LAST_UPDATED = 'July 27, 2026';

const DELETED_DATA = [
  'Your Cradlyn account profile (name and email)',
  'Baby profiles and care logs (feeding, sleep, diaper, growth, health notes)',
  'Photos and journal entries linked to your account',
  'Reminders, settings, and caregiver invitations you created',
  'Optional Health Connect imports stored in Cradlyn',
];

const RETAINED_DATA = [
  'Encrypted backups may remain for up to 90 days, then are permanently removed',
  'Billing or subscription records required by law or payment processors',
  'Anonymized operational logs with no personal identifiers',
];

export const DeleteAccountPage: React.FC<DeleteAccountPageProps> = ({ onBack }) => {
  const supportEmail = APP_SUPPORT_EMAIL;
  const privacyUrl = clientAppPath('/policies#privacy-policy');
  const mailtoDelete = `mailto:${supportEmail}?subject=${encodeURIComponent('Delete my Cradlyn account')}&body=${encodeURIComponent(
    'Please delete my Cradlyn account and all associated data.\n\nAccount email:\n\nReason (optional):\n',
  )}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 h-20 border-b border-border-gray bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-gray text-text-dim transition-all hover:text-foreground"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                Cradlyn Account
              </p>
              <h1 className="text-xl font-headline font-black tracking-tight text-foreground">
                Delete Account & Data
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-border-gray bg-surface px-4 py-2 sm:flex">
            <ShieldCheck size={16} className="text-secondary" />
            <span className="text-xs font-black uppercase tracking-widest text-text-dim">
              Updated {LAST_UPDATED}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-14 pt-8 sm:px-8">
        <section className="rounded-[2rem] border border-border-gray bg-surface p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Trash2 size={20} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-black tracking-tight text-foreground">
                Request account deletion
              </h2>
              <p className="text-sm font-bold leading-relaxed text-text-dim">
                Cradlyn lets you delete baby data in the app or request full account deletion by email.
                Deletion is permanent and cannot be undone after processing completes.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.8rem] border border-border-gray bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-headline font-black text-foreground">Delete your entire Cradlyn account</h3>
          <ol className="mt-4 space-y-3 text-sm font-semibold text-foreground/90">
            <li className="flex gap-3">
              <span className="font-black text-secondary">1.</span>
              <span>
                Email{' '}
                <a href={`mailto:${supportEmail}`} className="font-black text-secondary underline">
                  {supportEmail}
                </a>{' '}
                from the email address linked to your Cradlyn account.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-secondary">2.</span>
              <span>Use the subject line: &quot;Delete my Cradlyn account&quot;.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-secondary">3.</span>
              <span>We will confirm your request and delete active account data within 30 days.</span>
            </li>
          </ol>
          <a
            href={mailtoDelete}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            <Mail size={16} />
            Email {supportEmail}
          </a>
        </section>

        <section className="mt-4 rounded-[1.8rem] border border-border-gray bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-headline font-black text-foreground">
            Delete baby data without deleting your account
          </h3>
          <ol className="mt-4 space-y-3 text-sm font-semibold text-foreground/90">
            <li className="flex gap-3">
              <span className="font-black text-secondary">1.</span>
              <span>Open Cradlyn and sign in.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-secondary">2.</span>
              <span>Go to Settings.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-secondary">3.</span>
              <span>Select the baby profile you want to remove.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-secondary">4.</span>
              <span>Tap Delete baby and confirm.</span>
            </li>
          </ol>
        </section>

        <section className="mt-4 rounded-[1.8rem] border border-border-gray bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-headline font-black text-foreground">What we delete</h3>
          <ul className="mt-4 space-y-2">
            {DELETED_DATA.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-foreground/90">
                <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-secondary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-[1.8rem] border border-border-gray bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-headline font-black text-foreground">What may be kept temporarily</h3>
          <ul className="mt-4 space-y-2">
            {RETAINED_DATA.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-foreground/90">
                <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-text-light" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-center text-xs font-bold text-text-dim">
          See our{' '}
          <a href={privacyUrl} className="font-black text-secondary underline">
            Privacy Policy
          </a>{' '}
          for full details on data retention and your rights.
        </p>
      </main>
    </div>
  );
};

export default DeleteAccountPage;
