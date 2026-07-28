import React from 'react';
import { Info } from 'lucide-react';
import { i18nT } from '../../lib/i18n';
import { MEDICAL_DISCLAIMER_FULL, MEDICAL_DISCLAIMER_SHORT } from '../../lib/medical-disclaimer';

type MedicalDisclaimerBannerProps = {
  variant?: 'compact' | 'full';
  className?: string;
};

export const MedicalDisclaimerBanner: React.FC<MedicalDisclaimerBannerProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const text =
    variant === 'full'
      ? i18nT('legal.medicalDisclaimerFull', MEDICAL_DISCLAIMER_FULL)
      : i18nT('legal.medicalDisclaimerShort', MEDICAL_DISCLAIMER_SHORT);

  return (
    <div
      className={`flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100 ${className}`}
      role="note"
      aria-label={i18nT('legal.medicalDisclaimerLabel', 'Medical disclaimer')}
    >
      <Info size={16} className="mt-0.5 shrink-0 opacity-80" aria-hidden="true" />
      <p className="text-[11px] font-medium leading-relaxed sm:text-xs">{text}</p>
    </div>
  );
};

export default MedicalDisclaimerBanner;
