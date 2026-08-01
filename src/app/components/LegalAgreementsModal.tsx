import React from 'react';
import { Scale, ShieldCheck } from 'lucide-react';
import { i18nT } from '../../lib/i18n';
import { getClientAppName } from '../../lib/app-branding-client';

type LegalAgreementsModalProps = {
  onAccept: () => void;
  onViewPolicies: () => void;
};

export const LegalAgreementsModal: React.FC<LegalAgreementsModalProps> = ({
  onAccept,
  onViewPolicies,
}) => {
  const appName = getClientAppName();
  const [accepted, setAccepted] = React.useState(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-agreements-title"
    >
      <div className="native-page-scroll max-h-[min(92dvh,42rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-border-gray bg-surface p-6 shadow-2xl dark:border-zinc-800 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-light">
              {i18nT('legal.agreementsEyebrow', 'Before you continue')}
            </p>
            <h2 id="legal-agreements-title" className="mt-1 font-headline text-2xl font-black tracking-tight text-foreground">
              {i18nT('legal.agreementsTitle', 'Review and accept our policies')}
            </h2>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-text-dim">
          {i18nT(
            'legal.agreementsBody',
            '{appName} helps families track baby care. To create an account or use the app, please confirm that you agree to our Privacy Policy and Terms of Service.',
          ).replace('{appName}', appName)}
        </p>

        <div className="mt-5 space-y-3 rounded-[1.5rem] border border-border-gray bg-surface-gray p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <button
            type="button"
            onClick={onViewPolicies}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface dark:hover:bg-zinc-900"
          >
            <Scale size={18} className="shrink-0 text-secondary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              {i18nT('legal.viewPrivacyPolicy', 'Privacy Policy')}
            </span>
          </button>
          <button
            type="button"
            onClick={onViewPolicies}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface dark:hover:bg-zinc-900"
          >
            <Scale size={18} className="shrink-0 text-secondary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              {i18nT('legal.viewTermsOfService', 'Terms of Service')}
            </span>
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[1.25rem] border border-border-gray px-4 py-3 dark:border-zinc-800">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border-gray text-secondary focus:ring-secondary"
          />
          <span className="text-sm leading-6 text-foreground">
            {i18nT(
              'legal.agreementsCheckbox',
              'I agree to the Privacy Policy and Terms of Service.',
            )}
          </span>
        </label>

        <button
          type="button"
          disabled={!accepted}
          onClick={onAccept}
          className="mt-5 flex w-full items-center justify-center rounded-full bg-secondary px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {i18nT('legal.agreementsAccept', 'Accept and continue')}
        </button>
      </div>
    </div>
  );
};

export default LegalAgreementsModal;
